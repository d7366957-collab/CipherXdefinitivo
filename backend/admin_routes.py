from decimal import Decimal, InvalidOperation
import logging
import os
from pathlib import Path
import sys
from typing import Optional

from aiogram import Bot
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

for env_file in (BACKEND_DIR / ".env", REPO_ROOT / ".env"):
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=False)
load_dotenv(override=False)

from database import get_db  # noqa: E402

logger = logging.getLogger("cipherx.admin")


def _get_bot_token() -> Optional[str]:
    token = (os.getenv("BOT_TOKEN") or "").strip()
    return token or None


def _get_admin_password() -> str:
    pwd = (os.getenv("ADMIN_PASSWORD") or "cipherx2024").strip()
    return pwd or "cipherx2024"


def _get_models():
    main_mod = sys.modules.get("backend.main") or sys.modules.get("main")
    if main_mod is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Módulo principal no inicializado",
        )
    return main_mod.User, main_mod.Transaction


BOT_TOKEN = _get_bot_token()
bot: Optional[Bot] = Bot(token=BOT_TOKEN) if BOT_TOKEN else None

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class LoginRequest(BaseModel):
    password: str


class BalanceRequest(BaseModel):
    campo: str
    accion: str
    monto: float = Field(..., gt=0)


class SorteoRequest(BaseModel):
    monto: float = Field(..., gt=0)


class BroadcastRequest(BaseModel):
    mensaje: str = Field(..., min_length=1)


class BanRequest(BaseModel):
    banear: bool


def _parse_int_id(raw_value: str, label: str = "ID") -> int:
    try:
        parsed = int(str(raw_value).strip())
        if parsed <= 0:
            raise ValueError("non-positive")
        return parsed
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} inválido",
        ) from exc


def _to_decimal(val: float, label: str = "monto") -> Decimal:
    try:
        dec = Decimal(str(val))
        if not dec.is_finite() or dec <= Decimal("0"):
            raise InvalidOperation("invalid amount")
        return dec
    except InvalidOperation as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} inválido",
        ) from exc


def verify_admin_token(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
        )
    token = authorization.split(" ", 1)[1].strip()
    admin_pwd = _get_admin_password()
    if not token or token != admin_pwd:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token inválido",
        )
    return token


@router.post("/login")
def admin_login(data: LoginRequest):
    admin_pwd = _get_admin_password()
    if (data.password or "").strip() == admin_pwd:
        return {"token": admin_pwd}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Contraseña incorrecta",
    )


@router.get("/users")
def get_users(
    telegram_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(verify_admin_token),
):
    User, _ = _get_models()

    query = db.query(User)
    if telegram_id and str(telegram_id).strip():
        tg_int = _parse_int_id(telegram_id, "telegram_id")
        query = query.filter(User.telegram_id == tg_int)

    users = query.order_by(User.id.desc()).all()
    return [
        {
            "id": u.telegram_id,
            "telegram_id": u.telegram_id,
            "nombre": u.nombre,
            "username": u.username,
            "congelado": float(u.saldo_congelado or 0),
            "retirable": float(u.saldo_retirable or 0),
            "total": float(
                Decimal(str(u.saldo_congelado or 0)) + Decimal(str(u.saldo_retirable or 0))
            ),
            "banned": bool(getattr(u, "is_banned", False)),
        }
        for u in users
    ]


@router.post("/users/{tg_id}/balance")
def edit_balance(
    tg_id: str,
    data: BalanceRequest,
    db: Session = Depends(get_db),
    _=Depends(verify_admin_token),
):
    User, _ = _get_models()

    tg_int = _parse_int_id(tg_id, "telegram_id")
    user = db.query(User).filter(User.telegram_id == tg_int).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    monto_abs = _to_decimal(data.monto, "monto")
    accion = (data.accion or "").strip().lower()
    if accion not in ("sumar", "restar"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción inválida (use 'sumar' o 'restar')",
        )

    delta = monto_abs if accion == "sumar" else -monto_abs
    campo = (data.campo or "").strip().lower()

    if campo == "congelado":
        nuevo = Decimal(str(user.saldo_congelado or 0)) + delta
        if nuevo < Decimal("0"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El saldo congelado no puede quedar negativo",
            )
        user.saldo_congelado = nuevo
    elif campo == "retirable":
        nuevo = Decimal(str(user.saldo_retirable or 0)) + delta
        if nuevo < Decimal("0"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El saldo retirable no puede quedar negativo",
            )
        user.saldo_retirable = nuevo
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campo inválido (use 'congelado' o 'retirable')",
        )

    db.commit()
    db.refresh(user)
    return {
        "status": "ok",
        "telegram_id": user.telegram_id,
        "congelado": float(user.saldo_congelado or 0),
        "retirable": float(user.saldo_retirable or 0),
    }


