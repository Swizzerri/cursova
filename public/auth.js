// ============ СОСТОЯНИЕ ПРИЛОЖЕНИЯ ============
let users = [];
let currentUser = null;
let bookings = [];
let selectedRoute = null;
let selectedSeat = null;

// Данные маршрутов — ИСПРАВЛЕНО: используем routesData для совместимости
const routesData = [
    { id: 1, from: "Москва", to: "Санкт-Петербург", duration: "7ч", price: 1450, image: "https://cdn.culture.ru/images/a0965465-3217-58e1-a3ab-3659a07cd2e8", cityPhoto: "https://i.ytimg.com/vi/ilUPzCADxoA/maxresdefault.jpg" },
    { id: 2, from: "Москва", to: "Казань", duration: "11ч", price: 2100, image: "https://oneischool.com/wp-content/uploads/2024/11/k2.png", cityPhoto: "https://bigtrip.by/storage/organizations/12274/bswg1hub.jpg" },
    { id: 3, from: "СПб", to: "Великий Новгород", duration: "3ч", price: 890, image: "https://avatars.mds.yandex.net/i?id=a9a0a94042d5ea0278dbcb32fa89efea33802246-5163220-images-thumbs&n=13", cityPhoto: "https://avatars.mds.yandex.net/i?id=4dae1242347d11906d1f323f3196e17f_l-8209870-images-thumbs&n=13" },
    { id: 4, from: "Екатеринбург", to: "Тюмень", duration: "4ч", price: 1050, image: "https://avatars.mds.yandex.net/get-entity_search/9706867/1262386119/orig", cityPhoto: "https://blog.ufs-online.ru/media/7492/shutterstock_2001270581-min.jpg" },
    { id: 5, from: "Новосибирск", to: "Томск", duration: "5ч", price: 1250, image: "https://avatars.mds.yandex.net/i?id=94ec4aad8f422add447220660ada7c1a_l-10401675-images-thumbs&n=13", cityPhoto: "https://cdni-vm.servicecdn.ru/2022.12/original/1200_63aaf78682682c1ec1a7cf31.jpg" },
    { id: 6, from: "Краснодар", to: "Сочи", duration: "6ч", price: 1550, image: "https://avatars.mds.yandex.net/get-entity_search/7765675/1261541475/orig", cityPhoto: "https://avatars.mds.yandex.net/get-vertis-journal/4080458/169.jpg_1741332106837/orig" }
];

// ============ 🔐 АВТОРИЗАЦИЯ ============
function loadUsers() {
    const saved = localStorage.getItem('busUsers');
    users = saved ? JSON.parse(saved) : [{ id: 1, name: "Тестовый Пользователь", email: "test@test.com", password: "123456" }];
    if (!saved) saveUsers();
}

function saveUsers() {
    localStorage.setItem('busUsers', JSON.stringify(users));
}

function registerUser(name, email, password) {
    if (users.find(u => u.email === email.toLowerCase())) {
        return { success: false, error: 'Пользователь с таким email уже существует' };
    }
    if (password.length < 4) {
        return { success: false, error: 'Пароль должен содержать минимум 4 символа' };
    }
    const newUser = { id: Date.now(), name, email: email.toLowerCase(), password };
    users.push(newUser);
    saveUsers();
    return { success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email } };
}

function loginUser(email, password) {
    const user = users.find(u => u.email === email.toLowerCase() && u.password === password);
    return user ? { success: true, user: { id: user.id, name: user.name, email: user.email } }
        : { success: false, error: 'Неверный email или пароль' };
}

function saveUserSession() {
    if (currentUser) localStorage.setItem('busCurrentUser', JSON.stringify(currentUser));
    else localStorage.removeItem('busCurrentUser');
}

function loadUserSession() {
    const saved = localStorage.getItem('busCurrentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        updateAuthUI();
    }
}

function updateAuthUI() {
    const display = document.getElementById('userNameDisplay');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (display) display.innerHTML = currentUser ? `👤 ${currentUser.name}` : 'Гость';
    if (loginBtn) loginBtn.style.display = currentUser ? 'none' : 'inline-block';
    if (logoutBtn) logoutBtn.style.display = currentUser ? 'inline-block' : 'none';
}

