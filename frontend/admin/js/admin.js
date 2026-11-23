let token = localStorage.getItem('adminToken');

if (token) {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';
    loadUsers();
}

async function doLogin() {
    const pass = document.getElementById('adminPass').value;
    const res = await fetch('/api/admin/login', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password: pass})
    });
    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('adminToken', data.token);
        location.reload();
    } else { alert('Contraseña incorrecta'); }
}

function logout() { localStorage.removeItem('adminToken'); location.reload(); }

function switchTab(tabName, event) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('panel-' + tabName).classList.add('active');
    if (tabName === 'users') loadUsers();
    if (tabName === 'withdrawals') loadWithdrawals();
}

async function loadUsers() {
    const search = document.getElementById('searchId').value;
    const res = await fetch(`/api/admin/users?telegram_id=${search}`, {
        headers: {'Authorization': `Bearer ${token}`}
    });
    const users = await res.json();
    document.getElementById('usersTable').innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.nombre || 'Sin nombre'} ${u.banned ? '🚫' : ''}</td>
            <td>${u.congelado.toFixed(2)}</td>
            <td>${u.retirable.toFixed(2)}</td>
            <td>
                <button class="btn-sm" onclick="editBalance('${u.id}', 'retirable', 'sumar')">+10 Ret</button>
                <button class="btn-sm btn-red" onclick="toggleBan('${u.id}', ${u.banned})">${u.banned ? 'Desbanear' : 'Banear'}</button>
            </td>
        </tr>
    `).join('');
}

async function editBalance(id, campo, accion) {
    const monto = prompt("Monto a modificar:", "10");
    if (!monto) return;
    await fetch(`/api/admin/users/${id}/balance`, {
        method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({campo, accion, monto: parseFloat(monto)})
    });
    loadUsers();
}

async function toggleBan(id, isBanned) {
    if (!confirm(`¿Seguro que quieres ${isBanned ? 'desbanear' : 'banear'} a este usuario?`)) return;
    await fetch(`/api/admin/users/${id}/ban`, {
        method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({banear: !isBanned})
    });
    loadUsers();
}

async function loadWithdrawals() {
    const res = await fetch('/api/admin/withdrawals', { headers: {'Authorization': `Bearer ${token}`} });
    const data = await res.json();
    document.getElementById('withdrawalsTable').innerHTML = data.map(w => `
        <tr>
            <td>${w.id}</td>
            <td>${w.user_id}</td>
            <td>${w.monto} USDT</td>
            <td>${w.red}</td>
            <td>
                <button class="btn-sm btn-green" onclick="approveTx(${w.id})">Aprobar</button>
                <button class="btn-sm btn-red" onclick="rejectTx(${w.id})">Rechazar</button>
            </td>
        </tr>
    `).join('');
}

async function approveTx(id) {
    await fetch(`/api/admin/withdrawals/${id}/approve`, { method: 'POST', headers: {'Authorization': `Bearer ${token}`} });
    loadWithdrawals();
}

async function rejectTx(id) {
    await fetch(`/api/admin/withdrawals/${id}/reject`, { method: 'POST', headers: {'Authorization': `Bearer ${token}`} });
    loadWithdrawals();
}

async function runSorteo() {
    const monto = parseFloat(document.getElementById('sorteoMonto').value);
    if (!monto) return alert('Ingresa un monto');
    if (!confirm(`¿Acreditar ${monto} USDT a TODOS los usuarios?`)) return;
    await fetch('/api/admin/sorteo-masivo', {
        method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({monto})
    });
    alert('Sorteo ejecutado con éxito');
}

async function runBroadcast() {
    const mensaje = document.getElementById('broadcastMsg').value;
    if (!mensaje) return alert('Escribe un mensaje');
    if (!confirm('¿Enviar este mensaje a TODOS los usuarios?')) return;
    const res = await fetch('/api/admin/broadcast', {
        method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({mensaje})
    });
    const data = await res.json();
    alert(`Mensajes enviados: ${data.enviados}`);
}
