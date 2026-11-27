from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging
import os
from pathlib import Path
import random
import sys
from typing import List, Literal, Optional
from urllib.parse import parse_qsl
import httpx

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Session, relationship

# Asegurar que el directorio de backend esté en sys.path sin importar desde dónde se lance Uvicorn
BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Cargar .env desde backend/.env y desde la raíz del repo si existe
for env_file in (BACKEND_DIR / ".env", REPO_ROOT / ".env"):
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=False)
load_dotenv(override=False)

from auth import (  # noqa: E402
    TelegramAuthUser,
    _get_bot_token,
    validate_telegram_init_data,
    verify_telegram_webapp,
)
from database import Base, engine, get_db  # noqa: E402

logger = logging.getLogger("cipherx.api")

# ==========================================================================
# NOTIFICACIONES DEL BOT (Asíncronas con httpx)
# ==========================================================================
async def enviar_mensaje_telegram(telegram_id: int, texto: str):
    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token:
        return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": telegram_id, "text": texto, "parse_mode": "HTML"}
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, data=payload, timeout=10)
    except Exception as e:
        logger.error(f"Error enviando mensaje a {telegram_id}: {e}")

async def notificar_referido(telegram_id: int, nombre_referido: str):
    mensaje = (
        f"🎉 <b>¡Nuevo Referido!</b>\n\n"
        f"👤 <b>{nombre_referido}</b> se ha unido con tu enlace.\n"
        f"💰 Has recibido <b>+1.00 USDT</b> en tu saldo congelado.\n"
        f"📈 ¡Sigue generando rendimientos retirables!\n"
        f"💸 Desde ahora ganas el <b>12% de comisión</b> sobre lo que este usuario invierta."
    )
    await enviar_mensaje_telegram(telegram_id, mensaje)

async def notificar_ganancias(telegram_id: int, ganancia_usdt: float, porcentaje_dia: float):
    mensaje = (
        f"📊 <b>¡Reporte Diario de CipherX!</b>\n\n"
        f"🤖 Nuestro equipo de trading ha completado las operaciones de hoy.\n"
        f"📈 <b>Rendimiento generado:</b> +{porcentaje_dia:.2f}%\n"
        f"💵 <b>Ganancia neta:</b> +{ganancia_usdt:.2f} USDT\n"
        f"💳 <i>(Añadidos a tu saldo retirable)</i>\n\n"
        f"🚀 ¡Sigue así, tu capital está trabajando por ti!"
    )
    await enviar_mensaje_telegram(telegram_id, mensaje)

# ==========================================================================
# Modelos ORM (SQLAlchemy)
# ==========================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    nombre = Column(String(120), nullable=False)
    username = Column(String(120), nullable=True)
    saldo_congelado = Column(Numeric(18, 6), nullable=False, default=Decimal("0.000000"))
    saldo_retirable = Column(Numeric(18, 6), nullable=False, default=Decimal("0.000000"))
    id_patrocinador = Column(
        BigInteger,
        ForeignKey("users.telegram_id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_banned = Column(Boolean, default=False, nullable=False)
    deposito_realizado = Column(Boolean, default=False, nullable=False)

    transactions = relationship(
        "Transaction", back_populates="user", cascade="all, delete-orphan"
    )
    trades = relationship(
        "Trade", back_populates="user", cascade="all, delete-orphan"
    )

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tipo = Column(String(20), nullable=False)       # deposito | retiro | comision | bono
    monto = Column(Numeric(18, 6), nullable=False)
    red = Column(String(16), nullable=True)         # TON | TRC20 | BEP20
    estado = Column(String(24), nullable=False, default="pendiente")
    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="transactions")

class Trade(Base):
    __tablename__ = "trades"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    par = Column(String(32), nullable=False, default="ETH/USDT")
    tipo = Column(String(10), nullable=False)       # long | short
    monto = Column(Numeric(18, 6), nullable=False)
    resultado = Column(Numeric(18, 6), nullable=False)
    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="trades")

# ==========================================================================
# Reglas y Constantes de Negocio
# ==========================================================================

