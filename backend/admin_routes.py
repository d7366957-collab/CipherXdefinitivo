import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

# IMPORTACIONES CORREGIDAS (Sin el punto)
from database import get_db
from models import User, Transaction
from aiogram import Bot

BOT_TOKEN = os.getenv("BOT_TOKEN")
bot = Bot(token=BOT_TOKEN) if BOT_TOKEN else None
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "cipherx2024") 

router = APIRouter(prefix="/api/admin", tags=["Admin"])

class LoginRequest(BaseModel):
    password: str

class BalanceRequest(BaseModel):
    campo: str 
    accion: str 
    monto: float

class SorteoRequest(BaseModel):
    monto: float

class BroadcastRequest(BaseModel):
    mensaje: str

class BanRequest(BaseModel):
    banear: bool

def verify_admin_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    token = authorization.split(" ")[1]
    if token != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Token inválido")
    return token

@router.post("/login")
def admin_login(data: LoginRequest):
    if data.password == ADMIN_PASSWORD:
        return {"token": ADMIN_PASSWORD}
    raise HTTPException(status_code=401, detail="Contraseña incorrecta")

@router.get("/users")
def get_users(telegram_id: Optional[str] = None, db: Session = Depends(get_db), _=Depends(verify_admin_token)):
    query = db.query(User)
    if telegram_id:
        query = query.filter(User.telegram_id == telegram_id)
    users = query.order_by(User.id.desc()).all()
    return [{"id": u.telegram_id, "nombre": u.nombre, "congelado": float(u.saldo_congelado), "retirable": float(u.saldo_retirable), "total": float(u.saldo_congelado) + float(u.saldo_retirable), "banned": getattr(u, 'is_banned', False)} for u in users]

@router.post("/users/{tg_id}/balance")
def edit_balance(tg_id: str, data: BalanceRequest, db: Session = Depends(get_db), _=Depends(verify_admin_token)):
    user = db.query(User).filter(User.telegram_id == tg_id).first()
    if not user: raise HTTPException(404, "Usuario no encontrado")
    
    monto = Decimal(str(data.monto)) if data.accion == "sumar" else -Decimal(str(data.monto))
    
    if data.campo == "congelado":
        user.saldo_congelado = Decimal(str(user.saldo_congelado)) + monto
    else:
        user.saldo_retirable = Decimal(str(user.saldo_retirable)) + monto
        
    db.commit()
    return {"status": "ok"}

@router.post("/users/{tg_id}/ban")
def ban_user(tg_id: str, data: BanRequest, db: Session = Depends(get_db), _=Depends(verify_admin_token)):
    user = db.query(User).filter(User.telegram_id == tg_id).first()
    if not user: raise HTTPException(404, "Usuario no encontrado")
    user.is_banned = data.banear
    db.commit()
    return {"status": "ok", "is_banned": user.is_banned}

@router.get("/withdrawals")
def get_withdrawals(db: Session = Depends(get_db), _=Depends(verify_admin_token)):
    # Buscamos transacciones de retiro que estén "procesando" o "pendiente"
    withdrawals = db.query(Transaction).filter(Transaction.tipo == 'retiro', Transaction.estado.in_(['procesando', 'pendiente'])).all()
    return [{"id": w.id, "user_id": w.user_id, "monto": float(w.monto), "red": w.red, "fecha": str(w.fecha)} for w in withdrawals]

@router.post("/withdrawals/{tx_id}/approve")
def approve_withdrawal(tx_id: int, db: Session = Depends(get_db), _=Depends(verify_admin_token)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx: raise HTTPException(404, "Transacción no encontrada")
    tx.estado = "confirmado"
    db.commit()
    return {"status": "ok"}

@router.post("/withdrawals/{tx_id}/reject")
def reject_withdrawal(tx_id: int, db: Session = Depends(get_db), _=Depends(verify_admin_token)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx: raise HTTPException(404, "Transacción no encontrada")
    
    user = db.query(User).filter(User.id == tx.user_id).first()
    if user:
        # Devolvemos el monto + la comisión (0.15)
        reembolso = Decimal(str(tx.monto)) + Decimal("0.150000")
        user.saldo_retirable = Decimal(str(user.saldo_retirable)) + reembolso
        
    tx.estado = "rechazado"
    db.commit()
    return {"status": "ok"}

@router.post("/sorteo-masivo")
def sorteo_masivo(data: SorteoRequest, db: Session = Depends(get_db), _=Depends(verify_admin_token)):
    users = db.query(User).all()
    monto_decimal = Decimal(str(data.monto))
    
    for u in users:
        u.saldo_retirable = Decimal(str(u.saldo_retirable)) + monto_decimal
        # Creamos el registro en el historial del usuario
        db.add(Transaction(user_id=u.id, tipo="bono", monto=monto_decimal, estado="confirmado", red="Sorteo"))
    db.commit()
    return {"status": "ok", "beneficiados": len(users)}

@router.post("/broadcast")
async def broadcast_message(data: BroadcastRequest, db: Session = Depends(get_db), _=Depends(verify_admin_token)):
    if not bot: return {"error": "Bot no configurado en el .env"}
    users = db.query(User).all()
    enviados = 0
    for u in users:
        try:
            texto = data.mensaje.replace("{name}", u.nombre or "Trader")
            await bot.send_message(chat_id=u.telegram_id, text=texto, parse_mode="HTML")
            enviados += 1
        except Exception as e:
            print(f"Error enviando a {u.telegram_id}: {e}")
            pass
    return {"status": "ok", "enviados": enviados}
