from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
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


Base.metadata.create_all(bind=engine)


# ==========================================================================
# Esquemas Pydantic de Respuesta
# ==========================================================================

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


# ==========================================================================
# Aplicación FastAPI
# ==========================================================================

app = FastAPI(title="CipherX API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "cipherx-api", "phase": 2}


@app.get("/api/user/{telegram_id}", response_model=UserOut)
def get_user_by_telegram_id(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

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