WELCOME_BONUS_CONGELADO = Decimal("40.000000")
INITIAL_SALDO_RETIRABLE = Decimal("0.000000")
MIN_DEPOSIT_USDT = Decimal("10.000000")
MIN_WITHDRAW_USDT = Decimal("5.000000")
WITHDRAW_FEE_USDT = Decimal("0.150000")
REFERRAL_BONUS_CONGELADO = Decimal("1.000000")
REFERRAL_DEPOSIT_COMMISSION_RATE = Decimal("0.12")
DAILY_MIN_RETURN_PCT = Decimal("0.006")
DAILY_MAX_RETURN_PCT = Decimal("0.009")
WIN_RATE_TARGET = 0.80
TRADE_PAIR_ETH = "ETH/USDT"
TRADE_SIDES = ["long", "short"]
ETH_LEVERAGE_OPTIONS = [5, 10, 20, 25]
SIX_DECIMALS = Decimal("0.000001")

def quantize_usdt(value: Decimal) -> Decimal:
    return Decimal(value).quantize(SIX_DECIMALS, rounding=ROUND_HALF_UP)

def parse_sponsor_id(raw_val: Optional[str]) -> Optional[int]:
    if not raw_val:
        return None
    cleaned = str(raw_val).strip()
    if cleaned.startswith("ref_"):
        cleaned = cleaned[4:].strip()
    if not cleaned.isdigit():
        return None
    sponsor_tg_id = int(cleaned)
    return sponsor_tg_id if sponsor_tg_id > 0 else None

def extract_start_param_from_init_data(init_data: Optional[str]) -> Optional[str]:
    if not init_data:
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=False))
        return pairs.get("start_param")
    except Exception:
        return None

def user_has_completed_deposit(db: Session, user: User) -> bool:
    if bool(getattr(user, "deposito_realizado", False)):
        return True
    has_tx = (
        db.query(Transaction.id)
        .filter(
            Transaction.user_id == user.id,
            Transaction.tipo == "deposito",
            Transaction.estado == "completado",
        )
        .first()
        is not None
    )
    if has_tx and not user.deposito_realizado:
        user.deposito_realizado = True
        db.flush()
    return has_tx

def apply_credited_deposit(
    db: Session,
    user: User,
    monto: Decimal,
    red: Literal["TON", "TRC20", "BEP20"],
) -> tuple[Transaction, Decimal]:
    monto_q = quantize_usdt(monto)
    user.saldo_retirable = quantize_usdt(Decimal(user.saldo_retirable or 0) + monto_q)
    user.deposito_realizado = True

    deposit_tx = Transaction(
        user_id=user.id,
        tipo="deposito",
        monto=monto_q,
        red=red,
        estado="completado",
    )
    db.add(deposit_tx)
    db.flush()

    comision_patrocinador = Decimal("0.000000")
    if user.id_patrocinador:
        sponsor = db.query(User).filter(User.telegram_id == user.id_patrocinador).first()
        if sponsor:
            comision_patrocinador = quantize_usdt(monto_q * REFERRAL_DEPOSIT_COMMISSION_RATE)
            sponsor.saldo_retirable = quantize_usdt(
                Decimal(sponsor.saldo_retirable or 0) + comision_patrocinador
            )
            db.add(
                Transaction(
                    user_id=sponsor.id,
                    tipo="comision",
                    monto=comision_patrocinador,
                    red=red,
                    estado="completado",
                )
            )

    return deposit_tx, comision_patrocinador

