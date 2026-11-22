from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import random
from typing import List, Literal, Optional

from fastapi import FastAPI, Depends, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Session, relationship

from auth import (
    TelegramAuthUser,
    _get_bot_token,
    validate_telegram_init_data,
    verify_telegram_webapp,
)
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
    estado = Column(String(24), nullable=False, default="procesando")
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
MIN_WITHDRAW_USDT = Decimal("5.000000")
WITHDRAW_FEE_USDT = Decimal("0.150000")
REFERRAL_BONUS_CONGELADO = Decimal("1.000000")
REFERRAL_DEPOSIT_COMMISSION_RATE = Decimal("0.12")

DAILY_MIN_RETURN_PCT = Decimal("0.006")   # 0.6%
DAILY_MAX_RETURN_PCT = Decimal("0.009")   # 0.9%
WIN_RATE_TARGET = 0.80                    # 80% ganadas / 20% perdidas
TRADE_PAIR_ETH = "ETH/USDT"               # Solo Ethereum
TRADE_SIDES = ["long", "short"]           # Largo y corto en ETH
ETH_LEVERAGE_OPTIONS = [5, 10, 20, 25]

SIX_DECIMALS = Decimal("0.000001")


def quantize_usdt(value: Decimal) -> Decimal:
    return value.quantize(SIX_DECIMALS, rounding=ROUND_HALF_UP)


def generate_daily_trades_amounts(capital_base: Decimal, num_trades: int = 5) -> List[Decimal]:
    """
    Genera `num_trades` resultados (ganancias positivas y pérdidas negativas)
    respetando 80% ganadas / 20% perdidas y una suma diaria dentro de [0.6%, 0.9%]
    del `capital_base`.
    """
    daily_pct = Decimal(str(round(random.uniform(float(DAILY_MIN_RETURN_PCT), float(DAILY_MAX_RETURN_PCT)), 6)))
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

    loss_budget = quantize_usdt(target_net_profit * Decimal("0.15")) if loss_count > 0 else Decimal("0.000000")
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

app = FastAPI(title="CipherX API", version="0.3.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "cipherx-api", "phase": "3-bot-security"}


@app.get("/api/user/me", response_model=UserOut)
def get_current_user_me(
    dev_telegram_id: Optional[int] = Query(default=None, gt=0),
    x_telegram_init_data: Optional[str] = Header(default=None, alias="X-Telegram-Init-Data"),
    db: Session = Depends(get_db),
):
    if x_telegram_init_data is not None:
        bot_token = _get_bot_token()
        auth_user: TelegramAuthUser = validate_telegram_init_data(
            init_data=x_telegram_init_data,
            bot_token=bot_token,
        )
        user = db.query(User).filter(User.telegram_id == auth_user.telegram_id).first()
        if not user:
            user = User(
                telegram_id=auth_user.telegram_id,
                nombre=auth_user.nombre,
                username=auth_user.username,
                saldo_congelado=Decimal("0.000000"),
                saldo_retirable=Decimal("0.000000"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return build_user_out(user)

    target_id = dev_telegram_id or 78452613
    user = db.query(User).filter(User.telegram_id == target_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario de prueba no encontrado",
        )
    return build_user_out(user)


@app.get("/api/auth/verify", response_model=UserOut)
def verify_auth_endpoint(
    auth_user: TelegramAuthUser = Depends(verify_telegram_webapp),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.telegram_id == auth_user.telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no registrado",
        )
    return build_user_out(user)


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
                estado="confirmado",
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
        estado="confirmado",
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
                    estado="confirmado",
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    total_a_descontar = quantize_usdt(monto_q + WITHDRAW_FEE_USDT)
    saldo_retirable_actual = Decimal(user.saldo_retirable)
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
        estado="procesando",
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
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.tipo == "retiro").first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retiro no encontrado")
    if tx.estado != "procesando":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El retiro ya está en estado '{tx.estado}'",
        )
    tx.estado = "confirmado"
    db.commit()
    db.refresh(tx)
    return tx


@app.post("/api/admin/withdraw/{transaction_id}/reject", response_model=TransactionOut)
def reject_withdrawal(transaction_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.tipo == "retiro").first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retiro no encontrado")
    if tx.estado != "procesando":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El retiro ya está en estado '{tx.estado}'",
        )

    user = db.query(User).filter(User.id == tx.user_id).first()
    if user:
        reembolso = quantize_usdt(Decimal(tx.monto) + WITHDRAW_FEE_USDT)
        user.saldo_retirable = quantize_usdt(Decimal(user.saldo_retirable) + reembolso)

    tx.estado = "rechazado"
    db.commit()
    db.refresh(tx)
    return tx


@app.post("/api/trades/generate/{telegram_id}", response_model=TradeBatchOut, status_code=status.HTTP_201_CREATED)
def generate_trades_for_user(
    telegram_id: int,
    num_trades: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    capital_base = Decimal(user.saldo_congelado) + Decimal(user.saldo_retirable)
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
                fecha=trade.fecha,
            )
        )
        net_gain = quantize_usdt(net_gain + res)

    user.saldo_retirable = quantize_usdt(Decimal(user.saldo_retirable) + net_gain)
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

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
            fecha=t.fecha,
        )
        for t in trades
    ]


@app.get("/api/transactions/{telegram_id}", response_model=List[TransactionOut])
def get_user_transactions(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return build_user_out(user)