// ============ 🖼️ МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ ============
window.openAuthModal = function (mode = 'login') {
    if (document.getElementById('authModal')) return;

    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'qr-modal';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="qr-content" style="padding: 2.5rem 2rem; max-width: 420px; text-align: left;">
            <h2 id="authTitle" style="color:#0f172a; margin-bottom: 8px; font-size: 1.8rem; text-align: center;">
                ${mode === 'login' ? '🔐 Вход' : '✨ Регистрация'}
            </h2>
            <p id="authSubtitle" style="color:#64748b; margin-bottom: 24px; font-size: 0.95rem; text-align: center;">
                ${mode === 'login' ? 'Введите данные для доступа к билетам' : 'Создайте аккаунт за 10 секунд'}
            </p>

            <form id="authForm" onsubmit="handleAuthSubmit(event)">
                <div id="nameField" style="display: ${mode === 'register' ? 'block' : 'none'}; margin-bottom: 16px;">
                    <label style="text-align:left; display:block; color:#334155; font-weight:600; margin-bottom:8px; font-size:0.9rem;">Ваше имя</label>
                    <input type="text" id="authName" placeholder="Иван Иванов" style="width:100%; padding:14px 18px; border-radius:40px; border:2px solid #e2e8f0; font-size:1rem; outline:none;">
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="text-align:left; display:block; color:#334155; font-weight:600; margin-bottom:8px; font-size:0.9rem;">Email</label>
                    <input type="email" id="authEmail" placeholder="your@email.com" required style="width:100%; padding:14px 18px; border-radius:40px; border:2px solid #e2e8f0; font-size:1rem; outline:none;">
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="text-align:left; display:block; color:#334155; font-weight:600; margin-bottom:8px; font-size:0.9rem;">Пароль</label>
                    <input type="password" id="authPass" placeholder="••••••••" required style="width:100%; padding:14px 18px; border-radius:40px; border:2px solid #e2e8f0; font-size:1rem; outline:none;">
                </div>

                <div id="authError" class="error-msg" style="min-height: 20px; margin-bottom: 12px; text-align: center;"></div>
                
                <button type="submit" style="width:100%; padding:15px; margin-top:8px; font-size:1rem; font-weight:600;">
                    ${mode === 'login' ? 'Войти в аккаунт' : 'Зарегистрироваться'}
                </button>
            </form>

            <div class="auth-switch" style="margin-top:20px; font-size:0.95rem; color:#64748b; text-align: center;">
                ${mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                <span style="color:#FF6B6B; font-weight:600; cursor:pointer; margin-left:4px;" onclick="toggleAuthMode()">
                    ${mode === 'login' ? 'Создать' : 'Войти'}
                </span>
            </div>
            
            <div style="text-align:center; margin-top:15px;">
                <span style="color:#94a3b8; font-size:0.85rem; cursor:pointer;" onclick="closeAuthModal()">Закрыть</span>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.querySelector('input')?.focus(), 100);
};

window.closeAuthModal = function () {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 200);
    }
};

window.toggleAuthMode = function () {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    const isLogin = modal.querySelector('button[type="submit"]').textContent.includes('Войти');
    closeAuthModal();
    setTimeout(() => window.openAuthModal(isLogin ? 'register' : 'login'), 250);
};

window.handleAuthSubmit = function (e) {
    e.preventDefault();
    const errorEl = document.getElementById('authError');
    errorEl.textContent = '';

    const mode = document.querySelector('button[type="submit"]').textContent.includes('Войти') ? 'login' : 'register';
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPass').value;
    const name = mode === 'register' ? document.getElementById('authName').value.trim() : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorEl.textContent = 'Введите корректный email';
        return;
    }
    if (pass.length < 4) {
        errorEl.textContent = 'Пароль слишком короткий (минимум 4 символа)';
        return;
    }

    let res;
    if (mode === 'login') {
        res = loginUser(email, pass);
    } else {
        if (!name) { errorEl.textContent = 'Укажите ваше имя'; return; }
        res = registerUser(name, email, pass);
    }

    if (res.success) {
        currentUser = res.user;
        saveUserSession();
        updateAuthUI();
        closeAuthModal();
        showNotification(`Добро пожаловать, ${currentUser.name}! 🎉`, 'success');
        if (typeof window.switchTab === 'function') window.switchTab('bookings');
    } else {
        errorEl.textContent = res.error;
    }
};

// ============ 🚌 МАРШРУТЫ И БРОНИРОВАНИЕ — ИСПРАВЛЕНО ============
function renderRoutes() {
    const container = document.querySelector('.routes-grid');
    if (!container) return;

    // ✅ ИСПРАВЛЕНО: routesData + route.image + route.duration
    container.innerHTML = routesData.map(route => `
        <div class="route-card" onclick="startBooking(${route.id})">
            <div class="route-img" style="background-image: url('${route.image}')"></div>
            <div class="route-title">${route.from} → ${route.to}</div>
            <div class="route-details">⏱️ В пути: ${route.duration}</div>
            <div style="color:#FFB347;font-weight:bold;font-size:1.2rem;margin-top:10px">
                ${route.price} ₽
            </div>
            <button style="margin-top:15px;width:100%">Выбрать места</button>
        </div>
    `).join('');
}