def generate_daily_trades_amounts(capital_base: Decimal, num_trades: int = 5) -> List[Decimal]:
    daily_pct = Decimal(
        str(round(random.uniform(float(DAILY_MIN_RETURN_PCT), float(DAILY_MAX_RETURN_PCT)), 6))
    )
    target_net_profit = quantize_usdt(capital_base * daily_pct)
    if num_trades <= 1 or target_net_profit <= Decimal("0.000000"):
        return [target_net_profit]

    win_count = max(1, int(round(num_trades * WIN_RATE_TARGET)))
    loss_count = max(0, num_trades - win_count)
    if loss_count == 0 and num_trades >= 5:
        win_count = num_trades - 1
        loss_count = 1

    outcomes = ["win"] * win_count + ["loss"] * loss_count
    random.shuffle(outcomes)

    raw_weights = [Decimal(str(round(random.uniform(0.6, 1.4), 4))) for _ in outcomes]
    weight_sum = sum(raw_weights)
    normalized = [w / weight_sum for w in raw_weights]

    loss_budget = (
        quantize_usdt(target_net_profit * Decimal("0.15"))
        if loss_count > 0
        else Decimal("0.000000")
    )
    win_budget = quantize_usdt(target_net_profit + loss_budget)

    loss_indices = [i for i, o in enumerate(outcomes) if o == "loss"]
    win_indices = [i for i, o in enumerate(outcomes) if o == "win"]
    results: List[Decimal] = [Decimal("0.000000")] * num_trades

    if loss_indices:
        l_weights = [normalized[i] for i in loss_indices]
        l_sum = sum(l_weights)
        acum_loss = Decimal("0.000000")
        for idx_pos, i in enumerate(loss_indices):
            if idx_pos == len(loss_indices) - 1:
                val = quantize_usdt(loss_budget - acum_loss)
            else:
                val = quantize_usdt(loss_budget * (l_weights[idx_pos] / l_sum))
                acum_loss = quantize_usdt(acum_loss + val)
            results[i] = -abs(val)

    w_weights = [normalized[i] for i in win_indices]
    w_sum = sum(w_weights)
    acum_win = Decimal("0.000000")
    for idx_pos, i in enumerate(win_indices):
        if idx_pos == len(win_indices) - 1:
            val = quantize_usdt(win_budget - acum_win)
        else:
            val = quantize_usdt(win_budget * (w_weights[idx_pos] / w_sum))
            acum_win = quantize_usdt(acum_win + val)
        results[i] = abs(val)

    return results

# ==========================================================================
# Esquemas Pydantic
# ==========================================================================

class UserRegisterIn(BaseModel):
    telegram_id: int = Field(..., gt=0)
    nombre: str = Field(..., min_length=1, max_length=120)
    username: Optional[str] = Field(default=None, max_length=120)
    id_patrocinador: Optional[int] = Field(default=None, gt=0)

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    telegram_id: int
    nombre: str
    username: Optional[str] = None
    saldo_congelado: Decimal
    saldo_retirable: Decimal
    saldo_total: Decimal
    deposito_realizado: bool = False
    id_patrocinador: Optional[int] = None
    created_at: datetime

class ReferralItemOut(BaseModel):
    telegram_id: int
    nombre: str
    username: Optional[str] = None
    fecha: datetime
    bono: Decimal
    activo: bool = False

class ReferralStatsOut(BaseModel):
    telegram_id: int
    total_referidos: int
    referidos_activos: int
    comisiones_totales: Decimal
    referidos: List[ReferralItemOut]

class DepositWebhookIn(BaseModel):
    telegram_id: int = Field(..., gt=0)
    monto: Decimal = Field(..., gt=0)
    red: Literal["TON", "TRC20", "BEP20"]
    tx_hash: Optional[str] = Field(default=None, max_length=255)

class DepositOut(BaseModel):
    transaction_id: int
    telegram_id: int
    red: str
    monto_depositado: Decimal
    comision_patrocinador_retirable: Decimal
    nuevo_saldo_retirable_usuario: Decimal
    nuevo_saldo_congelado_usuario: Decimal
    estado: str

class WithdrawRequestIn(BaseModel):
    telegram_id: int = Field(..., gt=0)
    monto: Decimal = Field(..., gt=0)
    red: Literal["TON", "TRC20", "BEP20"]
    wallet_destino: Optional[str] = Field(default=None, max_length=255)

class WithdrawOut(BaseModel):
    transaction_id: int
    telegram_id: int
    red: str
    monto_solicitado: Decimal
    comision_red: Decimal
    total_descontado_retirable: Decimal
    nuevo_saldo_retirable_usuario: Decimal
    estado: str
    tiempo_estimado: str

class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tipo: str
    monto: Decimal
    red: Optional[str] = None
    estado: str
    fecha: datetime

class TradeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    par: str
    tipo: str
    monto: Decimal
    resultado: Decimal
    apalancamiento: int = 10
    fecha: datetime

class TradeBatchOut(BaseModel):
    telegram_id: int
    operaciones_generadas: int
    ganancia_neta_tanda: Decimal
    nuevo_saldo_retirable: Decimal
    trades: List[TradeOut]

