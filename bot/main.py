import asyncio
import logging
import os

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://tudominio.com").strip()

if not BOT_TOKEN:
    raise RuntimeError("Falta configurar BOT_TOKEN en el entorno o archivo .env")

logging.basicConfig(level=logging.INFO)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    payload_arg = ""
    if message.text:
        parts = message.text.split(maxsplit=1)
        if len(parts) == 2 and parts[1].strip():
            payload_arg = parts[1].strip()

    webapp_target = (
        f"{WEBAPP_URL}?startapp={payload_arg}" if payload_arg else WEBAPP_URL
    )

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Abrir App",
                    web_app=WebAppInfo(url=webapp_target),
                )
            ]
        ]
    )

    user_name = message.from_user.first_name if message.from_user else "Trader"
    await message.answer(
        f"¡Hola, {user_name}! Bienvenido a <b>CipherX</b>.\n\n"
        "Pulsa el botón de abajo para abrir la Mini App:",
        reply_markup=keyboard,
        parse_mode="HTML",
    )


async def main() -> None:
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
