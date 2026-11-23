-- ==========================================================================
-- CipherX — Esquema Base de Datos PostgreSQL (Fase 2)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    username VARCHAR(120),
    saldo_congelado NUMERIC(18, 6) NOT NULL DEFAULT 0.000000 CHECK (saldo_congelado >= 0),
    saldo_retirable NUMERIC(18, 6) NOT NULL DEFAULT 0.000000 CHECK (saldo_retirable >= 0),
    depositos_acreditados INTEGER NOT NULL DEFAULT 0 CHECK (depositos_acreditados >= 0),
    id_patrocinador BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS depositos_acreditados INTEGER NOT NULL DEFAULT 0 CHECK (depositos_acreditados >= 0);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_patrocinador ON users(id_patrocinador);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('deposito', 'retiro', 'comision', 'bono')),
    monto NUMERIC(18, 6) NOT NULL CHECK (monto > 0),
    red VARCHAR(16) CHECK (red IN ('TON', 'TRC20', 'BEP20')),
    estado VARCHAR(24) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'rechazado', 'en_lote')),
    nota_admin TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS nota_admin TEXT,
    ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_transactions_user_id_fecha ON transactions(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tipo_estado ON transactions(tipo, estado);
CREATE INDEX IF NOT EXISTS idx_transactions_user_tipo_estado ON transactions(user_id, tipo, estado);

CREATE TABLE IF NOT EXISTS trades (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    par VARCHAR(32) NOT NULL DEFAULT 'ETH/USDT',
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('long', 'short')),
    monto NUMERIC(18, 6) NOT NULL,
    resultado NUMERIC(18, 6) NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id_fecha ON trades(user_id, fecha DESC);