def build_user_out(user: User) -> UserOut:
    congelado = quantize_usdt(Decimal(user.saldo_congelado or Decimal("0.000000")))
    retirable = quantize_usdt(Decimal(user.saldo_retirable or Decimal("0.000000")))
    created = user.created_at or datetime.now(timezone.utc)
    return UserOut(
        id=user.id,
        telegram_id=user.telegram_id,
        nombre=user.nombre or "Trader",
        username=user.username,
        saldo_congelado=congelado,
        saldo_retirable=retirable,
        saldo_total=quantize_usdt(congelado + retirable),
        deposito_realizado=bool(getattr(user, "deposito_realizado", False)),
        id_patrocinador=user.id_patrocinador,
        created_at=created,
    )

def get_or_create_user_with_bonus(
    db: Session,
    telegram_id: int,
    nombre: str,
    username: Optional[str] = None,
    id_patrocinador: Optional[int] = None,
) -> User:
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if user:
        updated = False
        clean_name = (nombre or "").strip()
        if clean_name and user.nombre != clean_name:
            user.nombre = clean_name
            updated = True
        if username is not None:
            clean_user = username.strip() or None
            if user.username != clean_user:
                user.username = clean_user
                updated = True
        if (
            user.id_patrocinador is None
            and id_patrocinador
            and id_patrocinador != telegram_id
        ):
            sponsor = db.query(User).filter(User.telegram_id == id_patrocinador).first()
            if sponsor:
                user.id_patrocinador = sponsor.telegram_id
                sponsor.saldo_congelado = quantize_usdt(
                    Decimal(sponsor.saldo_congelado or 0) + REFERRAL_BONUS_CONGELADO
                )
                db.add(
                    Transaction(
                        user_id=sponsor.id,
                        tipo="bono",
                        monto=REFERRAL_BONUS_CONGELADO,
                        red=None,
                        estado="completado",
                    )
                )
                updated = True
        if updated:
            db.commit()
            db.refresh(user)
        return user

    sponsor_id: Optional[int] = None
    sponsor: Optional[User] = None
    if id_patrocinador and id_patrocinador != telegram_id:
        sponsor = db.query(User).filter(User.telegram_id == id_patrocinador).first()
        if sponsor:
            sponsor_id = sponsor.telegram_id

    user = User(
        telegram_id=telegram_id,
        nombre=(nombre or "Trader").strip(),
        username=username.strip() if username else None,
        saldo_congelado=WELCOME_BONUS_CONGELADO,
        saldo_retirable=INITIAL_SALDO_RETIRABLE,
        id_patrocinador=sponsor_id,
    )
    db.add(user)
    db.flush()

    if sponsor:
        sponsor.saldo_congelado = quantize_usdt(
            Decimal(sponsor.saldo_congelado or 0) + REFERRAL_BONUS_CONGELADO
        )
        db.add(
            Transaction(
                user_id=sponsor.id,
                tipo="bono",
                monto=REFERRAL_BONUS_CONGELADO,
                red=None,
                estado="completado",
            )
        )

    db.commit()
    db.refresh(user)
    return user

# ==========================================================================
# Aplicación FastAPI
# ==========================================================================

app = FastAPI(title="CipherX API", version="0.5.0-admin")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from admin_routes import router as admin_router  # noqa: E402

app.include_router(admin_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "cipherx-api", "phase": "5-admin"}

