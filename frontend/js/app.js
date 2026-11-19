/* ==========================================================================
   CipherX Mini App — Lógica de Interfaz y Datos Mock (Fase 1)
   ========================================================================== */

(() => {
  "use strict";

  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  // ------------------------------------------------------------------------
  // Datos Mock iniciales (coherentes con las reglas de negocio CipherX)
  // ------------------------------------------------------------------------
  const MOCK_STATE = {
    user: {
      name: "Alex",
      id: "78452613",
      referralLink: "https://t.me/CipherX_bot?start=78452613",
    },
    balances: {
      total: 1248.32,
      frozen: 320.00,
      withdrawable: 928.32,
      availableWallet: 1248.32,
      dailyYieldPct: 12.68,
      dailyDeltaPct: 12.68,
    },
    hiddenBalances: false,
    activeTab: "home", // 'home' | 'referrals' | 'wallet' | 'deposit' | 'withdraw'
    previousMainTab: "home",
    selectedNetwork: "TRC20",
    withdrawFeeUsdt: 1.0,
    minDepositUsdt: 10.0,
    minWithdrawUsdt: 5.0,
    showAllTrades: false,
    showAllReferrals: false,
    showAllTx: false,

    // Direcciones hijas de ejemplo por red
    depositAddresses: {
      TON: "UQBx7k9mP2nR5vT8wL1zC4jH6gF3dS9aE2yK7mN4pQ8rV1xZ",
      TRC20: "TXYZ9h7k3s8f4Jm2Qv6L9p1R8t5Wq3eZ1x1234",
      BEP20: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    },

    // Series de gráfico por temporalidad
    chartSeries: {
      "1D": [18, 24, 21, 32, 29, 41, 38, 52, 49, 64, 59, 76],
      "1S": [15, 28, 35, 30, 48, 44, 58, 63, 55, 70, 74, 82],
      "1M": [12, 20, 34, 28, 42, 53, 47, 61, 68, 65, 79, 86],
      "1A": [10, 19, 26, 39, 45, 52, 60, 66, 73, 78, 84, 90],
    },

    // Operaciones automáticas del equipo (80% ganadas / 20% perdidas)
    trades: [
      { pair: "BTC", time: "Hoy 14:32", amount: +18.24, pct: +2.36 },
      { pair: "ETH", time: "Hoy 12:11", amount: -6.12, pct: -0.84 },
      { pair: "SOL", time: "Hoy 10:05", amount: +14.37, pct: +3.21 },
      { pair: "BNB", time: "Hoy 08:47", amount: +9.18, pct: +1.42 },
      { pair: "BTC", time: "Hoy 06:21", amount: +11.06, pct: +1.96 },
      { pair: "ETH", time: "Hoy 03:18", amount: -4.85, pct: -0.62 },
      { pair: "SOL", time: "Ayer 22:50", amount: +8.40, pct: +1.75 },
      { pair: "BNB", time: "Ayer 19:14", amount: +6.95, pct: +1.18 },
    ],

    // Referidos recientes (+1.00 USDT bono saldo congelado)
    referrals: [
      { handle: "@javier23", timeAgo: "Hace 2 horas", bonus: "+1.00 USDT" },
      { handle: "@maria_fox", timeAgo: "Hace 5 horas", bonus: "+1.00 USDT" },
      { handle: "@crypto_jp", timeAgo: "Hace 1 día", bonus: "+1.00 USDT" },
      { handle: "@sofia.trader", timeAgo: "Hace 1 día", bonus: "+1.00 USDT" },
      { handle: "@dani_web3", timeAgo: "Hace 2 días", bonus: "+1.00 USDT" },
      { handle: "@carlos_fx", timeAgo: "Hace 3 días", bonus: "+1.00 USDT" },
    ],
    referralStats: {
      total: 128,
      active: 86,
      commissions: 248.32,
    },

    // Historial de transacciones de billetera
    transactions: [
      { type: "deposit", label: "Depósito", date: "14 abr 2025 · 10:24", amount: +100.0, status: "Completado" },
      { type: "withdraw", label: "Retiro", date: "12 abr 2025 · 18:32", amount: -50.0, status: "Completado" },
      { type: "deposit", label: "Depósito", date: "10 abr 2025 · 09:15", amount: +200.0, status: "Completado" },
      { type: "withdraw", label: "Retiro", date: "6 abr 2025 · 21:47", amount: -30.0, status: "Completado" },
    ],
  };

  // ------------------------------------------------------------------------
  // Helpers de formato y DOM
  // ------------------------------------------------------------------------
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function formatNumber(num, decimals = 2) {
    return Number(num).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function showToast(message) {
    const toast = $("#toastBanner");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }

  async function copyToClipboard(text, successMsg = "Copiado al portapapeles") {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      showToast(successMsg);
    } catch {
      showToast("No se pudo copiar automáticamente");
    }
  }

  // ------------------------------------------------------------------------
  // Inicialización Telegram WebApp SDK
  // ------------------------------------------------------------------------
  function initTelegramBridge() {
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      if (typeof tg.setHeaderColor === "function") {
        tg.setHeaderColor("#071015");
      }
      if (typeof tg.setBackgroundColor === "function") {
        tg.setBackgroundColor("#071015");
      }

      const tgUser = tg.initDataUnsafe && tg.initDataUnsafe.user;
      if (tgUser) {
        if (tgUser.first_name) {
          MOCK_STATE.user.name = tgUser.first_name;
        }
        if (tgUser.id) {
          MOCK_STATE.user.id = String(tgUser.id);
          MOCK_STATE.user.referralLink = `https://t.me/CipherX_bot?start=${tgUser.id}`;
        }
      }
    } catch (err) {
      console.warn("Telegram WebApp SDK fallback:", err);
    }
  }

  // ------------------------------------------------------------------------
  // Navegación entre pantallas y subvistas
  // ------------------------------------------------------------------------
  function navigateTo(targetView) {
    const isSubView = targetView === "deposit" || targetView === "withdraw";
    if (!isSubView) {
      MOCK_STATE.previousMainTab = targetView;
    }
    MOCK_STATE.activeTab = targetView;

    // Mostrar vista correspondiente
    $$(".view").forEach((viewEl) => {
      viewEl.classList.toggle("active", viewEl.id === `view-${targetView}`);
    });

    // Actualizar barra inferior (resalta Billetera cuando estás en Depositar/Retirar)
    const navHighlight = isSubView ? "wallet" : targetView;
    $$(".nav-tab").forEach((tabEl) => {
      tabEl.classList.toggle("active", tabEl.dataset.target === navHighlight);
    });

    // Actualizar botón superior izquierdo (< Volver en subvistas, × Cerrar en principales)
    const topLeftIcon = $("#topLeftIcon");
    const topLeftText = $("#topLeftText");
    if (isSubView) {
      topLeftIcon.textContent = "‹";
      topLeftText.textContent = "Volver";
    } else {
      topLeftIcon.textContent = "×";
      topLeftText.textContent = "Cerrar";
    }

    if (targetView === "deposit") {
      syncNetworkSelectors(MOCK_STATE.selectedNetwork);
      renderDepositPanel();
    } else if (targetView === "withdraw") {
      syncNetworkSelectors(MOCK_STATE.selectedNetwork);
      updateWithdrawCalc();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ------------------------------------------------------------------------
  // Renderizado: Inicio
  // ------------------------------------------------------------------------
  function renderChart(timeframe = "1D") {
    const series = MOCK_STATE.chartSeries[timeframe] || MOCK_STATE.chartSeries["1D"];
    const width = 360;
    const height = 84;
    const padX = 4;
    const padY = 8;

    const minVal = Math.min(...series);
    const maxVal = Math.max(...series);
    const span = maxVal - minVal || 1;

    const points = series.map((val, idx) => {
      const x = padX + (idx / (series.length - 1)) * (width - padX * 2);
      const norm = (val - minVal) / span;
      const y = height - padY - norm * (height - padY * 2);
      return [Number(x.toFixed(1)), Number(y.toFixed(1))];
    });

    const lineD = points
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
      .join(" ");

    const areaD = `${lineD} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`;

    const lineEl = $("#chartLinePath");
    const areaEl = $("#chartAreaPath");
    if (lineEl) lineEl.setAttribute("d", lineD);
    if (areaEl) areaEl.setAttribute("d", areaD);
  }

  function renderTradesList() {
    const container = $("#tradesListContainer");
    if (!container) return;

    const list = MOCK_STATE.showAllTrades
      ? MOCK_STATE.trades
      : MOCK_STATE.trades.slice(0, 6);

    const coinSymbolMap = {
      BTC: { cls: "coin-btc", glyph: "₿" },
      ETH: { cls: "coin-eth", glyph: "◆" },
      SOL: { cls: "coin-sol", glyph: "≡" },
      BNB: { cls: "coin-bnb", glyph: "❖" },
    };

    container.innerHTML = list
      .map((item) => {
        const isPos = item.amount >= 0;
        const coin = coinSymbolMap[item.pair] || { cls: "coin-btc", glyph: "•" };
        const sign = isPos ? "+" : "-";
        const absAmt = formatNumber(Math.abs(item.amount), 2);
        const pctStr = `${isPos ? "+" : ""}${item.pct.toFixed(2)}%`;

        return `
          <div class="list-row">
            <div class="row-left">
              <span class="coin-circle ${coin.cls}">${coin.glyph}</span>
              <div>
                <div class="row-title">${item.pair}</div>
                <div class="row-sub">${item.time}</div>
              </div>
            </div>
            <div class="row-right">
              <div>
                <div class="row-amount ${isPos ? "positive" : "negative"}">${sign}${absAmt} USDT</div>
                <div class="row-pct ${isPos ? "positive" : "negative"}">${pctStr}</div>
              </div>
              <span class="trend-arrow ${isPos ? "positive" : "negative"}">${isPos ? "⌃" : "⌄"}</span>
            </div>
          </div>
        `;
      })
      .join("");

    const btn = $("#toggleAllTradesBtn");
    if (btn) {
      btn.textContent = MOCK_STATE.showAllTrades ? "Ver menos ‹" : "Ver todo >";
    }
  }

  function renderBalances() {
    const hidden = MOCK_STATE.hiddenBalances;
    const mask = "••••••";

    $("#userName").textContent = `Hola, ${MOCK_STATE.user.name}`;
    $("#userIdText").textContent = MOCK_STATE.user.id;

    $("#totalBalanceText").textContent = hidden
      ? `${mask} USDT`
      : `${formatNumber(MOCK_STATE.balances.total, 2)} USDT`;

    $("#totalDeltaText").textContent = `+${MOCK_STATE.balances.dailyDeltaPct.toFixed(2)}% hoy`;

    $("#frozenBalanceText").textContent = hidden
      ? mask
      : formatNumber(MOCK_STATE.balances.frozen, 2);

    $("#withdrawableBalanceText").textContent = hidden
      ? mask
      : formatNumber(MOCK_STATE.balances.withdrawable, 2);

    $("#dailyYieldText").textContent = `+${MOCK_STATE.balances.dailyYieldPct.toFixed(2)}%`;

    $("#walletAvailableText").textContent = hidden
      ? `${mask} USDT`
      : `${formatNumber(MOCK_STATE.balances.availableWallet, 2)} USDT`;

    $("#walletUsdEquivText").textContent = hidden
      ? `≈ ${mask} USD`
      : `≈ ${formatNumber(MOCK_STATE.balances.availableWallet, 2)} USD`;

    $("#withdrawAvailableText").textContent = hidden
      ? `${mask} USDT`
      : `${formatNumber(MOCK_STATE.balances.availableWallet, 2)} USDT`;
  }

  // ------------------------------------------------------------------------
  // Renderizado: Referidos
  // ------------------------------------------------------------------------
  function renderReferralsView() {
    $("#referralLinkInput").value = MOCK_STATE.user.referralLink;
    $("#totalReferralsCount").textContent = String(MOCK_STATE.referralStats.total);
    $("#activeReferralsCount").textContent = String(MOCK_STATE.referralStats.active);
    $("#referralCommissionsText").textContent = formatNumber(MOCK_STATE.referralStats.commissions, 2);

    const list = MOCK_STATE.showAllReferrals
      ? MOCK_STATE.referrals
      : MOCK_STATE.referrals.slice(0, 5);

    $("#referralsListContainer").innerHTML = list
      .map((ref) => `
        <div class="list-row">
          <div class="row-left">
            <span class="coin-circle coin-eth">@</span>
            <div>
              <div class="ref-handle">${ref.handle}</div>
              <div class="row-sub">${ref.timeAgo}</div>
            </div>
          </div>
          <div class="ref-bonus">${ref.bonus}</div>
        </div>
      `)
      .join("");

    const toggleBtn = $("#toggleAllReferralsBtn");
    if (toggleBtn) {
      toggleBtn.textContent = MOCK_STATE.showAllReferrals ? "Ver menos ‹" : "Ver todos >";
    }
  }

  // ------------------------------------------------------------------------
  // Renderizado: Billetera, Depósito (QR) y Retiro
  // ------------------------------------------------------------------------
  function syncNetworkSelectors(network) {
    MOCK_STATE.selectedNetwork = network;
    ["#walletNetworksGrid", "#depositNetworksGrid", "#withdrawNetworksGrid"].forEach((gridSel) => {
      const grid = $(gridSel);
      if (!grid) return;
      grid.querySelectorAll(".network-card").forEach((card) => {
        card.classList.toggle("active", card.dataset.network === network);
      });
    });
  }

  function renderTransactionsList() {
    const container = $("#txListContainer");
    if (!container) return;

    const list = MOCK_STATE.showAllTx
      ? MOCK_STATE.transactions
      : MOCK_STATE.transactions.slice(0, 4);

    container.innerHTML = list
      .map((tx) => {
        const isDeposit = tx.type === "deposit";
        const sign = tx.amount >= 0 ? "+" : "-";
        const absAmt = formatNumber(Math.abs(tx.amount), 2);
        const pillClass = tx.status === "Completado" ? "tx-status-pill" : "tx-status-pill pending";

        return `
          <div class="list-row">
            <div class="row-left">
              <span class="tx-arrow-circle ${isDeposit ? "tx-in" : "tx-out"}">${isDeposit ? "↓" : "↑"}</span>
              <div>
                <div class="row-title">${tx.label}</div>
                <div class="row-sub">${tx.date}</div>
              </div>
            </div>
            <div class="row-right">
              <div>
                <div class="row-amount ${isDeposit ? "positive" : "negative"}">${sign}${absAmt} USDT</div>
                <span class="${pillClass}">${tx.status}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    const toggleBtn = $("#toggleAllTxBtn");
    if (toggleBtn) {
      toggleBtn.textContent = MOCK_STATE.showAllTx ? "Ver menos ‹" : "Ver todo >";
    }
  }

  // Generador de matriz QR visual limpio en Canvas a partir de la dirección
  function drawQrMatrix(address) {
    const canvas = $("#depositQrCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = 21;
    const cell = Math.floor(canvas.width / size);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Semilla determinista basada en la dirección
    let seed = 0;
    for (let i = 0; i < address.length; i++) {
      seed = (seed * 31 + address.charCodeAt(i)) >>> 0;
    }

    const isFinder = (r, c) =>
      (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

    const drawFinderPattern = (ox, oy) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const border = r === 0 || r === 6 || c === 0 || c === 6;
          const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          ctx.fillStyle = border || inner ? "#09151b" : "#ffffff";
          ctx.fillRect((ox + c) * cell, (oy + r) * cell, cell, cell);
        }
      }
    };

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isFinder(r, c)) continue;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const dark = ((seed >>> 24) & 1) === 1;
        ctx.fillStyle = dark ? "#09151b" : "#ffffff";
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }

    drawFinderPattern(0, 0);
    drawFinderPattern(size - 7, 0);
    drawFinderPattern(0, size - 7);
  }

  function renderDepositPanel() {
    const net = MOCK_STATE.selectedNetwork;
    const addr = MOCK_STATE.depositAddresses[net] || MOCK_STATE.depositAddresses.TRC20;
    $("#depositAddressTitle").textContent = `Dirección de depósito (${net})`;
    $("#depositAddressValue").textContent = addr;
    drawQrMatrix(`${net}:${addr}`);
  }

  function updateWithdrawCalc() {
    const rawVal = parseFloat($("#withdrawAmountInput").value);
    const fee = MOCK_STATE.withdrawFeeUsdt;

    if (Number.isNaN(rawVal) || rawVal <= 0) {
      $("#withdrawReceiveText").textContent = "0.00 USDT";
      $("#withdrawFeeText").textContent = `${formatNumber(fee, 0)} USDT`;
      return;
    }

    const netReceive = Math.max(0, rawVal - fee);
    $("#withdrawReceiveText").textContent = `${formatNumber(netReceive, 2)} USDT`;
    $("#withdrawFeeText").textContent = `${formatNumber(fee, 0)} USDT`;
  }

  // ------------------------------------------------------------------------
  // Bind de Eventos
  // ------------------------------------------------------------------------
  function bindEvents() {
    // Barra inferior
    $$(".nav-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        navigateTo(tab.dataset.target);
      });
    });

    // Botón superior izquierdo (Cerrar en raíz / Volver en subvistas)
    $("#btnTopLeft").addEventListener("click", () => {
      if (MOCK_STATE.activeTab === "deposit" || MOCK_STATE.activeTab === "withdraw") {
        navigateTo(MOCK_STATE.previousMainTab || "wallet");
      } else if (tg && typeof tg.close === "function") {
        tg.close();
      } else {
        showToast("Vista previa local — sin sesión de Telegram");
      }
    });

    $("#btnRefreshApp").addEventListener("click", () => {
      renderBalances();
      renderTradesList();
      renderReferralsView();
      renderTransactionsList();
      showToast("Datos mock sincronizados");
    });

    $("#btnMoreInfo").addEventListener("click", () => {
      showToast("CipherX v1.0 · Fase 1 (UI Mock)");
    });

    // Copiar ID de usuario
    $("#copyUserIdBtn").addEventListener("click", () => {
      copyToClipboard(MOCK_STATE.user.id, `ID ${MOCK_STATE.user.id} copiado`);
    });

    // Ocultar / mostrar saldos
    const toggleEye = () => {
      MOCK_STATE.hiddenBalances = !MOCK_STATE.hiddenBalances;
      renderBalances();
    };
    $("#toggleBalanceVisibility").addEventListener("click", toggleEye);
    $("#toggleWalletVisibility").addEventListener("click", toggleEye);

    // Temporalidad del gráfico
    $$(".tf-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".tf-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderChart(btn.dataset.tf);
      });
    });

    // Banner IA -> lleva a Billetera o muestra info
    $("#openAiInfoBtn").addEventListener("click", () => {
      showToast("Estrategia automática activa (80/20 · 0.6%–0.9% diario)");
    });

    // Ver todo / ver menos en listas
    $("#toggleAllTradesBtn").addEventListener("click", () => {
      MOCK_STATE.showAllTrades = !MOCK_STATE.showAllTrades;
      renderTradesList();
    });

    $("#toggleAllReferralsBtn").addEventListener("click", () => {
      MOCK_STATE.showAllReferrals = !MOCK_STATE.showAllReferrals;
      renderReferralsView();
    });

    $("#toggleAllTxBtn").addEventListener("click", () => {
      MOCK_STATE.showAllTx = !MOCK_STATE.showAllTx;
      renderTransactionsList();
    });

    // Referidos: copiar enlace y compartir en Telegram
    $("#copyReferralLinkBtn").addEventListener("click", () => {
      copyToClipboard(MOCK_STATE.user.referralLink, "Enlace de referido copiado");
    });

    $("#shareTelegramBtn").addEventListener("click", () => {
      const shareText = encodeURIComponent(
        `Únete a CipherX y comienza con copy trading automatizado: ${MOCK_STATE.user.referralLink}`
      );
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(MOCK_STATE.user.referralLink)}&text=${shareText}`;

      if (tg && typeof tg.openTelegramLink === "function") {
        tg.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }
    });

    // Billetera: ir a Depositar / Retirar
    $("#goToDepositBtn").addEventListener("click", () => navigateTo("deposit"));
    $("#goToWithdrawBtn").addEventListener("click", () => navigateTo("withdraw"));

    // Selección de red en Billetera, Depósito y Retiro
    ["#walletNetworksGrid", "#depositNetworksGrid", "#withdrawNetworksGrid"].forEach((gridSel) => {
      const grid = $(gridSel);
      if (!grid) return;
      grid.addEventListener("click", (e) => {
        const card = e.target.closest(".network-card");
        if (!card) return;
        syncNetworkSelectors(card.dataset.network);
        if (MOCK_STATE.activeTab === "deposit") {
          renderDepositPanel();
        }
        showToast(`Red ${card.dataset.network} seleccionada`);
      });
    });

    // Depósito: copiar dirección y confirmar
    $("#copyDepositAddressBtn").addEventListener("click", () => {
      const net = MOCK_STATE.selectedNetwork;
      const addr = MOCK_STATE.depositAddresses[net];
      copyToClipboard(addr, `Dirección ${net} copiada`);
    });

    $("#confirmDepositBtn").addEventListener("click", () => {
      showToast(`Aviso registrado (${MOCK_STATE.selectedNetwork}). Mínimo 10 USDT.`);
    });

    // Retiro: pegar dirección, botón Máximo, cálculo en vivo y envío mock
    $("#pasteAddressBtn").addEventListener("click", async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clip = await navigator.clipboard.readText();
          if (clip) {
            $("#withdrawAddressInput").value = clip.trim();
            showToast("Dirección pegada");
            return;
          }
        }
        showToast("Escribe o pega tu dirección manualmente");
      } catch {
        showToast("Escribe o pega tu dirección manualmente");
      }
    });

    $("#withdrawMaxBtn").addEventListener("click", () => {
      const maxVal = MOCK_STATE.balances.availableWallet.toFixed(2);
      $("#withdrawAmountInput").value = maxVal;
      updateWithdrawCalc();
    });

    $("#withdrawAmountInput").addEventListener("input", updateWithdrawCalc);

    $("#submitWithdrawBtn").addEventListener("click", () => {
      const addr = $("#withdrawAddressInput").value.trim();
      const amount = parseFloat($("#withdrawAmountInput").value);

      if (!addr || addr.length < 8) {
        showToast("Ingresa una dirección de billetera válida");
        return;
      }
      if (Number.isNaN(amount) || amount < MOCK_STATE.minWithdrawUsdt) {
        showToast(`El monto mínimo de retiro es ${MOCK_STATE.minWithdrawUsdt} USDT`);
        return;
      }
      if (amount > MOCK_STATE.balances.availableWallet) {
        showToast("Saldo disponible insuficiente");
        return;
      }

      // Simulación local en Fase 1
      MOCK_STATE.balances.availableWallet = Number(
        (MOCK_STATE.balances.availableWallet - amount).toFixed(2)
      );
      MOCK_STATE.balances.withdrawable = Math.max(
        0,
        Number((MOCK_STATE.balances.withdrawable - amount).toFixed(2))
      );
      MOCK_STATE.balances.total = Number(
        (MOCK_STATE.balances.frozen + MOCK_STATE.balances.withdrawable).toFixed(2)
      );

      MOCK_STATE.transactions.unshift({
        type: "withdraw",
        label: "Retiro",
        date: "Ahora · Revisión manual",
        amount: -amount,
        status: "Pendiente",
      });

      $("#withdrawAddressInput").value = "";
      $("#withdrawAmountInput").value = "";
      updateWithdrawCalc();
      renderBalances();
      renderTransactionsList();

      showToast("Solicitud de retiro enviada (revisión hasta 24h)");
      navigateTo("wallet");
    });
  }

  // ------------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    initTelegramBridge();
    renderBalances();
    renderChart("1D");
    renderTradesList();
    renderReferralsView();
    renderTransactionsList();
    syncNetworkSelectors(MOCK_STATE.selectedNetwork);
    updateWithdrawCalc();
    bindEvents();
  });
})();