window.startBooking = function (routeId) {
    if (!currentUser) {
        showNotification('Сначала войдите!', 'error');
        window.openAuthModal('login');
        return;
    }
    // ✅ ИСПРАВЛЕНО: routesData.find
    selectedRoute = routesData.find(r => r.id === routeId);
    selectedSeat = null;
    openSeatModal();
};

function openSeatModal() {
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.id = 'seatModal';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="qr-content" style="color:#0f172a;text-align:left;max-width:400px">
            <h2 style="margin-bottom:10px">${selectedRoute.from} → ${selectedRoute.to}</h2>
            <!-- ✅ ИСПРАВЛЕНО: duration вместо time -->
            <p style="color:#64748b;margin-bottom:15px">💰 ${selectedRoute.price} ₽ | ⏱️ ${selectedRoute.duration}</p>
            <div class="seats-grid" id="seatGrid"></div>
            <button id="buyBtn" disabled style="width:100%;margin-top:15px;opacity:0.5">Купить билет</button>
            <button onclick="closeModal('seatModal')" style="width:100%;margin-top:10px;background:#64748b">Отмена</button>
        </div>
    `;

    document.body.appendChild(modal);

    const grid = document.getElementById('seatGrid');
    for (let i = 1; i <= 12; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.textContent = i;

        const isBooked = bookings.some(b =>
            b.routeId === selectedRoute.id &&
            b.seatNumber === i &&
            b.status === 'paid'
        );
        if (isBooked) seat.classList.add('booked');

        seat.onclick = () => {
            if (seat.classList.contains('booked')) return;
            document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
            seat.classList.add('selected');
            selectedSeat = i;
            const btn = document.getElementById('buyBtn');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.onclick = () => showPaymentModal();
        };
        grid.appendChild(seat);
    }
}

// ============ 💳 QR-ОПЛАТА ============
function showPaymentModal() {
    closeModal('seatModal');
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.id = 'paymentModal';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="qr-content" style="max-width:350px">
            <h2 style="color:#0f172a;margin-bottom:10px">💳 Оплата билета</h2>
            <p style="color:#64748b;margin-bottom:15px">Сумма: <b style="color:#10b981;font-size:1.2rem">${selectedRoute.price} ₽</b></p>
            <div class="qr-code-container">
                <canvas id="qrCanvas" width="200" height="200"></canvas>
            </div>
            <p style="font-size:0.85rem;color:#64748b;margin:10px 0">Отсканируйте код в приложении банка</p>
            <button onclick="confirmPayment()" style="width:100%;background:#10b981;margin-bottom:10px">✅ Оплатили</button>
            <button onclick="closeModal('paymentModal')" style="width:100%;background:#64748b">Отмена</button>
        </div>
    `;

    document.body.appendChild(modal);
    generateFakeQR('qrCanvas');
}

function generateFakeQR(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 200, cells = 25, cellSize = size / cells;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';

    function drawMarker(x, y) {
        ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
    }

    drawMarker(0, 0);
    drawMarker(size - cellSize * 7, 0);
    drawMarker(0, size - cellSize * 7);

    for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
            if ((x < 8 && y < 8) || (x > cells - 9 && y < 8) || (x < 8 && y > cells - 9)) continue;
            if (Math.random() > 0.5) ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
}

function confirmPayment() {
    const newBooking = {
        id: Date.now(),
        userId: currentUser.id,
        routeId: selectedRoute.id,
        routeName: `${selectedRoute.from} → ${selectedRoute.to}`,
        seatNumber: selectedSeat,
        price: selectedRoute.price,
        date: new Date().toLocaleDateString(),
        status: 'paid',
        ticketNumber: `TKT-${Math.floor(100000 + Math.random() * 900000)}`
    };

    addBooking(newBooking);
    closeModal('paymentModal');
    showNotification('Билет успешно оплачен! 🎉', 'success');
    setTimeout(() => {
        if (typeof window.switchTab === 'function') window.switchTab('bookings');
    }, 800);
}

// ============ 🎫 МОИ БИЛЕТЫ И ВОЗВРАТ ============
function loadBookings() {
    const saved = localStorage.getItem('busBookings');
    bookings = saved ? JSON.parse(saved) : [];
}

function saveBookings() {
    localStorage.setItem('busBookings', JSON.stringify(bookings));
}

function addBooking(b) {
    bookings.push(b);
    saveBookings();
    if (typeof renderMyBookings === 'function') renderMyBookings();
}

function getUserBookings(uid) {
    return bookings.filter(b => b.userId === uid);
}

