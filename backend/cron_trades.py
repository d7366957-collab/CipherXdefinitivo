from decimal import Decimal
import random
from pathlib import Path
import sys

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
REPO_DIR = BASE_DIR.parent

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(REPO_DIR / ".env")

from database import SessionLocal
from main import (
    ETH_LEVERAGE_OPTIONS,
    TRADE_PAIR_ETH,
    TRADE_SIDES,
    Trade,
    User,
    generate_daily_trades_amounts,
    quantize_usdt,
)


def run_cron_trades() -> None:
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Procesando {len(users)} usuarios en cron_trades...")

        for user in users:
            congelado = Decimal(user.saldo_congelado or Decimal("0.000000"))
            retirable = Decimal(user.saldo_retirable or Decimal("0.000000"))
            saldo_total = quantize_usdt(congelado + retirable)

            if saldo_total <= Decimal("0.000000"):
                print(f"Usuario {user.telegram_id} omitido por saldo_total <= 0.")
                continue

            num_trades = random.randint(5, 7)
            resultados = generate_daily_trades_amounts(capital_base=saldo_total, num_trades=num_trades)
            monto_operacion = quantize_usdt(saldo_total / Decimal(str(num_trades)))

            sides = [TRADE_SIDES[i % len(TRADE_SIDES)] for i in range(num_trades)]
            random.shuffle(sides)

            ganancia_neta = Decimal("0.000000")
            for idx, res in enumerate(resultados):
                _lev = random.choice(ETH_LEVERAGE_OPTIONS)
                trade = Trade(
                    user_id=user.id,
                    par=TRADE_PAIR_ETH,
                    tipo=sides[idx],
                    monto=monto_operacion,
                    resultado=res,
                )
                db.add(trade)
                ganancia_neta = quantize_usdt(ganancia_neta + res)

            user.saldo_retirable = quantize_usdt(retirable + ganancia_neta)
            print(
                f"Usuario {user.telegram_id}: {num_trades} trades ETH | "
                f"Neto: {ganancia_neta} USDT | Nuevo saldo_retirable: {user.saldo_retirable}"
            )

        db.commit()
        print("Cron de trades completado con éxito.")
    except Exception as exc:
        db.rollback()
        print(f"Error ejecutando cron_trades: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_cron_trades()
