import asyncio
import logging
import os
from pathlib import Path

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    CallbackQuery,
    FSInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://cipherxtrade.duckdns.org").strip()

if not BOT_TOKEN:
    raise RuntimeError("Falta configurar BOT_TOKEN en el entorno o archivo .env")

logging.basicConfig(level=logging.INFO)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Idioma en memoria por usuario (por defecto: español 'es')
USER_LANGS: dict[int, str] = {}

CAPTIONS = {
    "es": (
        "🛡️ <b>CipherX: El futuro de tus finanzas.</b>\n\n"
        "Tu dinero seguro, creciendo todos los días con las estrategias de nuestro equipo de traders.\n\n"
        "💳 Retiros directos a tu billetera personal (TRC20, BEP20, TON).\n"
        "🎁 Bono de bienvenida de 40 USDT incluido.\n\n"
        "👇 <i>Abre la Mini App y toma el control.</i>"
    ),
    "ru": (
        "🛡️ <b>CipherX: Будущее ваших финансов.</b>\n\n"
        "Ваши средства под защитой и растут каждый день благодаря стратегиям нашей команды трейдеров.\n\n"
        "💳 Прямые выводы на ваш личный кошелёк (TRC20, BEP20, TON).\n"
        "🎁 Приветственный бонус 40 USDT уже включён.\n\n"
        "👇 <i>Откройте Mini App и возьмите управление в свои руки.</i>"
    ),
    "en": (
        "🛡️ <b>CipherX: The future of your finances.</b>\n\n"
        "Your funds safe, growing every day with the strategies of our trading team.\n\n"
        "💳 Direct withdrawals to your personal wallet (TRC20, BEP20, TON).\n"
        "🎁 40 USDT welcome bonus included.\n\n"
        "👇 <i>Open the Mini App and take control.</i>"
    ),
}

OPEN_APP_TEXT = {
    "es": "🚀 Abrir CipherX",
    "ru": "🚀 Открыть CipherX",
    "en": "🚀 Open CipherX",
}

LANG_PROMPT_TEXT = {
    "es": "🌐 Selecciona el idioma del bot:",
    "ru": "🌐 Выберите язык бота:",
    "en": "🌐 Select the bot language:",
}

LANG_CHANGED_TEXT = {
    "es": "✅ Idioma configurado en <b>Español</b>.",
    "ru": "✅ Язык изменён на <b>Русский</b>.",
    "en": "✅ Language set to <b>English</b>.",
}


def resolve_start_image() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent / "img" / "img-start.webp",
        Path.cwd() / "img" / "img-start.webp",
        Path.cwd().parent / "img" / "img-start.webp",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def get_user_lang(message_or_cb: Message | CallbackQuery) -> str:
    user = message_or_cb.from_user
    if user and user.id in USER_LANGS:
        return USER_LANGS[user.id]

    tg_code = (user.language_code or "").lower() if user else ""
    if tg_code.startswith("ru"):
        return "ru"
    if tg_code.startswith("en"):
        return "en"
    # Español por defecto
    return "es"


def build_start_keyboard(lang: str, payload_arg: str = "") -> InlineKeyboardMarkup:
    base_url = WEBAPP_URL or "https://cipherxtrade.duckdns.org"
    sep = "&" if "?" in base_url else "?"
    webapp_target = f"{base_url}{sep}startapp={payload_arg}" if payload_arg else base_url

    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=OPEN_APP_TEXT.get(lang, OPEN_APP_TEXT["es"]),
                    web_app=WebAppInfo(url=webapp_target),
                )
            ],
            [
                InlineKeyboardButton(text="🇪🇸 ES", callback_data="set_lang:es"),
                InlineKeyboardButton(text="🇷🇺 RU", callback_data="set_lang:ru"),
                InlineKeyboardButton(text="🇺🇸 EN", callback_data="set_lang:en"),
            ],
        ]
    )


def build_lang_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🇪🇸 Español", callback_data="set_lang:es"),
                InlineKeyboardButton(text="🇷🇺 Русский", callback_data="set_lang:ru"),
                InlineKeyboardButton(text="🇺🇸 English", callback_data="set_lang:en"),
            ]
        ]
    )


async def send_welcome(message: Message, lang: str, payload_arg: str = "") -> None:
    photo = FSInputFile(resolve_start_image())
    caption = CAPTIONS.get(lang, CAPTIONS["es"])
    keyboard = build_start_keyboard(lang, payload_arg)
    await message.answer_photo(
        photo=photo,
        caption=caption,
        reply_markup=keyboard,
        parse_mode="HTML",
    )


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    payload_arg = ""
    if message.text:
        parts = message.text.split(maxsplit=1)
        if len(parts) == 2 and parts[1].strip():
            payload_arg = parts[1].strip()

    lang = get_user_lang(message)
    await send_welcome(message, lang, payload_arg)


@dp.message(Command("lang"))
async def cmd_lang(message: Message) -> None:
    lang = get_user_lang(message)
    await message.answer(
        LANG_PROMPT_TEXT.get(lang, LANG_PROMPT_TEXT["es"]),
        reply_markup=build_lang_keyboard(),
    )


@dp.callback_query(F.data.startswith("set_lang:"))
async def on_set_lang(callback: CallbackQuery) -> None:
    chosen = callback.data.split(":", maxsplit=1)[1].strip()
    if chosen not in CAPTIONS:
        chosen = "es"

    if callback.from_user:
        USER_LANGS[callback.from_user.id] = chosen

    await callback.answer()
    if callback.message:
        await callback.message.answer(
            LANG_CHANGED_TEXT.get(chosen, LANG_CHANGED_TEXT["es"]),
            parse_mode="HTML",
        )
        await send_welcome(callback.message, chosen)


async def main() -> None:
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
