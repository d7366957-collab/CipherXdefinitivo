from dataclasses import dataclass
import hashlib
import hmac
import json
import os
import time
from typing import Optional
from urllib.parse import parse_qsl

from fastapi import Header, HTTPException, status


@dataclass
class TelegramAuthUser:
    telegram_id: int
    nombre: str
    username: Optional[str] = None
    auth_date: Optional[int] = None


def _get_bot_token() -> str:
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="BOT_TOKEN no configurado en el servidor",
        )
    return token


def validate_telegram_init_data(
    init_data: str,
    bot_token: str,
    max_age_seconds: int = 86400,
) -> TelegramAuthUser:
    if not init_data or not init_data.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="initData de Telegram faltante o inválido",
        )

    parsed_pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed_pairs.pop("hash", None)
    if not received_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Firma hash ausente en initData",
        )

    data_check_string = "\n".join(
        f"{key}={parsed_pairs[key]}" for key in sorted(parsed_pairs.keys())
    )

    secret_key = hmac.new(
        key=b"WebAppData",
        msg=bot_token.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()

    calculated_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="initData inválido: firma HMAC no coincide",
        )

    auth_date_raw = parsed_pairs.get("auth_date")
    auth_date_int: Optional[int] = None
    if auth_date_raw is not None:
        try:
            auth_date_int = int(auth_date_raw)
            now_ts = int(time.time())
            if max_age_seconds > 0 and (now_ts - auth_date_int) > max_age_seconds:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="initData expirado",
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="auth_date inválido en initData",
            )

    raw_user = parsed_pairs.get("user")
    if not raw_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Datos de usuario ausentes en initData",
        )

    try:
        user_data = json.loads(raw_user)
        telegram_id = int(user_data["id"])
        first_name = str(user_data.get("first_name") or "Usuario").strip()
        last_name = str(user_data.get("last_name") or "").strip()
        full_name = f"{first_name} {last_name}".strip() or "Usuario"
        username = user_data.get("username")
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Formato de usuario inválido en initData",
        )

    return TelegramAuthUser(
        telegram_id=telegram_id,
        nombre=full_name,
        username=username,
        auth_date=auth_date_int,
    )


def verify_telegram_webapp(
    x_telegram_init_data: Optional[str] = Header(default=None, alias="X-Telegram-Init-Data"),
) -> TelegramAuthUser:
    bot_token = _get_bot_token()
    return validate_telegram_init_data(init_data=x_telegram_init_data or "", bot_token=bot_token)
