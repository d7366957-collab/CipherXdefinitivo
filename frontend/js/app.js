/* ==========================================================================
   CipherX Mini App — Lógica de Interfaz, Datos Mock y Modales Informativos
   ========================================================================== */

(() => {
  "use strict";

  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  const mockData = {
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
    activeTab: "home",
    previousMainTab: "home",
    selectedNetwork: "TRC20",
    withdrawFeeUsdt: 0.15,
    minDepositUsdt: 10.0,
    minWithdrawUsdt: 5.0,
    showAllTrades: false,
    showAllReferrals: false,
    showAllTx: false,

    depositAddresses: {
      TON: "UQBx7k9mP2nR5vT8wL1zC4jH6gF3dS9aE2yK7mN4pQ8rV1xZ",
      TRC20: "TXYZ9h7k3s8f4Jm2Qv6L9p1R8t5Wq3eZ1x1234",
      BEP20: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    },

    chartSeries: {
      "1D": [18, 24, 21, 32, 29, 41, 38, 52, 49, 64, 59, 76],
      "1S": [15, 28, 35, 30, 48, 44, 58, 63, 55, 70, 74, 82],
      "1M": [12, 20, 34, 28, 42, 53, 47, 61, 68, 65, 79, 86],
      "1A": [10, 19, 26, 39, 45, 52, 60, 66, 73, 78, 84, 90],
    },

    // Historial de operaciones con Ethereum y apalancamiento/futuros
    trades: [
      { title: "Ethereum LONG", detail: "Apalancamiento 10x · Hoy 14:32", amount: +18.24, pct: +2.36 },
      { title: "Ethereum SHORT", detail: "Futuros · Hoy 12:11", amount: -6.12, pct: -0.84 },
      { title: "Ethereum LONG", detail: "Apalancamiento 10x · Hoy 10:05", amount: +14.37, pct: +3.21 },
      { title: "Ethereum LONG", detail: "Futuros · Hoy 08:47", amount: +9.18, pct: +1.42 },
      { title: "Ethereum LONG", detail: "Apalancamiento 10x · Hoy 06:21", amount: +11.06, pct: +1.96 },
      { title: "Ethereum SHORT", detail: "Futuros · Hoy 03:18", amount: -4.85, pct: -0.62 },
    ],

    referrals: [
      { handle: "@javier23", timeAgo: "Hace 2 horas", bonus: "+1.00 USDT" },
      { handle: "@maria_fox", timeAgo: "Hace 5 horas", bonus: "+1.00 USDT" },
      { handle: "@crypto_jp", timeAgo: "Hace 1 día", bonus: "+1.00 USDT" },
      { handle: "@sofia.trader", timeAgo: "Hace 1 día", bonus: "+1.00 USDT" },
      { handle: "@dani_web3", timeAgo: "Hace 2 días", bonus: "+1.00 USDT" },
    ],
    referralStats: {
      total: 128,
      active: 86,
      commissions: 248.32,
    },

    transactions: [
      { type: "deposit", label: "Depósito", date: "14 abr 2025 · 10:24", amount: +100.0, status: "Completado" },
      { type: "withdraw", label: "Retiro", date: "12 abr 2025 · 18:32", amount: -50.0, status: "Completado" },
      { type: "deposit", label: "Depósito", date: "10 abr 2025 · 09:15", amount: +200.0, status: "Completado" },
      { type: "withdraw", label: "Retiro", date: "6 abr 2025 · 21:47", amount: -30.0, status: "Completado" },
    ],
  };

  const MODAL_CONTENT = {
    terms: {
      title: "Términos y Condiciones",
      html: `
        <h3>1. Aceptación del Servicio</h3>
        <p>Al acceder o utilizar CipherX Mini App, aceptas cumplir estos Términos y Condiciones y toda normativa aplicable relacionada con el uso de herramientas digitales y gestión de capital.</p>
        <h3>2. Riesgos de Mercado</h3>
        <p>La operativa en activos digitales y contratos de futuros conlleva riesgos inherentes de volatilidad. Los rendimientos pasados o las estimaciones operativas no garantizan resultados futuros.</p>
        <h3>3. Depósitos, Retiros y Comisiones</h3>
        <p>El depósito mínimo es de 10 USDT en las redes habilitadas (TON, TRC20, BEP20). El retiro mínimo es de 5 USDT, con una comisión de red de 0.15 USDT y procesamiento automático en lotes de hasta 24 horas.</p>
        <h3>4. Programa de Referidos</h3>
        <p>Los bonos promocionales y comisiones por referidos se rigen por las reglas vigentes en la plataforma y están sujetos a controles antifraude.</p>
      `,
    },
    privacy: {
      title: "Política de Privacidad",
      html: `
        <h3>1. Datos Recopilados</h3>
        <p>CipherX recopila únicamente la información necesaria para operar tu cuenta dentro de Telegram (identificador de usuario, nombre visible y registros de transacciones internas).</p>
        <h3>2. Finalidad del Tratamiento</h3>
        <p>Utilizamos tus datos para acreditar saldos, gestionar depósitos y retiros, calcular comisiones de referidos y mantener la seguridad de la plataforma.</p>
        <h3>3. Protección y Conservación</h3>
        <p>Aplicamos medidas técnicas y organizativas para proteger la integridad de los registros. No vendemos ni cedemos datos personales a terceros no autorizados.</p>
      `,
    },
    about: {
      title: "Sobre Nosotros",
      html: `
        <h3>Nuestra Historia</h3>
        <p>Fundada en 2019, CipherX nació con la misión de democratizar el trading cuantitativo y la gestión estratégica de capital, acercando metodologías algorítmicas y de seguimiento de mercado a usuarios de todo el mundo mediante una interfaz ágil y accesible.</p>
        <h3>Equipo Ejecutivo</h3>
        <div class="exec-card">
          <img src="https://i.pravatar.cc/96?img=12" alt="Daniel Mendoza" class="exec-avatar" />
          <div>
            <div class="exec-name">Daniel Mendoza</div>
            <div class="exec-role">CEO &amp; Co-Fundador</div>
            <div class="exec-bio">Más de 12 años en mercados financieros y arquitectura de productos fintech enfocada en escalabilidad y gestión de riesgo.</div>
          </div>
        </div>
        <div class="exec-card">
          <img src="https://i.pravatar.cc/96?img=33" alt="Valeria Ríos" class="exec-avatar" />
          <div>
            <div class="exec-name">Valeria Ríos</div>
            <div class="exec-role">CTO</div>
            <div class="exec-bio">Especialista en sistemas distribuidos, automatización de ejecución y seguridad de infraestructura en tiempo real.</div>
          </div>
        </div>
        <div class="exec-card">
          <img src="https://i.pravatar.cc/96?img=52" alt="Mateo Salgado" class="exec-avatar" />
          <div>
            <div class="exec-name">Mateo Salgado</div>
            <div class="exec-role">CFO</div>
            <div class="exec-bio">Responsable de tesorería, control de liquidez, auditoría operativa y sostenibilidad financiera del ecosistema.</div>
          </div>
        </div>
      `,
    },
  };

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
    }, 2300);
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

  // ==========================================
  // AQUÍ ESTÁ LA MAGIA: CONEXIÓN CON FASTAPI
  // ==========================================
  async function initTelegramBridge() {
    // 1. Configurar Telegram UI
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (typeof tg.setHeaderColor === "function") tg.setHeaderColor("#071015");
        if (typeof tg.setBackgroundColor === "function") tg.setBackgroundColor("#071015");
      } catch (err) {
        console.warn("Telegram WebApp SDK fallback:", err);
      }
    }

    // 2. Traer datos reales de la Base de Datos
    try {
      const url = new URL('/api/user/me', window.location.origin);
      const headers = {};
      
      if (tg && tg.initData) {
        // Si estamos en Telegram, usamos la autenticación real
        headers['X-Telegram-Init-Data'] = tg.initData;
      } else {
        // Si estamos en el navegador (dev), usamos el ID de prueba
        url.searchParams.append('dev_telegram_id', '78452613');
      }

      const res = await fetch(url.toString(), { headers });
      
      if (res.ok) {
        const data = await res.json();
        console.log("Datos reales recibidos:", data);

        // 3. Actualizamos el mockData con los datos reales del servidor
        mockData.user.name = data.nombre || mockData.user.name;
        mockData.user.id = String(data.telegram_id || mockData.user.id);
        mockData.user.referralLink = `https://t.me/CipherX_Trade_bot?start=${mockData.user.id}`;
        
        mockData.balances.total = parseFloat(data.saldo_total || mockData.balances.total);
        mockData.balances.frozen = parseFloat(data.saldo_congelado || mockData.balances.frozen);
        mockData.balances.withdrawable = parseFloat(data.saldo_retirable || mockData.balances.withdrawable);
        mockData.balances.availableWallet = parseFloat(data.saldo_retirable || mockData.balances.availableWallet);
        
        // 4. Volvemos a pintar la pantalla con los datos actualizados
        renderBalances();
        renderReferralsView();
      } else {
        console.error("Error del servidor:", res.status);
      }
    } catch (error) {
      console.error("Error de conexión con FastAPI:", error);
    }
  }

  function closeThreeDotsMenu() {
    const menu = $("#threeDotsMenu");
    const btn = $("#btnMenu");
    if (menu) {
      menu.classList.remove("open");
      menu.setAttribute("aria-hidden", "true");
    }
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
    }
  }

  function openInfoModal(type) {
    const item = MODAL_CONTENT[type];
    if (!item) return;
    closeThreeDotsMenu();
    $("#infoModalTitle").textContent = item.title;
    $("#infoModalBody").innerHTML = item.html;
    const backdrop = $("#infoModalBackdrop");
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
  }

  function closeInfoModal() {
    const backdrop = $("#infoModalBackdrop");
    if (!backdrop) return;
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
  }

  function navigateTo(targetView) {
    closeThreeDotsMenu();
    const isSubView = targetView === "deposit" || targetView === "withdraw";
    if (!isSubView) {
      mockData.previousMainTab = targetView;
    }
    mockData.activeTab = targetView;

    $$(".view").forEach((viewEl) => {
      viewEl.classList.toggle("active", viewEl.id === `view-${targetView}`);
    });

    const navHighlight = isSubView ? "wallet" : targetView;
    $$(".nav-tab").forEach((tabEl) => {
      tabEl.classList.toggle("active", tabEl.dataset.target === navHighlight);
    });

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
      syncNetworkSelectors(mockData.selectedNetwork);
      renderDepositPanel();
    } else if (targetView === "withdraw") {
      syncNetworkSelectors(mockData.selectedNetwork);
      updateWithdrawCalc();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderChart(timeframe = "1D") {
    const series = mockData.chartSeries[timeframe] || mockData.chartSeries["1D"];
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

    const list = mockData.showAllTrades
      ? mockData.trades
      : mockData.trades.slice(0, 5);

    container.innerHTML = list
      .map((item) => {
        const isPos = item.amount >= 0;
        const sign = isPos ? "+" : "-";
        const absAmt = formatNumber(Math.abs(item.amount), 2);
        const pctStr = `${isPos ? "+" : ""}${item.pct.toFixed(2)}%`;

        return `
          <div class="list-row">
            <div class="row-left">
              <img
                src="img/etereum.webp"
                alt="Ethereum"
                class="trade-eth-img"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';"
              />
              <span class="coin-circle" style="display:none;">Ξ</span>
              <div>
                <div class="row-title">${item.title}</div>
                <div class="row-sub">${item.detail}</div>
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
      btn.textContent = mockData.showAllTrades ? "Ver menos ‹" : "Ver todo >";
    }
  }

  function renderBalances() {
    const hidden = mockData.hiddenBalances;
    const mask = "••••••";

    $("#userName").textContent = `Hola, ${mockData.user.name}`;
    $("#userIdText").textContent = mockData.user.id;

    $("#totalBalanceText").textContent = hidden
      ? `${mask} USDT`
      : `${formatNumber(mockData.balances.total, 2)} USDT`;

    $("#totalDeltaText").textContent = `+${mockData.balances.dailyDeltaPct.toFixed(2)}% hoy`;

    $("#frozenBalanceText").textContent = hidden
      ? mask
      : formatNumber(mockData.balances.frozen, 2);

    $("#withdrawableBalanceText").textContent = hidden
      ? mask
      : formatNumber(mockData.balances.withdrawable, 2);

    $("#dailyYieldText").textContent = `+${mockData.balances.dailyYieldPct.toFixed(2)}%`;

    $("#walletAvailableText").textContent = hidden
      ? `${mask} USDT`
      : `${formatNumber(mockData.balances.availableWallet, 2)} USDT`;

    $("#walletUsdEquivText").textContent = hidden
      ? `≈ ${mask} USD`
      : `≈ ${formatNumber(mockData.balances.availableWallet, 2)} USD`;

    $("#withdrawAvailableText").textContent = hidden
      ? `${mask} USDT`
      : `${formatNumber(mockData.balances.availableWallet, 2)} USDT`;
  }

  function renderReferralsView() {
    $("#referralLinkInput").value = mockData.user.referralLink;
    $("#totalReferralsCount").textContent = String(mockData.referralStats.total);
    $("#activeReferralsCount").textContent = String(mockData.referralStats.active);
    $("#referralCommissionsText").textContent = formatNumber(mockData.referralStats.commissions, 2);

    const list = mockData.showAllReferrals
      ? mockData.referrals
      : mockData.referrals.slice(0, 4);

    $("#referralsListContainer").innerHTML = list
      .map((ref) => `
        <div class="list-row">
          <div class="row-left">
            <span class="coin-circle">@</span>
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
      toggleBtn.textContent = mockData.showAllReferrals ? "Ver menos ‹" : "Ver todos >";
    }
  }

  function syncNetworkSelectors(network) {
    mockData.selectedNetwork = network;
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

    const list = mockData.showAllTx
      ? mockData.transactions
      : mockData.transactions.slice(0, 4);

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
      toggleBtn.textContent = mockData.showAllTx ? "Ver menos ‹" : "Ver todo >";
    }
  }

  function drawQrMatrix(address) {
    const canvas = $("#depositQrCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = 21;
    const cell = Math.floor(canvas.width / size);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    const net = mockData.selectedNetwork;
    const addr = mockData.depositAddresses[net] || mockData.depositAddresses.TRC20;
    $("#depositAddressTitle").textContent = `Dirección de depósito (${net})`;
    $("#depositAddressValue").textContent = addr;
    drawQrMatrix(`${net}:${addr}`);
  }

  function updateWithdrawCalc() {
    const rawVal = parseFloat($("#withdrawAmountInput").value);
    const fee = mockData.withdrawFeeUsdt; // 0.15 USDT

    $("#withdrawFeeText").textContent = `${fee.toFixed(2)} USDT`;

    if (Number.isNaN(rawVal) || rawVal <= 0) {
      $("#withdrawReceiveText").textContent = "0.00 USDT";
      return;
    }

    const netReceive = Math.max(0, rawVal - fee);
    $("#withdrawReceiveText").textContent = `${formatNumber(netReceive, 2)} USDT`;
  }

  function bindEvents() {
    $$(".nav-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        navigateTo(tab.dataset.target);
      });
    });

    $("#btnTopLeft").addEventListener("click", () => {
      closeThreeDotsMenu();
      if (mockData.activeTab === "deposit" || mockData.activeTab === "withdraw") {
        navigateTo(mockData.previousMainTab || "wallet");
      } else if (tg && typeof tg.close === "function") {
        tg.close();
      } else {
        showToast("Vista previa local — sin sesión de Telegram");
      }
    });

    $("#btnRefreshApp").addEventListener("click", () => {
      closeThreeDotsMenu();
      renderBalances();
      renderTradesList();
      renderReferralsView();
      renderTransactionsList();
      showToast("Datos sincronizados");
    });

    $("#btnMenu").addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = $("#threeDotsMenu");
      const isOpen = menu.classList.toggle("open");
      menu.setAttribute("aria-hidden", String(!isOpen));
      $("#btnMenu").setAttribute("aria-expanded", String(isOpen));
    });

    $$("#threeDotsMenu .dropdown-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openInfoModal(btn.dataset.modal);
      });
    });

    $("#closeInfoModalBtn").addEventListener("click", closeInfoModal);
    $("#infoModalBackdrop").addEventListener("click", (e) => {
      if (e.target === $("#infoModalBackdrop")) {
        closeInfoModal();
      }
    });

    document.addEventListener("click", (e) => {
      const menu = $("#threeDotsMenu");
      if (menu && menu.classList.contains("open") && !e.target.closest("#threeDotsMenu") && !e.target.closest("#btnMenu")) {
        closeThreeDotsMenu();
      }
    });

    $("#copyUserIdBtn").addEventListener("click", () => {
      copyToClipboard(mockData.user.id, `ID ${mockData.user.id} copiado`);
    });

    const toggleEye = () => {
      mockData.hiddenBalances = !mockData.hiddenBalances;
      renderBalances();
    };
    $("#toggleBalanceVisibility").addEventListener("click", toggleEye);
    $("#toggleWalletVisibility").addEventListener("click", toggleEye);

    $$(".tf-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".tf-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderChart(btn.dataset.tf);
      });
    });

    $("#openAiInfoBtn").addEventListener("click", () => {
      showToast("Operativa automática en Ethereum · Futuros y Apalancamiento");
    });

    $("#toggleAllTradesBtn").addEventListener("click", () => {
      mockData.showAllTrades = !mockData.showAllTrades;
      renderTradesList();
    });

    $("#toggleAllReferralsBtn").addEventListener("click", () => {
      mockData.showAllReferrals = !mockData.showAllReferrals;
      renderReferralsView();
    });

    $("#toggleAllTxBtn").addEventListener("click", () => {
      mockData.showAllTx = !mockData.showAllTx;
      renderTransactionsList();
    });

    $("#copyReferralLinkBtn").addEventListener("click", () => {
      copyToClipboard(mockData.user.referralLink, "Enlace de referido copiado");
    });

    $("#shareTelegramBtn").addEventListener("click", () => {
      const shareText = encodeURIComponent(
        `Únete a CipherX y comienza con copy trading automatizado: ${mockData.user.referralLink}`
      );
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(mockData.user.referralLink)}&text=${shareText}`;

      if (tg && typeof tg.openTelegramLink === "function") {
        tg.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }
    });

    $("#goToDepositBtn").addEventListener("click", () => navigateTo("deposit"));
    $("#goToWithdrawBtn").addEventListener("click", () => navigateTo("withdraw"));

    ["#walletNetworksGrid", "#depositNetworksGrid", "#withdrawNetworksGrid"].forEach((gridSel) => {
      const grid = $(gridSel);
      if (!grid) return;
      grid.addEventListener("click", (e) => {
        const card = e.target.closest(".network-card");
        if (!card) return;
        syncNetworkSelectors(card.dataset.network);
        if (mockData.activeTab === "deposit") {
          renderDepositPanel();
        }
        showToast(`Red ${card.dataset.network} seleccionada`);
      });
    });

    $("#copyDepositAddressBtn").addEventListener("click", () => {
      const net = mockData.selectedNetwork;
      const addr = mockData.depositAddresses[net];
      copyToClipboard(addr, `Dirección ${net} copiada`);
    });

    $("#confirmDepositBtn").addEventListener("click", () => {
      showToast(`Aviso registrado (${mockData.selectedNetwork}). Mínimo 10 USDT.`);
    });

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
      const maxVal = mockData.balances.availableWallet.toFixed(2);
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
      if (Number.isNaN(amount) || amount < mockData.minWithdrawUsdt) {
        showToast(`El monto mínimo de retiro es ${mockData.minWithdrawUsdt} USDT`);
        return;
      }
      if (amount > mockData.balances.availableWallet) {
        showToast("Saldo disponible insuficiente");
        return;
      }

      mockData.balances.availableWallet = Number(
        (mockData.balances.availableWallet - amount).toFixed(2)
      );
      mockData.balances.withdrawable = Math.max(
        0,
        Number((mockData.balances.withdrawable - amount).toFixed(2))
      );
      mockData.balances.total = Number(
        (mockData.balances.frozen + mockData.balances.withdrawable).toFixed(2)
      );

      mockData.transactions.unshift({
        type: "withdraw",
        label: "Retiro",
        date: "Ahora · En lote (hasta 24h)",
        amount: -amount,
        status: "Pendiente",
      });

      $("#withdrawAddressInput").value = "";
      $("#withdrawAmountInput").value = "";
      updateWithdrawCalc();
      renderBalances();
      renderTransactionsList();

      showToast("Retiro encolado en lote (hasta 24 horas)");
      navigateTo("wallet");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTelegramBridge(); // <-- Ahora esta función es asíncrona y trae los datos reales
    renderBalances();
    renderChart("1D");
    renderTradesList();
    renderReferralsView();
    renderTransactionsList();
    syncNetworkSelectors(mockData.selectedNetwork);
    updateWithdrawCalc();
    bindEvents();
  });
})();