@app.get("/api/user/me", response_model=UserOut)
def get_current_user_me(
    dev_telegram_id: Optional[int] = Query(default=None, gt=0),
    dev_nombre: Optional[str] = Query(default=None, max_length=120),
    dev_username: Optional[str] = Query(default=None, max_length=120),
    start_param: Optional[str] = Query(default=None, max_length=120),
    dev_patrocinador: Optional[int] = Query(default=None, gt=0),
    x_telegram_init_data: Optional[str] = Header(default=None, alias="X-Telegram-Init-Data"),
    db: Session = Depends(get_db),
):
    sponsor_from_param = parse_sponsor_id(start_param)
    if sponsor_from_param is None and x_telegram_init_data:
        sponsor_from_param = parse_sponsor_id(
            extract_start_param_from_init_data(x_telegram_init_data)
        )
    resolved_sponsor = sponsor_from_param or dev_patrocinador

    clean_init_data = (x_telegram_init_data or "").strip()
    if clean_init_data:
        try:
            bot_token = _get_bot_token()
            auth_user: TelegramAuthUser = validate_telegram_init_data(
                init_data=clean_init_data,
                bot_token=bot_token,
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Error validando X-Telegram-Init-Data en /api/user/me")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"InitData inválido: {exc}",
            ) from exc

        user = get_or_create_user_with_bonus(
            db=db,
            telegram_id=auth_user.telegram_id,
            nombre=auth_user.nombre,
            username=auth_user.username,
            id_patrocinador=resolved_sponsor,
        )
        if getattr(user, "is_banned", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cuenta suspendida por actividad sospechosa.",
            )
        return build_user_out(user)

    target_id = dev_telegram_id or 78452613
    default_name = dev_nombre or ("Alex" if target_id == 78452613 else f"User {target_id}")
    user = get_or_create_user_with_bonus(
        db=db,
        telegram_id=target_id,
        nombre=default_name,
        username=dev_username,
        id_patrocinador=resolved_sponsor,
    )
    if getattr(user, "is_banned", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta suspendida por actividad sospechosa.",
        )
    return build_user_out(user)

@app.get("/api/auth/verify", response_model=UserOut)
def verify_auth_endpoint(
    auth_user: TelegramAuthUser = Depends(verify_telegram_webapp),
    db: Session = Depends(get_db),
):
    user = get_or_create_user_with_bonus(
        db=db,
        telegram_id=auth_user.telegram_id,
        nombre=auth_user.nombre,
        username=auth_user.username,
    )
    return build_user_out(user)

