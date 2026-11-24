const adminToken = localStorage.getItem('adminToken');

if (adminToken) {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';
    loadUsers();
}

function getAuthHeaders(includeJson = false) {
    const headers = {};
    if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
    }
    if (includeJson) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

async function parseErrorMessage(res, fallback = 'Error en la solicitud') {
    try {
        const err = await res.json();
        return err.detail || err.message || `${fallback} (HTTP ${res.status})`;
    } catch (_) {
        return `${fallback} (HTTP ${res.status})`;
    }
}

async function doLogin() {
    const pass = document.getElementById('adminPass').value;
    const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
    });
    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('adminToken', data.token);
        location.reload();
    } else {
        const msg = await parseErrorMessage(res, 'Contraseña incorrecta');
        alert(msg);
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    location.reload();
}

function switchTab(tabName, evt) {
    const activeEvent = evt || window.event;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    if (activeEvent && activeEvent.target) {
        activeEvent.target.classList.add('active');
    }
    const panel = document.getElementById('panel-' + tabName);
    if (panel) {
        panel.classList.add('active');
    }
    if (tabName === 'users') loadUsers();
    if (tabName === 'withdrawals') loadWithdrawals();
}

async function loadUsers() {
    const search = encodeURIComponent((document.getElementById('searchId').value || '').trim());
    const res = await fetch(`/api/admin/users?telegram_id=${search}`, {
        headers: getAuthHeaders(false)
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, 'No se pudieron cargar los usuarios');
        alert(msg);
        return;
    }
    const users = await res.json();
    document.getElementById('usersTable').innerHTML = users.map(u => {
        const isInvestor = Boolean(u.deposito_realizado);
        return `
        <tr>
            <td>${u.id}</td>
            <td>${u.nombre || 'Sin nombre'} ${u.banned ? '🚫' : ''}</td>
            <td>${Number(u.congelado || 0).toFixed(2)}</td>
            <td>${Number(u.retirable || 0).toFixed(2)}</td>
            <td>${isInvestor ? '✅ Depositado' : '⏳ Pendiente'}</td>
            <td>
                <button class="btn-sm btn-green" onclick="acreditarDeposito('${u.id}')">Acreditar Dep.</button>
                <button class="btn-sm" onclick="editBalance('${u.id}', 'retirable', 'sumar')">+10 Ret</button>
                <button class="btn-sm btn-red" onclick="toggleBan('${u.id}', ${Boolean(u.banned)})">${u.banned ? 'Desbanear' : 'Banear'}</button>
            </td>
        </tr>
    `;
    }).join('');
}

async function acreditarDeposito(id) {
    const montoStr = prompt('Monto del depósito a acreditar (USDT):', '10');
    if (!montoStr) return;
    const monto = parseFloat(montoStr);
    if (Number.isNaN(monto) || monto <= 0) {
        return alert('Ingresa un monto válido mayor a 0');
    }

    const redRaw = prompt('Red utilizada (TON, TRC20, BEP20):', 'TRC20');
    if (!redRaw) return;
    const red = redRaw.trim().toUpperCase();
    if (!['TON', 'TRC20', 'BEP20'].includes(red)) {
        return alert('Red inválida. Usa TON, TRC20 o BEP20.');
    }

    const res = await fetch(`/api/admin/users/${id}/acreditar-deposito`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ monto, red })
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, 'No se pudo acreditar el depósito');
        return alert(msg);
    }

    const data = await res.json();
    alert(
        `Depósito acreditado (${Number(data.monto_acreditado).toFixed(2)} USDT en ${data.red}). ` +
        `Usuario marcado como inversor.`
    );
    await loadUsers();
}

async function editBalance(id, campo, accion) {
    const montoStr = prompt('Monto a modificar:', '10');
    if (!montoStr) return;
    const monto = parseFloat(montoStr);
    if (Number.isNaN(monto) || monto <= 0) {
        return alert('Ingresa un monto válido mayor a 0');
    }
    const res = await fetch(`/api/admin/users/${id}/balance`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ campo, accion, monto })
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, 'No se pudo actualizar el saldo');
        return alert(msg);
    }
    await loadUsers();
}

async function toggleBan(id, isBanned) {
    if (!confirm(`¿Seguro que quieres ${isBanned ? 'desbanear' : 'banear'} a este usuario?`)) return;
    const res = await fetch(`/api/admin/users/${id}/ban`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ banear: !isBanned })
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, 'No se pudo cambiar el estado de baneo');
        return alert(msg);
    }
    await loadUsers();
}

async function loadWithdrawals() {
    const res = await fetch('/api/admin/withdrawals', {
        headers: getAuthHeaders(false)
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, 'No se pudieron cargar los retiros');
        alert(msg);
        return;
    }
    const data = await res.json();
    document.getElementById('withdrawalsTable').innerHTML = data.map(w => `
        <tr>
            <td>${w.id}</td>
            <td>${w.telegram_id || w.user_id}</td>
            <td>${w.monto} USDT</td>
            <td>${w.red || '-'}</td>
            <td>
                <button class="btn-sm btn-green" onclick="approveTx(${w.id})">Aprobar</button>
                <button class="btn-sm btn-red" onclick="rejectTx(${w.id})">Rechazar</button>
            </td>
        </tr>
    `).join('');
}

async function approveTx(id) {
    const res = await fetch(`/api/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(false)
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, 'No se pudo aprobar el retiro');
        return alert(msg);
    }
    await loadWithdrawals();
}

async function rejectTx(id) {
    const res = await fetch(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(false)
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, 'No se pudo rechazar el retiro');
        return alert(msg);
    }
    await loadWithdrawals();
}

async function runSorteo() {
    const monto = parseFloat(document.getElementById('sorteoMonto').value);
    if (Number.isNaN(monto) || monto <= 0) return alert('Ingresa un monto válido');
    if (!confirm(`¿Acreditar ${monto} USDT a TODOS los usuarios?`)) return;
    const res = await fetch('/api/admin/sorteo-masivo', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ monto })
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, 'Error al ejecutar la acreditación masiva');
        return alert(msg);
    }
    const data = await res.json();
    alert(`Acreditación ejecutada con éxito (${data.beneficiados ?? 'todos'} usuarios)`);
    await loadUsers();
}

async function runBroadcast() {
    const mensaje = document.getElementById('broadcastMsg').value;
    if (!mensaje) return alert('Escribe un mensaje');
    if (!confirm('¿Enviar este mensaje a TODOS los usuarios?')) return;
    const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ mensaje })
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, 'Error al enviar el broadcast');
        return alert(msg);
    }
    const data = await res.json();
    alert(`Mensajes enviados: ${data.enviados}`);
}
