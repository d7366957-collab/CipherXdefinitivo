const API_BASE_URL = window.CIPHERX_API_URL || "";
const DEV_TEST_TELEGRAM_ID = 78452613;

function getTelegramContext() {
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  const initData = tg && typeof tg.initData === "string" ? tg.initData.trim() : "";
  const isInsideTelegram = Boolean(initData.length > 0);

  return {
    tg,
    initData,
    isInsideTelegram,
    fallbackId: DEV_TEST_TELEGRAM_ID,
  };
}

function formatUsdt(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "0.00 USDT";
  return `${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDT`;
}

function renderBalances(userData) {
  const total =
    userData.saldo_total ??
    (Number(userData.saldo_congelado || 0) + Number(userData.saldo_retirable || 0));
  const congelado = userData.saldo_congelado ?? 0;
  const retirable = userData.saldo_retirable ?? 0;

  const totalEl =
    document.getElementById("saldo-total") ||
    document.querySelector("[data-balance='total']");
  const congeladoEl =
    document.getElementById("saldo-congelado") ||
    document.querySelector("[data-balance='congelado']");
  const retirableEl =
    document.getElementById("saldo-retirable") ||
    document.querySelector("[data-balance='retirable']");

  if (totalEl) totalEl.textContent = formatUsdt(total);
  if (congeladoEl) congeladoEl.textContent = formatUsdt(congelado);
  if (retirableEl) retirableEl.textContent = formatUsdt(retirable);
}

async function loadCurrentUser() {
  const { initData, isInsideTelegram, fallbackId } = getTelegramContext();

  const headers = {
    "Content-Type": "application/json",
  };

  if (isInsideTelegram) {
    headers["X-Telegram-Init-Data"] = initData;
  }

  const endpoint = isInsideTelegram
    ? `${API_BASE_URL}/api/user/me`
    : `${API_BASE_URL}/api/user/me?dev_telegram_id=${fallbackId}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.detail || `Error HTTP ${response.status}`);
    }

    const userData = await response.json();
    renderBalances(userData);
    return userData;
  } catch (error) {
    console.error("Error cargando usuario en CipherX:", error);
    renderBalances({
      saldo_total: 0,
      saldo_congelado: 0,
      saldo_retirable: 0,
    });
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCurrentUser();
});