@app.post("/api/user/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegisterIn, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.telegram_id == payload.telegram_id).first()
    if existing_user:
        return build_user_out(existing_user)

    sponsor_id: Optional[int] = None
    sponsor: Optional[User] = None
    if payload.id_patrocinador and payload.id_patrocinador != payload.telegram_id:
        sponsor = db.query(User).filter(User.telegram_id == payload.id_patrocinador).first()
        if sponsor:
            sponsor_id = sponsor.telegram_id

    new_user = User(
        telegram_id=payload.telegram_id,
        nombre=payload.nombre.strip(),
        username=payload.username.strip() if payload.username else None,
        saldo_congelado=WELCOME_BONUS_CONGELADO,
        saldo_retirable=INITIAL_SALDO_RETIRABLE,
        id_patrocinador=sponsor_id,
    )
    db.add(new_user)
    db.flush()

    if sponsor:
        sponsor.saldo_congelado = quantize_usdt(
            Decimal(sponsor.saldo_congelado or 0) + REFERRAL_BONUS_CONGELADO
        )
        db.add(
            Transaction(
                user_id=sponsor.id,
                tipo="bono",
                monto=REFERRAL_BONUS_CONGELADO,
                red=None,
                estado="completado",
            )
        )

    db.commit()
    db.refresh(new_user)
    
    if sponsor:
        await notificar_referido(sponsor.telegram_id, new_user.nombre)

    return build_user_out(new_user)

@app.get("/api/referrals/{telegram_id}", response_model=ReferralStatsOut)
def get_user_referrals(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    referred_users = (
        db.query(User)
        .filter(User.id_patrocinador == telegram_id)
        .order_by(User.created_at.desc(), User.id.desc())
        .all()
    )
    commissions_sum = (
        db.query(func.coalesce(func.sum(Transaction.monto), Decimal("0.000000")))
        .filter(
            Transaction.user_id == user.id,
            Transaction.tipo == "comision",
            Transaction.estado == "completado",
        )
        .scalar()
    )

    items: List[ReferralItemOut] = []
    active_count = 0
    for ref in referred_users:
        has_deposit = (
            db.query(Transaction.id)
            .filter(
                Transaction.user_id == ref.id,
                Transaction.tipo == "deposito",
                Transaction.estado == "completado",
            )
            .first()
            is not None
        )
        is_active = has_deposit or Decimal(ref.saldo_retirable or 0) > Decimal("0.000000")
        if is_active:
            active_count += 1
        items.append(
            ReferralItemOut(
                telegram_id=ref.telegram_id,
                nombre=ref.nombre,
                username=ref.username,
                fecha=ref.created_at or datetime.now(timezone.utc),
                bono=REFERRAL_BONUS_CONGELADO,
                activo=is_active,
            )
        )

    return ReferralStatsOut(
        telegram_id=telegram_id,
        total_referidos=len(referred_users),
        referidos_activos=active_count,
        comisiones_totales=quantize_usdt(Decimal(commissions_sum or 0)),
        referidos=items,
    )

@app.post("/api/deposit/webhook", response_model=DepositOut, status_code=status.HTTP_201_CREATED)
async def process_deposit_webhook(payload: DepositWebhookIn, db: Session = Depends(get_db)):
    monto_q = quantize_usdt(payload.monto)
    if monto_q < MIN_DEPOSIT_USDT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El depósito mínimo es de 10 USDT",
        )

    user = db.query(User).filter(User.telegram_id == payload.telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    deposit_tx, comision_patrocinador = apply_credited_deposit(
        db=db,
        user=user,
        monto=monto_q,
        red=payload.red,
    )
    db.commit()
    db.refresh(user)
    db.refresh(deposit_tx)

    # Notificación al usuario
    texto_deposito = (
        f"✅ <b>¡Depósito Confirmado!</b>\n\n"
        f"💵 Monto: <b>{monto_q} USDT</b>\n"
        f"🌐 Red: {payload.red}\n\n"
        f"Tu saldo retirable ha sido actualizado. ¡Ya puedes solicitar tu retiro!"
    )
    await enviar_mensaje_telegram(user.telegram_id, texto_deposito)

    # Notificación al patrocinador
    if user.id_patrocinador and comision_patrocinador > 0:
        texto_comision = (
            f"🎁 <b>¡Comisión de Referido!</b>\n\n"
            f"Tu referido ha depositado <b>{monto_q} USDT</b>.\n"
            f"Has recibido <b>{comision_patrocinador} USDT</b> en tu saldo retirable."
        )
        await enviar_mensaje_telegram(user.id_patrocinador, texto_comision)

    return DepositOut(
        transaction_id=deposit_tx.id,
        telegram_id=user.telegram_id,
        red=payload.red,
        monto_depositado=monto_q,
        comision_patrocinador_retirable=comision_patrocinador,
        nuevo_saldo_retirable_usuario=user.saldo_retirable,
        nuevo_saldo_congelado_usuario=user.saldo_congelado,
        estado=deposit_tx.estado,
    )

@app.post("/api/withdraw/request", response_model=WithdrawOut, status_code=status.HTTP_201_CREATED)
def request_withdrawal(payload: WithdrawRequestIn, db: Session = Depends(get_db)):
    monto_q = quantize_usdt(payload.monto)
    if monto_q < MIN_WITHDRAW_USDT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El retiro mínimo es de 5 USDT",
        )

    user = db.query(User).filter(User.telegram_id == payload.telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    if not user_has_completed_deposit(db, user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Para solicitar un retiro, primero debes ser inversor y tener al menos un depósito acreditado.",
        )

    total_a_descontar = quantize_usdt(monto_q + WITHDRAW_FEE_USDT)
    saldo_retirable_actual = Decimal(user.saldo_retirable or 0)
    if saldo_retirable_actual < total_a_descontar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Saldo retirable insuficiente para cubrir el monto y la comisión de 0.15 USDT",
        )

    user.saldo_retirable = quantize_usdt(saldo_retirable_actual - total_a_descontar)
    withdraw_tx = Transaction(
        user_id=user.id,
        tipo="retiro",
        monto=monto_q,
        red=payload.red,
        estado="pendiente",
    )
    db.add(withdraw_tx)
    db.commit()
    db.refresh(user)
    db.refresh(withdraw_tx)
    return WithdrawOut(
        transaction_id=withdraw_tx.id,
        telegram_id=user.telegram_id,
        red=payload.red,
        monto_solicitado=monto_q,
        comision_red=WITHDRAW_FEE_USDT,
        total_descontado_retirable=total_a_descontar,
        nuevo_saldo_retirable_usuario=user.saldo_retirable,
        estado=withdraw_tx.estado,
        tiempo_estimado="Procesando en lote (hasta 24 horas)",
    )

@app.post("/api/admin/withdraw/{transaction_id}/approve", response_model=TransactionOut)
def approve_withdrawal(transaction_id: int, db: Session = Depends(get_db)):
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.tipo == "retiro")
        .first()
    )
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Retiro no encontrado"
        )
    if tx.estado not in ("pendiente", "en_lote"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El retiro ya está en estado '{tx.estado}'",
        )
    tx.estado = "completado"
    db.commit()
    db.refresh(tx)
    return tx

