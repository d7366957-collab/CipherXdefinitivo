/* ==========================================================================
   CipherX Mini App — Lógica de Interfaz, Sincronización Real y Modales
   ========================================================================== */

(() => {
  "use strict";

  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  const LANG_STORAGE_KEY = "cipherx_lang";
  const SUPPORT_URL = "https://t.me/YordanSoporte";
  const INVESTOR_ONLY_WITHDRAW_MSG =
    "Retiro habilitado solo a inversores (usuarios con almenos un depósito)";

  const I18N = {
    es: {
      "app.title": "CipherX — Mini App",
      "top.closeOrBack": "Cerrar o volver",
      "top.close": "Cerrar",
      "top.back": "Volver",
      "top.miniApp": "mini app",
      "top.language": "Idioma",
      "top.menu": "Menú",
      "menu.terms": "Términos y Condiciones",
      "menu.privacy": "Política de Privacidad",
      "menu.about": "Sobre Nosotros",
      "nav.main": "Navegación principal",
      "nav.home": "Inicio",
      "nav.referrals": "Referidos",
      "nav.wallet": "Billetera",
      "home.greeting": "Hola, {name}",
      "home.verified": "Cuenta verificada",
      "home.copyId": "Copiar ID",
      "home.regulationText": "Regulado por estándares internacionales KYC/AML y FinCEN.",
      "home.totalBalance": "Saldo Total",
      "home.toggleBalance": "Ocultar o mostrar saldos",
      "home.timeframe": "Temporalidad del gráfico",
      "home.todaySuffix": "hoy",
      "home.frozenBalance": "Saldo Congelado",
      "home.withdrawableBalance": "Saldo Retirable",
      "home.dailyYield": "Rendimiento Diario",
      "home.aiBannerTitle": "Nuestro equipo opera por ti",
      "home.aiBannerSub": "Inteligencia. Estrategia. Resultados.",
      "home.teamTradesTitle": "Historial de operaciones del equipo",
      "home.noTrades": "Las operaciones y el rendimiento generado por nuestro equipo para usted se actualizan cada 24 horas después de su registro",
      "home.tradeTitle": "Ethereum {side}",
      "home.tradeDetail": "Apalancamiento {lev}x · {date}",
      "referrals.title": "Referidos",
      "referrals.subtitle": "Invita, gana, crece juntos",
      "referrals.microNote": "Más personas. Más oportunidades.",
      "referrals.bonusLabel": "Bono",
      "referrals.bonusDesc": "1 USDT en saldo congelado por cada referido que se registre.",
      "referrals.commissionLabel": "Comisión",
      "referrals.commissionDesc": "12% de comisión sobre lo que invierta tu referido.",
      "referrals.yourLink": "Tu enlace de referido",
      "referrals.copyLink": "Copiar enlace de referido",
      "referrals.shareTelegram": "Compartir en Telegram",
      "referrals.totalReferrals": "Total Referidos",
      "referrals.activeReferrals": "Activos",
      "referrals.commissions": "Comisiones",
      "referrals.recentTitle": "Últimos referidos",
      "referrals.noReferrals": "No hay referidos aún",
      "referrals.shareText": "Únete a CipherX y comienza con copy trading automatizado: {link}",
      "wallet.title": "Billetera",
      "wallet.subtitle": "Tu libertad, en tus manos",
      "wallet.availableBalance": "Saldo Disponible (Retirable)",
      "wallet.toggleBalance": "Mostrar u ocultar saldo disponible",
      "wallet.deposit": "Depositar",
      "wallet.withdraw": "Retirar",
      "wallet.networksTitle": "Redes disponibles",
      "wallet.minWithdraw": "Min. retiro: <strong>5 USDT</strong>",
      "wallet.minDeposit": "Min. depósito: <strong>10 USDT</strong>",
      "wallet.txHistoryTitle": "Historial de transacciones",
      "wallet.noTx": "No hay transacciones aún",
      "tx.deposit": "Depósito",
      "tx.withdraw": "Retiro",
      "tx.commission": "Comisión",
      "tx.bonus": "Bono",
      "tx.completed": "Completado",
      "tx.pending": "Pendiente",
      "tx.rejected": "Rechazado",
      "tx.batchNow": "Ahora · En lote (hasta 24h)",
      "deposit.ariaLabel": "Depositar USDT",
      "deposit.title": "Depositar USDT",
      "deposit.selectNetwork": "Selecciona la red de depósito",
      "deposit.qrAria": "Código QR de depósito",
      "deposit.addressTitle": "Dirección de depósito ({net})",
      "deposit.copyAddress": "Copiar Dirección",
      "deposit.noticeLine1": "Envía solo USDT por la red seleccionada.",
      "deposit.noticeLine2": "Mínimo 10 USDT.",
      "deposit.promoTitle": "Depósitos seguros,<br />un futuro más grande",
      "deposit.confirmBtn": "Ya he realizado el depósito",
      "deposit.confirmToast": "Aviso registrado ({net}). Mínimo 10 USDT.",
      "withdraw.ariaLabel": "Retirar USDT",
      "withdraw.title": "Retirar USDT",
      "withdraw.subtitle": "Completa la información para tu retiro",
      "withdraw.availableLabel": "Saldo Disponible",
      "withdraw.addressLabel": "Dirección de Billetera",
      "withdraw.addressPlaceholder": "Ingresa la dirección de tu billetera",
      "withdraw.pasteAddress": "Pegar dirección",
      "withdraw.selectNetwork": "Selecciona la red",
      "withdraw.amountLabel": "Monto a Retirar",
      "withdraw.amountPlaceholder": "Ingresa el monto en USDT",
      "withdraw.maxBtn": "Máximo",
      "withdraw.receiveLabel": "Monto a recibir",
      "withdraw.feeLabel": "Comisión de red",
      "withdraw.note": "Mínimo de retiro: 5 USDT. Retiro automático en lotes. Puede tardar hasta 24 horas.",
      "withdraw.submitBtn": "Solicitar Retiro",
      "common.viewAll": "Ver todo >",
      "common.viewLess": "Ver menos ‹",
      "modal.info": "Información",
      "toast.copied": "Copiado al portapapeles",
      "toast.copyError": "No se pudo copiar automáticamente",
      "toast.idCopied": "ID {id} copiado",
      "toast.linkCopied": "Enlace de referido copiado",
      "toast.addrCopied": "Dirección {net} copiada",
      "toast.netSelected": "Red {net} seleccionada",
      "toast.synced": "Datos sincronizados",
      "toast.langChanged": "Idioma: {lang}",
      "toast.previewNoTg": "Vista previa local — sin sesión de Telegram",
      "toast.aiInfo": "Operativa automática en Ethereum · Futuros y Apalancamiento",
      "toast.pasteHint": "Escribe o pega tu dirección manualmente",
      "toast.pasted": "Dirección pegada",
      "toast.invalidAddr": "Ingresa una dirección de billetera válida",
      "toast.minWithdraw": "El monto mínimo de retiro es {min} USDT",
      "toast.insufficient": "Saldo disponible insuficiente",
      "toast.withdrawQueued": "Retiro encolado en lote (hasta 24 horas)",
      "date.recent": "Reciente",
      "locale": "es-ES",
      "langName": "Español",
    },
    ru: {
      "app.title": "CipherX — Mini App",
      "top.closeOrBack": "Закрыть или назад",
      "top.close": "Закрыть",
      "top.back": "Назад",
      "top.miniApp": "mini app",
      "top.language": "Язык",
      "top.menu": "Меню",
      "menu.terms": "Условия использования",
      "menu.privacy": "Политика конфиденциальности",
      "menu.about": "О нас",
      "nav.main": "Основная навигация",
      "nav.home": "Главная",
      "nav.referrals": "Рефералы",
      "nav.wallet": "Кошелёк",
      "home.greeting": "Привет, {name}",
      "home.verified": "Аккаунт подтверждён",
      "home.copyId": "Копировать ID",
      "home.regulationText": "Регулируется международными стандартами KYC/AML и FinCEN.",
      "home.totalBalance": "Общий баланс",
      "home.toggleBalance": "Скрыть или показать баланс",
      "home.timeframe": "Таймфрейм графика",
      "home.todaySuffix": "сегодня",
      "home.frozenBalance": "Замороженный баланс",
      "home.withdrawableBalance": "Доступно к выводу",
      "home.dailyYield": "Дневная доходность",
      "home.aiBannerTitle": "Наша команда торгует за вас",
      "home.aiBannerSub": "Интеллект. Стратегия. Результат.",
      "home.teamTradesTitle": "История сделок команды",
      "home.noTrades": "Сделки и доходность, созданные нашей командой для вас, обновляются каждые 24 часа после вашей регистрации",
      "home.tradeTitle": "Ethereum {side}",
      "home.tradeDetail": "Плечо {lev}x · {date}",
      "referrals.title": "Рефералы",
      "referrals.subtitle": "Приглашайте, зарабатывайте, растите вместе",
      "referrals.microNote": "Больше людей. Больше возможностей.",
      "referrals.bonusLabel": "Бонус",
      "referrals.bonusDesc": "1 USDT на замороженный баланс за каждого зарегистрированного реферала.",
      "referrals.commissionLabel": "Комиссия",
      "referrals.commissionDesc": "12% комиссии от суммы депозита вашего реферала.",
      "referrals.yourLink": "Ваша реферальная ссылка",
      "referrals.copyLink": "Копировать реферальную ссылку",
      "referrals.shareTelegram": "Поделиться в Telegram",
      "referrals.totalReferrals": "Всего рефералов",
      "referrals.activeReferrals": "Активные",
      "referrals.commissions": "Комиссии",
      "referrals.recentTitle": "Последние рефералы",
      "referrals.noReferrals": "Рефералов пока нет",
      "referrals.shareText": "Присоединяйтесь к CipherX и начните автоматический копитрейдинг: {link}",
      "wallet.title": "Кошелёк",
      "wallet.subtitle": "Ваша свобода в ваших руках",
      "wallet.availableBalance": "Доступный баланс (к выводу)",
      "wallet.toggleBalance": "Показать или скрыть доступный баланс",
      "wallet.deposit": "Пополнить",
      "wallet.withdraw": "Вывести",
      "wallet.networksTitle": "Доступные сети",
      "wallet.minWithdraw": "Мин. вывод: <strong>5 USDT</strong>",
      "wallet.minDeposit": "Мин. депозит: <strong>10 USDT</strong>",
      "wallet.txHistoryTitle": "История транзакций",
      "wallet.noTx": "Транзакций пока нет",
      "tx.deposit": "Пополнение",
      "tx.withdraw": "Вывод",
      "tx.commission": "Комиссия",
      "tx.bonus": "Бонус",
      "tx.completed": "Завершено",
      "tx.pending": "В ожидании",
      "tx.rejected": "Отклонено",
      "tx.batchNow": "Сейчас · Пакетно (до 24 ч)",
      "deposit.ariaLabel": "Пополнить USDT",
      "deposit.title": "Пополнить USDT",
      "deposit.selectNetwork": "Выберите сеть пополнения",
      "deposit.qrAria": "QR-код пополнения",
      "deposit.addressTitle": "Адрес пополнения ({net})",
      "deposit.copyAddress": "Копировать адрес",
      "deposit.noticeLine1": "Отправляйте только USDT в выбранной сети.",
      "deposit.noticeLine2": "Минимум 10 USDT.",
      "deposit.promoTitle": "Безопасные депозиты,<br />большее будущее",
      "deposit.confirmBtn": "Я уже совершил депозит",
      "deposit.confirmToast": "Уведомление отправлено ({net}). Минимум 10 USDT.",
      "withdraw.ariaLabel": "Вывести USDT",
      "withdraw.title": "Вывести USDT",
      "withdraw.subtitle": "Заполните данные для вывода средств",
      "withdraw.availableLabel": "Доступный баланс",
      "withdraw.addressLabel": "Адрес кошелька",
      "withdraw.addressPlaceholder": "Введите адрес вашего кошелька",
      "withdraw.pasteAddress": "Вставить адрес",
      "withdraw.selectNetwork": "Выберите сеть",
      "withdraw.amountLabel": "Сумма вывода",
      "withdraw.amountPlaceholder": "Введите сумму в USDT",
      "withdraw.maxBtn": "Макс.",
      "withdraw.receiveLabel": "К получению",
      "withdraw.feeLabel": "Комиссия сети",
      "withdraw.note": "Минимальный вывод: 5 USDT. Пакетная обработка. Может занимать до 24 часов.",
      "withdraw.submitBtn": "Запросить вывод",
      "common.viewAll": "Смотреть все >",
      "common.viewLess": "Свернуть ‹",
      "modal.info": "Информация",
      "toast.copied": "Скопировано в буфер обмена",
      "toast.copyError": "Не удалось скопировать автоматически",
      "toast.idCopied": "ID {id} скопирован",
      "toast.linkCopied": "Реферальная ссылка скопирована",
      "toast.addrCopied": "Адрес {net} скопирован",
      "toast.netSelected": "Выбрана сеть {net}",
      "toast.synced": "Данные синхронизированы",
      "toast.langChanged": "Язык: {lang}",
      "toast.previewNoTg": "Локальный просмотр — нет сессии Telegram",
      "toast.aiInfo": "Автоторговля Ethereum · Фьючерсы и плечо",
      "toast.pasteHint": "Введите или вставьте адрес вручную",
      "toast.pasted": "Адрес вставлен",
      "toast.invalidAddr": "Введите корректный адрес кошелька",
      "toast.minWithdraw": "Минимальная сумма вывода — {min} USDT",
      "toast.insufficient": "Недостаточно доступных средств",
      "toast.withdrawQueued": "Вывод добавлен в очередь (до 24 часов)",
      "date.recent": "Недавно",
      "locale": "ru-RU",
      "langName": "Русский",
    },
    en: {
      "app.title": "CipherX — Mini App",
      "top.closeOrBack": "Close or back",
      "top.close": "Close",
      "top.back": "Back",
      "top.miniApp": "mini app",
      "top.language": "Language",
      "top.menu": "Menu",
      "menu.terms": "Terms and Conditions",
      "menu.privacy": "Privacy Policy",
      "menu.about": "About Us",
      "nav.main": "Main navigation",
      "nav.home": "Home",
      "nav.referrals": "Referrals",
      "nav.wallet": "Wallet",
      "home.greeting": "Hello, {name}",
      "home.verified": "Verified account",
      "home.copyId": "Copy ID",
      "home.regulationText": "Regulated by international KYC/AML and FinCEN standards.",
      "home.totalBalance": "Total Balance",
      "home.toggleBalance": "Hide or show balances",
      "home.timeframe": "Chart timeframe",
      "home.todaySuffix": "today",
      "home.frozenBalance": "Frozen Balance",
      "home.withdrawableBalance": "Withdrawable Balance",
      "home.dailyYield": "Daily Yield",
      "home.aiBannerTitle": "Our team trades for you",
      "home.aiBannerSub": "Intelligence. Strategy. Results.",
      "home.teamTradesTitle": "Team trading history",
      "home.noTrades": "Trades and the returns generated by our team for you are updated every 24 hours after your registration",
      "home.tradeTitle": "Ethereum {side}",
      "home.tradeDetail": "Leverage {lev}x · {date}",
      "referrals.title": "Referrals",
      "referrals.subtitle": "Invite, earn, grow together",
      "referrals.microNote": "More people. More opportunities.",
      "referrals.bonusLabel": "Bonus",
      "referrals.bonusDesc": "1 USDT in frozen balance for every referral who signs up.",
      "referrals.commissionLabel": "Commission",
      "referrals.commissionDesc": "12% commission on what your referral deposits.",
      "referrals.yourLink": "Your referral link",
      "referrals.copyLink": "Copy referral link",
      "referrals.shareTelegram": "Share on Telegram",
      "referrals.totalReferrals": "Total Referrals",
      "referrals.activeReferrals": "Active",
      "referrals.commissions": "Commissions",
      "referrals.recentTitle": "Recent referrals",
      "referrals.noReferrals": "No referrals yet",
      "referrals.shareText": "Join CipherX and start automated copy trading: {link}",
      "wallet.title": "Wallet",
      "wallet.subtitle": "Your freedom, in your hands",
      "wallet.availableBalance": "Available Balance (Withdrawable)",
      "wallet.toggleBalance": "Show or hide available balance",
      "wallet.deposit": "Deposit",
      "wallet.withdraw": "Withdraw",
      "wallet.networksTitle": "Available networks",
      "wallet.minWithdraw": "Min. withdrawal: <strong>5 USDT</strong>",
      "wallet.minDeposit": "Min. deposit: <strong>10 USDT</strong>",
      "wallet.txHistoryTitle": "Transaction history",
      "wallet.noTx": "No transactions yet",
      "tx.deposit": "Deposit",
      "tx.withdraw": "Withdrawal",
      "tx.commission": "Commission",
      "tx.bonus": "Bonus",
      "tx.completed": "Completed",
      "tx.pending": "Pending",
      "tx.rejected": "Rejected",
      "tx.batchNow": "Now · Batch (up to 24h)",
      "deposit.ariaLabel": "Deposit USDT",
      "deposit.title": "Deposit USDT",
      "deposit.selectNetwork": "Select deposit network",
      "deposit.qrAria": "Deposit QR code",
      "deposit.addressTitle": "Deposit address ({net})",
      "deposit.copyAddress": "Copy Address",
      "deposit.noticeLine1": "Send only USDT on the selected network.",
      "deposit.noticeLine2": "Minimum 10 USDT.",
      "deposit.promoTitle": "Safe deposits,<br />a bigger future",
      "deposit.confirmBtn": "I have already made the deposit",
      "deposit.confirmToast": "Notice recorded ({net}). Minimum 10 USDT.",
      "withdraw.ariaLabel": "Withdraw USDT",
      "withdraw.title": "Withdraw USDT",
      "withdraw.subtitle": "Complete the details for your withdrawal",
      "withdraw.availableLabel": "Available Balance",
      "withdraw.addressLabel": "Wallet Address",
      "withdraw.addressPlaceholder": "Enter your wallet address",
      "withdraw.pasteAddress": "Paste address",
      "withdraw.selectNetwork": "Select network",
      "withdraw.amountLabel": "Amount to Withdraw",
      "withdraw.amountPlaceholder": "Enter amount in USDT",
      "withdraw.maxBtn": "Max",
      "withdraw.receiveLabel": "Amount to receive",
      "withdraw.feeLabel": "Network fee",
      "withdraw.note": "Minimum withdrawal: 5 USDT. Automatic batch processing. May take up to 24 hours.",
      "withdraw.submitBtn": "Request Withdrawal",
      "common.viewAll": "View all >",
      "common.viewLess": "View less ‹",
      "modal.info": "Information",
      "toast.copied": "Copied to clipboard",
      "toast.copyError": "Could not copy automatically",
      "toast.idCopied": "ID {id} copied",
      "toast.linkCopied": "Referral link copied",
      "toast.addrCopied": "{net} address copied",
      "toast.netSelected": "{net} network selected",
      "toast.synced": "Data synced",
      "toast.langChanged": "Language: {lang}",
      "toast.previewNoTg": "Local preview — no Telegram session",
      "toast.aiInfo": "Automated Ethereum trading · Futures & Leverage",
      "toast.pasteHint": "Type or paste your address manually",
      "toast.pasted": "Address pasted",
      "toast.invalidAddr": "Enter a valid wallet address",
      "toast.minWithdraw": "Minimum withdrawal amount is {min} USDT",
      "toast.insufficient": "Insufficient available balance",
      "toast.withdrawQueued": "Withdrawal queued in batch (up to 24 hours)",
      "date.recent": "Recent",
      "locale": "en-US",
      "langName": "English",
    },
  };

  function getSavedLang() {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && I18N[saved]) return saved;
    } catch {
      // ignore storage errors
    }
    return "es";
  }

  const mockData = {
    lang: getSavedLang(),
    user: {
      name: "Trader",
      id: "000000",
      referralLink: "https://t.me/CipherX_Trade_bot",
      depositoRealizado: false,
    },
    balances: {
      total: 0.00,
      frozen: 0.00,
      withdrawable: 0.00,
      availableWallet: 0.00,
      dailyYieldPct: 0.00,
      dailyDeltaPct: 0.00,
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
      TON: "UQA1jdxwaZ9m8yibRDs_iv5dzUIkRUr_LQvw_oU9cUhF1KTE",
      TRC20: "TWbhSCsVSQ2Nihoc2jzzheM9Exv8y11LXF",
      BEP20: "0xA426B5f7970135D9651B4523a70c9871F2c03E7b",
    },

    chartSeries: {
      "1D": [18, 24, 21, 32, 29, 41, 38, 52, 49, 64, 59, 76],
      "1S": [15, 28, 35, 30, 48, 44, 58, 63, 55, 70, 74, 82],
      "1M": [12, 20, 34, 28, 42, 53, 47, 61, 68, 65, 79, 86],
      "1A": [10, 19, 26, 39, 45, 52, 60, 66, 73, 78, 84, 90],
    },

    trades: [],
    referrals: [],
    referralStats: {
      total: 0,
      active: 0,
      commissions: 0.0,
    },
    transactions: [],
  };

  function t(key, params = {}) {
    const dict = I18N[mockData.lang] || I18N.es;
    let str = dict[key] !== undefined ? dict[key] : (I18N.es[key] !== undefined ? I18N.es[key] : key);
    Object.keys(params).forEach((k) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(params[k]));
    });
    return str;
  }

  function getModalContent(lang) {
    if (lang === "ru") {
      return {
        terms: {
          title: "Условия использования",
          html: `
            <h3>1. Принятие сервиса</h3>
            <p>Используя CipherX Mini App, вы соглашаетесь соблюдать настоящие Условия использования и применимые правила работы с цифровыми инструментами и управлением капиталом.</p>
            <h3>2. Рыночные риски</h3>
            <p>Операции с цифровыми активами и фьючерсными контрактами связаны с волатильностью и рисками. Прошлые результаты не гарантируют будущую доходность.</p>
            <h3>3. Пополнение, вывод и комиссии</h3>
            <p>Минимальный депозит — 10 USDT в поддерживаемых сетях (TON, TRC20, BEP20). Минимальный вывод — 5 USDT, комиссия сети — 0.15 USDT, пакетная обработка занимает до 24 часов.</p>
            <h3>4. Реферальная программа</h3>
            <p>Бонусы и реферальные комиссии начисляются согласно действующим правилам платформы и проходят антифрод-проверку.</p>
          `,
        },
        privacy: {
          title: "Политика конфиденциальности",
          html: `
            <h3>1. Собираемые данные</h3>
            <p>CipherX собирает только данные, необходимые для работы аккаунта в Telegram: идентификатор пользователя, отображаемое имя и историю внутренних операций.</p>
            <h3>2. Цель обработки</h3>
            <p>Данные используются для начисления балансов, обработки пополнений и выводов, расчёта реферальных комиссий и обеспечения безопасности сервиса.</p>
            <h3>3. Защита и хранение</h3>
            <p>Мы применяем технические и организационные меры защиты записей и не передаём персональные данные третьим лицам без оснований.</p>
          `,
        },
        about: {
          title: "О нас",
          html: `
            <h3>Наша история</h3>
            <p>Основанный в 2019 году проект CipherX делает алгоритмический трейдинг и стратегическое управление капиталом доступными в удобном интерфейсе.</p>
            <h3>Руководство</h3>
            <div class="exec-card">
              <img src="https://i.pravatar.cc/96?img=12" alt="Daniel Mendoza" class="exec-avatar" />
              <div>
                <div class="exec-name">Daniel Mendoza</div>
                <div class="exec-role">CEO &amp; Co-Founder</div>
                <div class="exec-bio">Более 12 лет опыта на финансовых рынках и в создании масштабируемых финтех-продуктов.</div>
              </div>
            </div>
            <div class="exec-card">
              <img src="https://i.pravatar.cc/96?img=33" alt="Valeria Ríos" class="exec-avatar" />
              <div>
                <div class="exec-name">Valeria Ríos</div>
                <div class="exec-role">CTO</div>
                <div class="exec-bio">Специалист по распределённым системам, автоматизации исполнения и безопасности в реальном времени.</div>
              </div>
            </div>
            <div class="exec-card">
              <img src="https://i.pravatar.cc/96?img=52" alt="Mateo Salgado" class="exec-avatar" />
              <div>
                <div class="exec-name">Mateo Salgado</div>
                <div class="exec-role">CFO</div>
                <div class="exec-bio">Отвечает за казначейство, контроль ликвидности, операционный аудит и финансовую устойчивость.</div>
              </div>
            </div>
          `,
        },
      };
    }

    if (lang === "en") {
      return {
        terms: {
          title: "Terms and Conditions",
          html: `
            <h3>1. Acceptance of Service</h3>
            <p>By accessing or using CipherX Mini App, you agree to comply with these Terms and Conditions and applicable rules governing digital tools and capital management.</p>
            <h3>2. Market Risks</h3>
            <p>Trading digital assets and futures contracts involves inherent volatility risks. Past performance or operational estimates do not guarantee future results.</p>
            <h3>3. Deposits, Withdrawals &amp; Fees</h3>
            <p>Minimum deposit is 10 USDT across supported networks (TON, TRC20, BEP20). Minimum withdrawal is 5 USDT with a 0.15 USDT network fee and automatic batch processing up to 24 hours.</p>
            <h3>4. Referral Program</h3>
            <p>Promotional bonuses and referral commissions follow current platform rules and are subject to anti-fraud checks.</p>
          `,
        },
        privacy: {
          title: "Privacy Policy",
          html: `
            <h3>1. Data Collected</h3>
            <p>CipherX collects only the information needed to operate your account inside Telegram: user ID, display name, and internal transaction records.</p>
            <h3>2. Purpose of Processing</h3>
            <p>We use your data to credit balances, process deposits and withdrawals, calculate referral commissions, and keep the platform secure.</p>
            <h3>3. Protection &amp; Retention</h3>
            <p>We apply technical and organizational safeguards to protect record integrity and do not sell or share personal data with unauthorized third parties.</p>
          `,
        },
        about: {
          title: "About Us",
          html: `
            <h3>Our Story</h3>
            <p>Founded in 2019, CipherX set out to democratize quantitative trading and strategic capital management through a fast, accessible interface.</p>
            <h3>Executive Team</h3>
            <div class="exec-card">
              <img src="https://i.pravatar.cc/96?img=12" alt="Daniel Mendoza" class="exec-avatar" />
              <div>
                <div class="exec-name">Daniel Mendoza</div>
                <div class="exec-role">CEO &amp; Co-Founder</div>
                <div class="exec-bio">Over 12 years in financial markets and fintech product architecture focused on scalability and risk control.</div>
              </div>
            </div>
            <div class="exec-card">
              <img src="https://i.pravatar.cc/96?img=33" alt="Valeria Ríos" class="exec-avatar" />
              <div>
                <div class="exec-name">Valeria Ríos</div>
                <div class="exec-role">CTO</div>
                <div class="exec-bio">Specialist in distributed systems, execution automation, and real-time infrastructure security.</div>
              </div>
            </div>
            <div class="exec-card">
              <img src="https://i.pravatar.cc/96?img=52" alt="Mateo Salgado" class="exec-avatar" />
              <div>
                <div class="exec-name">Mateo Salgado</div>
                <div class="exec-role">CFO</div>
                <div class="exec-bio">Leads treasury, liquidity control, operational auditing, and long-term financial sustainability.</div>
              </div>
            </div>
          `,
        },
      };
    }

    return {
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
  }

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function formatNumber(num, decimals = 2) {
    return Number(num).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function formatDateLabel(isoOrStr) {
    if (!isoOrStr) return t("date.recent");
    const d = new Date(isoOrStr);
    if (Number.isNaN(d.getTime())) return String(isoOrStr);
    return d.toLocaleString(t("locale"), {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
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
    }, 2600);
  }

  async function copyToClipboard(text, successMsg = null) {
    const msgOk = successMsg || t("toast.copied");
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
      showToast(msgOk);
    } catch {
      showToast(t("toast.copyError"));
    }
  }

  function applyStaticTranslations() {
    document.documentElement.lang = mockData.lang;
    document.title = t("app.title");

    $$("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (val.includes("<")) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });

    $$("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });

    $$("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.dataset.i18nTitle));
    });

    $$("[data-i18n-aria-label]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
    });

    const isSubView = mockData.activeTab === "deposit" || mockData.activeTab === "withdraw";
    const topLeftText = $("#topLeftText");
    if (topLeftText) {
      topLeftText.textContent = isSubView ? t("top.back") : t("top.close");
    }

    $$(".lang-option").forEach((btn) => {
      const isSelected = btn.dataset.lang === mockData.lang;
      btn.classList.toggle("active", isSelected);
      const checkEl = btn.querySelector(".lang-check");
      if (checkEl) {
        checkEl.textContent = isSelected ? "✓" : "";
      }
    });
  }

  function setLanguage(newLang, notify = false) {
    if (!I18N[newLang]) return;
    mockData.lang = newLang;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, newLang);
    } catch {
      // ignore storage errors
    }
    applyStaticTranslations();
    renderBalances();
    renderTradesList();
    renderReferralsView();
    renderTransactionsList();
    if (mockData.activeTab === "deposit") {
      renderDepositPanel();
    }
    if (notify) {
      showToast(t("toast.langChanged", { lang: t("langName") }));
    }
  }

  // ------------------------------------------------------------------------
  // NUEVA FUNCIÓN: Sincronizar Referidos Reales desde el Backend
  // ------------------------------------------------------------------------
  async function syncReferralsFromBackend(telegramId) {
    if (!telegramId) return;
    try {
      const res = await fetch(`/api/referrals/${encodeURIComponent(telegramId)}`);
      if (res.ok) {
        const data = await res.json();
        
        mockData.referralStats.total = data.total_referidos || 0;
        mockData.referralStats.active = data.referidos_activos || 0;
        mockData.referralStats.commissions = parseFloat(data.comisiones_totales || 0);

        if (Array.isArray(data.referidos) && data.referidos.length > 0) {
          mockData.referrals = data.referidos.map((ref) => ({
            handle: ref.username ? `@${ref.username}` : (ref.nombre || `ID: ${ref.telegram_id}`),
            timeAgo: formatDateLabel(ref.fecha),
            bonus: `+${formatNumber(ref.bono, 2)} USDT`
          }));
        } else {
          mockData.referrals = [];
        }
      }
    } catch (err) {
      console.warn("No se pudieron cargar los referidos:", err);
    }
  }

  async function syncUserActivityFromBackend(telegramId, capitalBase) {
    if (!telegramId) return;

    try {
      const [tradesRes, txRes] = await Promise.all([
        fetch(`/api/trades/${encodeURIComponent(telegramId)}`),
        fetch(`/api/transactions/${encodeURIComponent(telegramId)}`),
      ]);

      if (tradesRes.ok) {
        const rawTrades = await tradesRes.json();
        if (Array.isArray(rawTrades) && rawTrades.length > 0) {
          const base = capitalBase > 0 ? capitalBase : 100;
          mockData.trades = rawTrades.map((tr) => {
            const amt = parseFloat(tr.resultado || 0);
            const sideLabel = String(tr.tipo || "long").toUpperCase();
            const lev = tr.apalancamiento || 10;
            return {
              title: t("home.tradeTitle", { side: sideLabel }),
              detail: t("home.tradeDetail", { lev, date: formatDateLabel(tr.fecha) }),
              amount: amt,
              pct: Number(((amt / base) * 100).toFixed(2)),
            };
          });
        } else {
          mockData.trades = [];
        }
      } else {
        mockData.trades = [];
      }

      if (txRes.ok) {
        const rawTx = await txRes.json();
        if (Array.isArray(rawTx) && rawTx.length > 0) {
          mockData.transactions = rawTx.map((tx) => {
            const tipo = String(tx.tipo || "deposito").toLowerCase();
            const estadoRaw = String(tx.estado || "").toLowerCase();
            const isOut = tipo === "retiro";
            const rawAmt = Math.abs(parseFloat(tx.monto || 0));
            const labelMap = {
              deposito: t("tx.deposit"),
              retiro: t("tx.withdraw"),
              comision: t("tx.commission"),
              bono: t("tx.bonus"),
            };
            const statusMap = {
              completado: t("tx.completed"),
              confirmado: t("tx.completed"),
              pendiente: t("tx.pending"),
              procesando: t("tx.pending"),
              rechazado: t("tx.rejected"),
            };
            return {
              type: isOut ? "withdraw" : "deposit",
              label: labelMap[tipo] || tipo,
              date: `${formatDateLabel(tx.fecha)}${tx.red ? ` · ${tx.red}` : ""}`,
              amount: isOut ? -rawAmt : rawAmt,
              status: statusMap[estadoRaw] || (tx.estado || t("tx.completed")),
            };
          });
        } else {
          mockData.transactions = [];
        }
      } else {
        mockData.transactions = [];
      }
    } catch (err) {
      console.warn("No se pudo cargar historial real, manteniendo listas vacías:", err);
      mockData.trades = [];
      mockData.transactions = [];
    }
  }

  // ========================================================================
  // CONEXIÓN CON FASTAPI + LIMPIEZA DE DATOS MOCK PARA USUARIOS NUEVOS
  // ========================================================================
  async function initTelegramBridge() {
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

    const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
    const urlParams = new URLSearchParams(window.location.search);
    const queryTgId = urlParams.get("dev_telegram_id");
    const startParam =
      (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ||
      urlParams.get("start") ||
      urlParams.get("startapp") ||
      null;

    const realTgId = tgUser && tgUser.id
      ? String(tgUser.id)
      : (queryTgId ? String(queryTgId) : null);

    const realName = tgUser
      ? ([tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || tgUser.username || "Trader")
      : null;

    const realUsername = tgUser && tgUser.username ? tgUser.username : null;

    if (realName) {
      mockData.user.name = realName;
    }
    if (realTgId) {
      mockData.user.id = realTgId;
      mockData.user.referralLink = `https://t.me/CipherX_Trade_bot?start=${realTgId}`;
    }

    // --- CÓDIGO PARA CARGAR LA FOTO DE PERFIL ---
    const avatarImg = document.getElementById("userAvatarImg");
    const avatarFallback = document.getElementById("userAvatarFallback");

    if (tgUser && tgUser.photo_url && avatarImg) {
      avatarImg.src = tgUser.photo_url;
      avatarImg.style.display = "block";
      if (avatarFallback) avatarFallback.style.display = "none";
    } else if (realName && avatarFallback) {
      avatarFallback.textContent = realName.charAt(0).toUpperCase();
    }
    // ---------------------------------------------

    try {
      const url = new URL("/api/user/me", window.location.origin);
      const headers = {};

      if (tg && tg.initData) {
        headers["X-Telegram-Init-Data"] = tg.initData;
      }

      if (realTgId) {
        url.searchParams.set("dev_telegram_id", realTgId);
      }
      if (realName) {
        url.searchParams.set("dev_nombre", realName);
      }
      if (realUsername) {
        url.searchParams.set("dev_username", realUsername);
      }
      if (startParam) {
        url.searchParams.set("start_param", String(startParam));
      }

      const res = await fetch(url.toString(), { headers });

      if (res.ok) {
        const data = await res.json();

        const resolvedId = String(data.telegram_id || realTgId || mockData.user.id);
        mockData.user.name = data.nombre || realName || mockData.user.name;
        mockData.user.id = resolvedId;
        mockData.user.referralLink = `https://t.me/CipherX_Trade_bot?start=${resolvedId}`;
        mockData.user.depositoRealizado = Boolean(data.deposito_realizado);

        const frozenVal = parseFloat(data.saldo_congelado ?? 0);
        const withdrawableVal = parseFloat(data.saldo_retirable ?? 0);
        const totalVal = parseFloat(data.saldo_total ?? (frozenVal + withdrawableVal));

        mockData.balances.frozen = Number.isNaN(frozenVal) ? 0.0 : Number(frozenVal.toFixed(2));
        mockData.balances.withdrawable = Number.isNaN(withdrawableVal) ? 0.0 : Number(withdrawableVal.toFixed(2));
        mockData.balances.total = Number.isNaN(totalVal)
          ? Number((mockData.balances.frozen + mockData.balances.withdrawable).toFixed(2))
          : Number(totalVal.toFixed(2));
        mockData.balances.availableWallet = mockData.balances.withdrawable;

        mockData.trades = [];
        mockData.transactions = [];
        mockData.referrals = [];
        mockData.referralStats = {
          total: 0,
          active: 0,
          commissions: 0.0,
        };
        mockData.balances.dailyYieldPct = 0.0;
        mockData.balances.dailyDeltaPct = 0.0;

        // AQUI LLAMAMOS A LA NUEVA FUNCION DE REFERIDOS
        await Promise.all([
            syncUserActivityFromBackend(resolvedId, mockData.balances.total),
            syncReferralsFromBackend(resolvedId)
        ]);

        if (mockData.trades.length > 0) {
          const sumPnL = mockData.trades.reduce((acc, item) => acc + Number(item.amount || 0), 0);
          const pctDay = mockData.balances.total > 0 ? (sumPnL / mockData.balances.total) * 100 : 0;
          mockData.balances.dailyYieldPct = Number(pctDay.toFixed(2));
          mockData.balances.dailyDeltaPct = Number(pctDay.toFixed(2));
        }
      } else {
        console.error("Error del servidor en /api/user/me:", res.status);
      }
    } catch (error) {
      console.error("Error de conexión con FastAPI:", error);
    }

    renderBalances();
    renderTradesList();
    renderReferralsView();
    renderTransactionsList();
  }

  function closeLangMenu() {
    const menu = $("#langMenu");
    const btn = $("#btnLang");
    if (menu) {
      menu.classList.remove("open");
      menu.setAttribute("aria-hidden", "true");
    }
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
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

  function closeHeaderMenus() {
    closeLangMenu();
    closeThreeDotsMenu();
  }

  function openInfoModal(type) {
    const contentMap = getModalContent(mockData.lang);
    const item = contentMap[type];
    if (!item) return;
    closeHeaderMenus();
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
    closeHeaderMenus();
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
      topLeftText.textContent = t("top.back");
    } else {
      topLeftIcon.textContent = "×";
      topLeftText.textContent = t("top.close");
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

    const btn = $("#toggleAllTradesBtn");

    if (!Array.isArray(mockData.trades) || mockData.trades.length === 0) {
      container.innerHTML = `<div class="empty-state">${t("home.noTrades")}</div>`;
      if (btn) btn.style.display = "none";
      return;
    }

    if (btn) btn.style.display = "";

    const list = mockData.showAllTrades
      ? mockData.trades
      : mockData.trades.slice(0, 5);

    container.innerHTML = list
      .map((item) => {
        const isPos = item.amount >= 0;
        const sign = isPos ? "+" : "-";
        const absAmt = formatNumber(Math.abs(item.amount), 2);
        const pctStr = `${isPos ? "+" : ""}${Number(item.pct || 0).toFixed(2)}%`;

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

    if (btn) {
      btn.textContent = mockData.showAllTrades ? t("common.viewLess") : t("common.viewAll");
    }
  }

  function renderBalances() {
    const hidden = mockData.hiddenBalances;
    const mask = "••••••";

    $("#userName").textContent = t("home.greeting", { name: mockData.user.name });
    $("#userIdText").textContent = mockData.user.id;

    $("#totalBalanceText").textContent = hidden
      ? `${mask} USDT`
      : `${formatNumber(mockData.balances.total, 2)} USDT`;

    $("#totalDeltaText").textContent = `+${Number(mockData.balances.dailyDeltaPct || 0).toFixed(2)}% ${t("home.todaySuffix")}`;

    $("#frozenBalanceText").textContent = hidden
      ? mask
      : formatNumber(mockData.balances.frozen, 2);

    $("#withdrawableBalanceText").textContent = hidden
      ? mask
      : formatNumber(mockData.balances.withdrawable, 2);

    $("#dailyYieldText").textContent = `+${Number(mockData.balances.dailyYieldPct || 0).toFixed(2)}%`;

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

    const container = $("#referralsListContainer");
    const toggleBtn = $("#toggleAllReferralsBtn");

    if (!Array.isArray(mockData.referrals) || mockData.referrals.length === 0) {
      if (container) container.innerHTML = `<div class="empty-state">${t("referrals.noReferrals")}</div>`;
      if (toggleBtn) toggleBtn.style.display = "none";
      return;
    }

    if (toggleBtn) toggleBtn.style.display = "";

    const list = mockData.showAllReferrals
      ? mockData.referrals
      : mockData.referrals.slice(0, 4);

    if (container) {
      container.innerHTML = list
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
    }

    if (toggleBtn) {
      toggleBtn.textContent = mockData.showAllReferrals ? t("common.viewLess") : t("common.viewAll");
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

    const toggleBtn = $("#toggleAllTxBtn");

    if (!Array.isArray(mockData.transactions) || mockData.transactions.length === 0) {
      container.innerHTML = `<div class="empty-state">${t("wallet.noTx")}</div>`;
      if (toggleBtn) toggleBtn.style.display = "none";
      return;
    }

    if (toggleBtn) toggleBtn.style.display = "";

    const list = mockData.showAllTx
      ? mockData.transactions
      : mockData.transactions.slice(0, 4);

    container.innerHTML = list
      .map((tx) => {
        const isDeposit = tx.type === "deposit";
        const sign = tx.amount >= 0 ? "+" : "-";
        const absAmt = formatNumber(Math.abs(tx.amount), 2);
        const isCompleted = tx.status === t("tx.completed") || tx.status === "Completado";
        const pillClass = isCompleted ? "tx-status-pill" : "tx-status-pill pending";

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

    if (toggleBtn) {
      toggleBtn.textContent = mockData.showAllTx ? t("common.viewLess") : t("common.viewAll");
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
    $("#depositAddressTitle").textContent = t("deposit.addressTitle", { net });
    $("#depositAddressValue").textContent = addr;
    drawQrMatrix(`${net}:${addr}`);
  }

  function updateWithdrawCalc() {
    const rawVal = parseFloat($("#withdrawAmountInput").value);
    const fee = mockData.withdrawFeeUsdt;

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

    const supportFab = $("#walletSupportFab");
    if (supportFab) {
      supportFab.addEventListener("click", (e) => {
        if (tg && typeof tg.openTelegramLink === "function") {
          e.preventDefault();
          tg.openTelegramLink(SUPPORT_URL);
        }
      });
    }

    $("#btnTopLeft").addEventListener("click", () => {
      closeHeaderMenus();
      if (mockData.activeTab === "deposit" || mockData.activeTab === "withdraw") {
        navigateTo(mockData.previousMainTab || "wallet");
      } else if (tg && typeof tg.close === "function") {
        tg.close();
      } else {
        showToast(t("toast.previewNoTg"));
      }
    });

    const btnLang = $("#btnLang");
    if (btnLang) {
      btnLang.addEventListener("click", (e) => {
        e.stopPropagation();
        closeThreeDotsMenu();
        const menu = $("#langMenu");
        if (!menu) return;
        const isOpen = menu.classList.toggle("open");
        menu.setAttribute("aria-hidden", String(!isOpen));
        btnLang.setAttribute("aria-expanded", String(isOpen));
      });
    }

    $$(".lang-option").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeHeaderMenus();
        setLanguage(btn.dataset.lang, true);
      });
    });

    const btnRefresh = $("#btnRefreshApp");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", async () => {
        closeHeaderMenus();
        await initTelegramBridge();
        showToast(t("toast.synced"));
      });
    }

    $("#btnMenu").addEventListener("click", (e) => {
      e.stopPropagation();
      closeLangMenu();
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
      const langMenu = $("#langMenu");
      if (langMenu && langMenu.classList.contains("open") && !e.target.closest("#langMenu") && !e.target.closest("#btnLang")) {
        closeLangMenu();
      }
      const menu = $("#threeDotsMenu");
      if (menu && menu.classList.contains("open") && !e.target.closest("#threeDotsMenu") && !e.target.closest("#btnMenu")) {
        closeThreeDotsMenu();
      }
    });

    $("#copyUserIdBtn").addEventListener("click", () => {
      copyToClipboard(mockData.user.id, t("toast.idCopied", { id: mockData.user.id }));
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
      showToast(t("toast.aiInfo"));
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
      copyToClipboard(mockData.user.referralLink, t("toast.linkCopied"));
    });

    $("#shareTelegramBtn").addEventListener("click", () => {
      const shareText = encodeURIComponent(
        t("referrals.shareText", { link: mockData.user.referralLink })
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
        showToast(t("toast.netSelected", { net: card.dataset.network }));
      });
    });

    $("#copyDepositAddressBtn").addEventListener("click", () => {
      const net = mockData.selectedNetwork;
      const addr = mockData.depositAddresses[net];
      copyToClipboard(addr, t("toast.addrCopied", { net }));
    });

    $("#confirmDepositBtn").addEventListener("click", () => {
      showToast(t("deposit.confirmToast", { net: mockData.selectedNetwork }));
    });

    $("#pasteAddressBtn").addEventListener("click", async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clip = await navigator.clipboard.readText();
          if (clip) {
            $("#withdrawAddressInput").value = clip.trim();
            showToast(t("toast.pasted"));
            return;
          }
        }
        showToast(t("toast.pasteHint"));
      } catch {
        showToast(t("toast.pasteHint"));
      }
    });

    $("#withdrawMaxBtn").addEventListener("click", () => {
      const maxVal = mockData.balances.availableWallet.toFixed(2);
      $("#withdrawAmountInput").value = maxVal;
      updateWithdrawCalc();
    });

    $("#withdrawAmountInput").addEventListener("input", updateWithdrawCalc);

    $("#submitWithdrawBtn").addEventListener("click", async () => {
      if (!mockData.user.depositoRealizado) {
        showToast(INVESTOR_ONLY_WITHDRAW_MSG);
        return;
      }

      const addr = $("#withdrawAddressInput").value.trim();
      const amount = parseFloat($("#withdrawAmountInput").value);

      if (!addr || addr.length < 8) {
        showToast(t("toast.invalidAddr"));
        return;
      }
      if (Number.isNaN(amount) || amount < mockData.minWithdrawUsdt) {
        showToast(t("toast.minWithdraw", { min: mockData.minWithdrawUsdt }));
        return;
      }
      if (amount > mockData.balances.availableWallet) {
        showToast(t("toast.insufficient"));
        return;
      }

      const tgIdNum = parseInt(mockData.user.id, 10);
      if (Number.isNaN(tgIdNum) || tgIdNum <= 0) {
        showToast(t("toast.previewNoTg"));
        return;
      }

      try {
        const res = await fetch("/api/withdraw/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegram_id: tgIdNum,
            monto: amount,
            red: mockData.selectedNetwork,
            wallet_destino: addr,
          }),
        });

        if (!res.ok) {
          let errMsg = t("toast.withdrawQueued");
          try {
            const errData = await res.json();
            if (errData && errData.detail) {
              errMsg = String(errData.detail);
            }
          } catch (_) {
            // ignore parse error
          }
          showToast(errMsg);
          return;
        }

        const data = await res.json();
        const newRetirable = parseFloat(data.nuevo_saldo_retirable_usuario);
        if (!Number.isNaN(newRetirable)) {
          mockData.balances.availableWallet = Number(newRetirable.toFixed(2));
          mockData.balances.withdrawable = Number(newRetirable.toFixed(2));
          mockData.balances.total = Number(
            (mockData.balances.frozen + mockData.balances.withdrawable).toFixed(2)
          );
        }

        await syncUserActivityFromBackend(mockData.user.id, mockData.balances.total);

        $("#withdrawAddressInput").value = "";
        $("#withdrawAmountInput").value = "";
        updateWithdrawCalc();
        renderBalances();
        renderTransactionsList();

        showToast(t("toast.withdrawQueued"));
        navigateTo("wallet");
      } catch (err) {
        console.error("Error solicitando retiro:", err);
        showToast(t("toast.copyError"));
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    applyStaticTranslations();
    renderBalances();
    renderChart("1D");
    renderTradesList();
    renderReferralsView();
    renderTransactionsList();
    syncNetworkSelectors(mockData.selectedNetwork);
    updateWithdrawCalc();
    bindEvents();
    await initTelegramBridge();
  });
})();