@router.post("/users/{tg_id}/ban")
def ban_user(
    tg_id: str,
    data: BanRequest,
    db: Session = Depends(get_db),
    _=Depends(verify_admin_token),
):
    User, _ = _get_models()

    tg_int = _parse_int_id(tg_id, "telegram_id")
    user = db.query(User).filter(User.telegram_id == tg_int).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    user.is_banned = bool(data.banear)
    db.commit()
    db.refresh(user)
    return {"status": "ok", "telegram_id": user.telegram_id, "is_banned": user.is_banned}


@router.get("/withdrawals")
def get_withdrawals(
    db: Session = Depends(get_db),
    _=Depends(verify_admin_token),
):
    User, Transaction = _get_models()

    rows = (
        db.query(Transaction, User)
        .outerjoin(User, User.id == Transaction.user_id)
        .filter(
            Transaction.tipo == "retiro",
            Transaction.estado.in_(["procesando", "pendiente"]),
        )
        .order_by(Transaction.id.desc())
        .all()
    )
    return [
        {
            "id": tx.id,
            "user_id": tx.user_id,
            "telegram_id": user.telegram_id if user else None,
            "nombre": user.nombre if user else None,
            "monto": float(tx.monto or 0),
            "red": tx.red,
            "estado": tx.estado,
            "fecha": str(tx.fecha),
        }
        for tx, user in rows
    ]


@router.post("/withdrawals/{tx_id}/approve")
def approve_withdrawal(
    tx_id: int,
    db: Session = Depends(get_db),
    _=Depends(verify_admin_token),
):
    _, Transaction = _get_models()

    tx = (
        db.query(Transaction)
        .filter(Transaction.id == tx_id, Transaction.tipo == "retiro")
        .first()
    )
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retiro no encontrado")
    if tx.estado not in ("procesando", "pendiente"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El retiro ya está en estado '{tx.estado}'",
        )

    tx.estado = "confirmado"
    db.commit()
    db.refresh(tx)
    return {"status": "ok", "id": tx.id, "estado": tx.estado}


@router.post("/withdrawals/{tx_id}/reject")
def reject_withdrawal(
    tx_id: int,
    db: Session = Depends(get_db),
    _=Depends(verify_admin_token),
):
    User, Transaction = _get_models()

    tx = (
        db.query(Transaction)
        .filter(Transaction.id == tx_id, Transaction.tipo == "retiro")
        .first()
    )
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retiro no encontrado")
    if tx.estado not in ("procesando", "pendiente"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El retiro ya está en estado '{tx.estado}'",
        )

    user = db.query(User).filter(User.id == tx.user_id).first()
    if user:
        reembolso = Decimal(str(tx.monto or 0)) + Decimal("0.150000")
        user.saldo_retirable = Decimal(str(user.saldo_retirable or 0)) + reembolso

    tx.estado = "rechazado"
    db.commit()
    db.refresh(tx)
    return {"status": "ok", "id": tx.id, "estado": tx.estado}


@router.post("/sorteo-masivo")
def sorteo_masivo(
    data: SorteoRequest,
    db: Session = Depends(get_db),
    _=Depends(verify_admin_token),
):
    User, Transaction = _get_models()

    monto_decimal = _to_decimal(data.monto, "monto")
    users = db.query(User).all()

    for u in users:
        u.saldo_retirable = Decimal(str(u.saldo_retirable or 0)) + monto_decimal
        db.add(
            Transaction(
                user_id=u.id,
                tipo="bono",
                monto=monto_decimal,
                estado="completado",
                red="None",
            )
        )

    db.commit()
    return {"status": "ok", "beneficiados": len(users), "monto": float(monto_decimal)}


@router.post("/broadcast")
async def broadcast_message(
    data: BroadcastRequest,
    db: Session = Depends(get_db),
    _=Depends(verify_admin_token),
):
    User, _ = _get_models()

    active_bot = bot
    current_token = _get_bot_token()
    if not active_bot and current_token:
        active_bot = Bot(token=current_token)

    if not active_bot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="BOT_TOKEN no configurado en el entorno",
        )

    users = db.query(User).all()
    enviados = 0
    errores = 0

    for u in users:
        if not u.telegram_id:
            continue
        try:
            texto = data.mensaje.replace("{name}", u.nombre or "Trader")
            await active_bot.send_message(chat_id=u.telegram_id, text=texto, parse_mode="HTML")
            enviados += 1
        except Exception as exc:
            errores += 1
            logger.warning("Error enviando broadcast a %s: %s", u.telegram_id, exc)

    if active_bot is not bot:
        await active_bot.session.close()

    return {"status": "ok", "enviados": enviados, "errores": errores}