@app.post("/api/admin/withdraw/{transaction_id}/reject", response_model=TransactionOut)
def reject_withdrawal(transaction_id: int, db: Session = Depends(get_db)):
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.tipo == "retiro")
        .first()
    )
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Retiro no encontrado"
        )
    if tx.estado not in ("pendiente", "en_lote"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El retiro ya está en estado '{tx.estado}'",
        )

    user = db.query(User).filter(User.id == tx.user_id).first()
    if user:
        reembolso = quantize_usdt(Decimal(tx.monto or 0) + WITHDRAW_FEE_USDT)
        user.saldo_retirable = quantize_usdt(Decimal(user.saldo_retirable or 0) + reembolso)

    tx.estado = "rechazado"
    db.commit()
    db.refresh(tx)
    return tx

@app.post(
    "/api/trades/generate/{telegram_id}",
    response_model=TradeBatchOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_trades_for_user(
    telegram_id: int,
    num_trades: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    capital_base = Decimal(user.saldo_congelado or 0) + Decimal(user.saldo_retirable or 0)
    if capital_base <= Decimal("0.000000"):
        capital_base = Decimal("100.000000")

    resultados = generate_daily_trades_amounts(capital_base=capital_base, num_trades=num_trades)
    monto_operacion = quantize_usdt(capital_base / Decimal(str(num_trades)))
    created_trades: List[TradeOut] = []
    net_gain = Decimal("0.000000")
    sides = [TRADE_SIDES[i % len(TRADE_SIDES)] for i in range(num_trades)]
    random.shuffle(sides)

    for idx, res in enumerate(resultados):
        lev = random.choice(ETH_LEVERAGE_OPTIONS)
        trade = Trade(
            user_id=user.id,
            par=TRADE_PAIR_ETH,
            tipo=sides[idx],
            monto=monto_operacion,
            resultado=res,
        )
        db.add(trade)
        db.flush()
        created_trades.append(
            TradeOut(
                id=trade.id,
                par=trade.par,
                tipo=trade.tipo,
                monto=trade.monto,
                resultado=trade.resultado,
                apalancamiento=lev,
                fecha=trade.fecha or datetime.now(timezone.utc),
            )
        )
        net_gain = quantize_usdt(net_gain + res)

    user.saldo_retirable = quantize_usdt(Decimal(user.saldo_retirable or 0) + net_gain)
    
    porcentaje_dia = float((net_gain / capital_base) * 100) if capital_base > 0 else 0.0
    await notificar_ganancias(user.telegram_id, float(net_gain), porcentaje_dia)

    db.commit()
    db.refresh(user)
    return TradeBatchOut(
        telegram_id=user.telegram_id,
        operaciones_generadas=len(created_trades),
        ganancia_neta_tanda=net_gain,
        nuevo_saldo_retirable=user.saldo_retirable,
        trades=created_trades,
    )

@app.get("/api/trades/{telegram_id}", response_model=List[TradeOut])
def get_user_trades(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    trades = (
        db.query(Trade)
        .filter(Trade.user_id == user.id)
        .order_by(Trade.fecha.desc(), Trade.id.desc())
        .all()
    )
    return [
        TradeOut(
            id=t.id,
            par=TRADE_PAIR_ETH,
            tipo=t.tipo,
            monto=t.monto,
            resultado=t.resultado,
            apalancamiento=random.choice(ETH_LEVERAGE_OPTIONS),
            fecha=t.fecha or datetime.now(timezone.utc),
        )
        for t in trades
    ]

@app.get("/api/transactions/{telegram_id}", response_model=List[TransactionOut])
def get_user_transactions(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .order_by(Transaction.fecha.desc(), Transaction.id.desc())
        .all()
    )

@app.get("/api/user/{telegram_id}", response_model=UserOut)
def get_user_by_telegram_id(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    return build_user_out(user)