function renderMyBookings() {
    const container = document.getElementById('bookingsContainer');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:2rem">Войдите, чтобы увидеть билеты</p>';
        return;
    }

    const myBookings = getUserBookings(currentUser.id);

    if (myBookings.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:2rem">У вас пока нет бронирований</p>';
        return;
    }

    container.innerHTML = myBookings.map(b => `
        <div class="booking-card">
            <div class="booking-info">
                <h3 style="color:#FFB347;margin-bottom:5px">${b.routeName}</h3>
                <p>🪑 Место: ${b.seatNumber} | 💰 ${b.price} ₽</p>
                <p class="ticket-number">🎫 ${b.ticketNumber}</p>
                <p style="font-size:0.8rem;color:#94a3b8;margin-top:5px">📅 ${b.date}</p>
            </div>
            <div style="text-align:right;display:flex;flex-direction:column;gap:8px;align-items:flex-end">
                <span class="booking-status ${b.status}">${b.status === 'paid' ? '✅ Оплачен' : '↩️ Возврат'}</span>
                ${b.status === 'paid' ? `<button class="refund-btn" onclick="openRefundModal(${b.id})">Оформить возврат</button>` : ''}
            </div>
        </div>
    `).join('');
}

window.openRefundModal = function (bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.id = 'refundModal';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="qr-content" style="color:#0f172a;text-align:left;max-width:450px">
            <h2 style="color:#ef4444;margin-bottom:10px">↩️ Возврат билета</h2>
            <p style="margin-bottom:15px">Маршрут: <b>${booking.routeName}</b> | Сумма: <b>${booking.price} ₽</b></p>
            <div class="refund-section">
                <div class="form-group">
                    <label>Причина возврата</label>
                    <select id="refundReason" style="width:100%;padding:10px;border-radius:10px">
                        <option value="changed_plans">Изменились планы</option>
                        <option value="illness">Болезнь</option>
                        <option value="emergency">Срочные обстоятельства</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Номер карты для возврата</label>
                    <div class="refund-input-group">
                        <input type="text" id="refundCard" placeholder="0000 0000 0000 0000" maxlength="19" style="flex:1">
                    </div>
                    <p id="cardError" class="error-msg"></p>
                </div>
            </div>
            <button onclick="processRefund(${bookingId})" style="width:100%;background:#ef4444;margin-top:10px">Подтвердить возврат</button>
            <button onclick="closeModal('refundModal')" style="width:100%;margin-top:10px;background:#64748b">Отмена</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('refundCard').addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
    });
};

window.processRefund = function (bookingId) {
    const cleanCard = document.getElementById('refundCard').value.replace(/\D/g, '');
    const errorEl = document.getElementById('cardError');

    if (cleanCard.length !== 16) {
        errorEl.textContent = 'Введите корректный номер карты (16 цифр)';
        return;
    }

    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx !== -1) {
        bookings[idx].status = 'refunded';
        bookings[idx].refundReason = document.getElementById('refundReason').value;
        bookings[idx].refundCard = cleanCard;
        bookings[idx].refundDate = new Date().toLocaleString();
        saveBookings();
        renderMyBookings();
        closeModal('refundModal');
        showNotification('Возврат оформлен. Средства поступят в течение 3 дней', 'success');
    }
};

// ============ 🧭 УПРАВЛЕНИЕ ВКЛАДКАМИ И УТИЛИТЫ ============
window.switchTab = function (tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active-tab'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const tab = document.getElementById(tabName + 'Tab');
    if (tab) tab.classList.add('active-tab');

    const btns = document.querySelectorAll('.tab-btn');
    if (tabName === 'routes') btns[0]?.classList.add('active');
    if (tabName === 'bookings') {
        btns[1]?.classList.add('active');
        if (typeof renderMyBookings === 'function') renderMyBookings();
    }
    if (tabName === 'about') btns[2]?.classList.add('active');
};

window.logoutUser = function () {
    currentUser = null;
    saveUserSession();
    updateAuthUI();
    showNotification('Вы вышли из аккаунта', 'info');
    window.switchTab('routes');
};

window.closeModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.remove();
};

window.showNotification = function (msg, type = 'success') {
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = msg;
    if (type === 'error') el.style.background = '#ef4444';
    if (type === 'info') el.style.background = '#3b82f6';
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 3000);
};

// ============ 🚀 ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadBookings();
    loadUserSession();
    renderRoutes();

    const loginBtn = document.getElementById('loginBtn');
    const nameDisplay = document.getElementById('userNameDisplay');

    if (loginBtn) loginBtn.onclick = () => window.openAuthModal('login');
    if (nameDisplay) {
        nameDisplay.style.cursor = 'pointer';
        nameDisplay.onclick = () => {
            if (currentUser) {
                if (typeof window.switchTab === 'function') window.switchTab('bookings');
            } else {
                window.openAuthModal('login');
            }
        };
    }
});