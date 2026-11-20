from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Session, relationship

from database import Base, engine, get_db

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
    id_patrocinador = Column(BigInteger, ForeignKey("users.telegram_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(20), nullable=False)       # deposito | retiro | comision | bono
    monto = Column(Numeric(18, 6), nullable=False)
    red = Column(String(16), nullable=True)         # TON | TRC20 | BEP20
    estado = Column(String(24), nullable=False, default="pendiente")
    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="transactions")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    par = Column(String(32), nullable=False, default="ETH/USDT")
    tipo = Column(String(10), nullable=False)       # long | short
    monto = Column(Numeric(18, 6), nullable=False)
    resultado = Column(Numeric(18, 6), nullable=False)
    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="trades")


# Base.metadata.create_all(bind=engine)


# ==========================================================================
# Reglas y Constantes de Negocio
# ==========================================================================

MIN_DEPOSIT_USDT = Decimal("10.000000")
REFERRAL_BONUS_CONGELADO = Decimal("1.000000")
REFERRAL_DEPOSIT_COMMISSION_RATE = Decimal("0.12")
SIX_DECIMALS = Decimal("0.000001")


def quantize_usdt(value: Decimal) -> Decimal:
    return value.quantize(SIX_DECIMALS, rounding=ROUND_HALF_UP)


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
    id_patrocinador: Optional[int] = None
    created_at: datetime


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


def build_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        telegram_id=user.telegram_id,
        nombre=user.nombre,
        username=user.username,
        saldo_congelado=user.saldo_congelado,
        saldo_retirable=user.saldo_retirable,
        saldo_total=user.saldo_congelado + user.saldo_retirable,
        id_patrocinador=user.id_patrocinador,
        created_at=user.created_at,
    )


# ==========================================================================
# Aplicación FastAPI
# ==========================================================================

app = FastAPI(title="CipherX API", version="0.2.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "cipherx-api", "phase": "2A-deposits"}


@app.post("/api/user/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterIn, db: Session = Depends(get_db)):
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
        saldo_congelado=Decimal("0.000000"),
        saldo_retirable=Decimal("0.000000"),
        id_patrocinador=sponsor_id,
    )
    db.add(new_user)
    db.flush()

    if sponsor:
        sponsor.saldo_congelado = quantize_usdt(Decimal(sponsor.saldo_congelado) + REFERRAL_BONUS_CONGELADO)
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
    return build_user_out(new_user)


@app.post("/api/deposit/webhook", response_model=DepositOut, status_code=status.HTTP_201_CREATED)
def process_deposit_webhook(payload: DepositWebhookIn, db: Session = Depends(get_db)):
    monto_q = quantize_usdt(payload.monto)
    if monto_q < MIN_DEPOSIT_USDT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El depósito mínimo es de 10 USDT",
        )

    user = db.query(User).filter(User.telegram_id == payload.telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    user.saldo_retirable = quantize_usdt(Decimal(user.saldo_retirable) + monto_q)

    deposit_tx = Transaction(
        user_id=user.id,
        tipo="deposito",
        monto=monto_q,
        red=payload.red,
        estado="completado",
    )
    db.add(deposit_tx)
    db.flush()

    comision_patrocinador = Decimal("0.000000")
    if user.id_patrocinador:
        sponsor = db.query(User).filter(User.telegram_id == user.id_patrocinador).first()
        if sponsor:
            comision_patrocinador = quantize_usdt(monto_q * REFERRAL_DEPOSIT_COMMISSION_RATE)
            sponsor.saldo_retirable = quantize_usdt(Decimal(sponsor.saldo_retirable) + comision_patrocinador)
            db.add(
                Transaction(
                    user_id=sponsor.id,
                    tipo="comision",
                    monto=comision_patrocinador,
                    red=payload.red,
                    estado="completado",
                )
            )

    db.commit()
    db.refresh(user)
    db.refresh(deposit_tx)

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


@app.get("/api/user/{telegram_id}", response_model=UserOut)
def get_user_by_telegram_id(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return build_user_out(user)
