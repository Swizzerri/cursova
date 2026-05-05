// ============ ДАННЫЕ ============
let users = [];
let currentUser = null;
let bookings = [];
let verificationCodes = {}; // Хранение кодов подтверждения
let authMode = 'login'; // 'login' или 'register'
let tempEmail = ''; // Временное хранение email для верификации

// Маршруты с фото
const routesData = [
    { id: 1, from: 'Москва', to: 'Санкт-Петербург', price: 1500, time: '08:00', img: 'https://images.unsplash.com/photo-1558231902-120029b46294?w=500&q=80' },
    { id: 2, from: 'Казань', to: 'Нижний Новгород', price: 900, time: '14:30', img: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=500&q=80' },
    { id: 3, from: 'Сочи', to: 'Адлер', price: 450, time: '10:15', img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=500&q=80' },
    { id: 4, from: 'Екатеринбург', to: 'Челябинск', price: 600, time: '18:00', img: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=500&q=80' }
];

// ============ ИНИЦИАЛИЗАЦИЯ ============
function initApp() {
    loadUsers();
    loadBookings();
    loadUserSession();
    renderRoutes();
    
    // Клик по имени пользователя
    const nameDisplay = document.getElementById('userNameDisplay');
    if (nameDisplay) {
        nameDisplay.style.cursor = 'pointer';
        nameDisplay.onclick = () => {
            if (currentUser) openProfileModal();
            else openAuthModal('login');
        };
    }
}

// ============ ПОЛЬЗОВАТЕЛИ ============
function loadUsers() {
    const saved = localStorage.getItem('busUsers');
    users = saved ? JSON.parse(saved) : [];
    if (!saved) {
        // Тестовый пользователь
        users.push({
            id: 1,
            name: "Тестовый Пользователь",
            email: "test@test.com",
            createdAt: new Date().toISOString()
        });
        saveUsers();
    }
}

function saveUsers() {
    localStorage.setItem('busUsers', JSON.stringify(users));
}

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-значный код
}

function sendVerificationCode(email) {
    const code = generateVerificationCode();
    verificationCodes[email] = {
        code: code,
        expires: Date.now() + 5 * 60 * 1000, // 5 минут
        attempts: 0
    };
    
    // Имитация отправки email
    console.log(`📧 Код для ${email}: ${code}`);
    
    // Показываем код в уведомлении (для демонстрации)
    showNotification(`📩 Код подтверждения: ${code}\n(В реальном приложении придет на email)`, 'info');
    
    return code;
}

function verifyCode(email, code) {
    const record = verificationCodes[email];
    if (!record) return { success: false, error: 'Код не отправлен' };
    
    if (Date.now() > record.expires) {
        delete verificationCodes[email];
        return { success: false, error: 'Код истек. Запросите новый.' };
    }
    
    record.attempts++;
    if (record.attempts > 3) {
        delete verificationCodes[email];
        return { success: false, error: 'Слишком много попыток. Запросите новый код.' };
    }
    
    if (record.code === code) {
        delete verificationCodes[email];
        return { success: true };
    }
    
    return { success: false, error: `Неверный код. Осталось попыток: ${3 - record.attempts}` };
}

function registerUser(name, email) {
    if (users.find(u => u.email === email)) {
        return { success: false, error: 'Пользователь с таким email уже существует' };
    }
    
    const newUser = {
        id: Date.now(),
        name,
        email,
        createdAt: new Date().toISOString(),
        phone: '',
        avatar: null
    };
    
    users.push(newUser);
    saveUsers();
    return { success: true, user: newUser };
}

function loginUser(email) {
    const user = users.find(u => u.email === email);
    if (!user) {
        return { success: false, error: 'Пользователь не найден. Зарегистрируйтесь.' };
    }
    return { success: true, user };
}

function saveUserSession() {
    if (currentUser) {
        localStorage.setItem('busCurrentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('busCurrentUser');
    }
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
    
    if (display) {
        display.innerHTML = currentUser ? `👤 ${currentUser.name}` : 'Гость';
        display.style.cursor = 'pointer';
    }
    if (loginBtn) loginBtn.style.display = currentUser ? 'none' : 'inline-block';
    if (logoutBtn) logoutBtn.style.display = currentUser ? 'inline-block' : 'none';
}

// ============ МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ ============
window.openAuthModal = function(mode = 'login') {
    authMode = mode;
    tempEmail = '';
    
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.id = 'authModal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="qr-content auth-modal-content" style="max-width:450px;position:relative">
            <button onclick="closeAuthModal()" style="position:absolute;right:15px;top:15px;background:transparent;color:#64748b;padding:5px;font-size:1.5rem">&times;</button>
            
            <div id="authStep1">
                <h2 style="color:#0f172a;margin-bottom:10px">${mode === 'login' ? '🔐 Вход' : '📝 Регистрация'}</h2>
                <p style="color:#64748b;margin-bottom:25px">Введите ваш email для получения кода подтверждения</p>
                
                <form onsubmit="handleEmailSubmit(event)">
                    <div class="form-group">
                        <label style="color:#0f172a;text-align:left;display:block;margin-bottom:8px">Email адрес</label>
                        <input type="email" id="authEmail" placeholder="your@email.com" required 
                               style="width:100%;padding:12px 15px;border-radius:12px;border:2px solid #e2e8f0;font-size:1rem">
                    </div>
                    
                    ${mode === 'register' ? `
                    <div class="form-group">
                        <label style="color:#0f172a;text-align:left;display:block;margin-bottom:8px">Ваше имя</label>
                        <input type="text" id="authName" placeholder="Иван Иванов" required 
                               style="width:100%;padding:12px 15px;border-radius:12px;border:2px solid #e2e8f0;font-size:1rem">
                    </div>
                    ` : ''}
                    
                    <button type="submit" style="width:100%;padding:14px;margin-top:10px">
                        ${mode === 'login' ? '📩 Получить код' : '📝 Зарегистрироваться'}
                    </button>
                </form>
                
                <p style="margin-top:20px;color:#64748b;font-size:0.9rem">
                    ${mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'} 
                    <span style="color:#FF6B6B;cursor:pointer;text-decoration:underline" 
                          onclick="toggleAuthMode()">${mode === 'login' ? 'Зарегистрироваться' : 'Войти'}</span>
                </p>
            </div>
            
            <div id="authStep2" style="display:none">
                <h2 style="color:#0f172a;margin-bottom:10px">🔢 Подтверждение</h2>
                <p style="color:#64748b;margin-bottom:10px">Код отправлен на</p>
                <p style="color:#0f172a;font-weight:600;margin-bottom:20px" id="confirmEmail"></p>
                
                <form onsubmit="handleCodeSubmit(event)">
                    <div class="form-group">
                        <label style="color:#0f172a;text-align:left;display:block;margin-bottom:8px">Код из 6 цифр</label>
                        <input type="text" id="authCode" placeholder="000000" maxlength="6" 
                               pattern="[0-9]{6}" required 
                               style="width:100%;padding:12px 15px;border-radius:12px;border:2px solid #e2e8f0;font-size:1.2rem;text-align:center;letter-spacing:5px">
                        <p style="font-size:0.8rem;color:#64748b;margin-top:8px">
                            ⏱️ Код действителен 5 минут
                        </p>
                    </div>
                    
                    <button type="submit" style="width:100%;padding:14px;margin-top:10px">
                        ✅ Подтвердить
                    </button>
                </form>
                
                <button onclick="resendCode()" style="width:100%;padding:12px;margin-top:10px;background:transparent;color:#FF6B6B;border:2px solid #FF6B6B">
                    📤 Отправить код повторно
                </button>
                
                <button onclick="backToEmail()" style="width:100%;padding:10px;margin-top:10px;background:transparent;color:#64748b">
                    ← Изменить email
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

window.closeAuthModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.remove();
    }
};

window.toggleAuthMode = function() {
    closeAuthModal();
    setTimeout(() => openAuthModal(authMode === 'login' ? 'register' : 'login'), 100);
};

window.handleEmailSubmit = function(event) {
    event.preventDefault();
    
    const email = document.getElementById('authEmail').value.trim();
    const name = authMode === 'register' ? document.getElementById('authName').value.trim() : '';
    
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Введите корректный email', 'error');
        return;
    }
    
    if (authMode === 'register') {
        // Регистрация
        const result = registerUser(name, email);
        if (!result.success) {
            showNotification(result.error, 'error');
            return;
        }
    } else {
        // Вход
        const result = loginUser(email);
        if (!result.success) {
            showNotification(result.error, 'error');
            return;
        }
    }
    
    // Отправка кода
    tempEmail = email;
    sendVerificationCode(email);
    
    // Показываем шаг 2
    document.getElementById('authStep1').style.display = 'none';
    document.getElementById('authStep2').style.display = 'block';
    document.getElementById('confirmEmail').textContent = email;
    document.getElementById('authCode').focus();
};

window.handleCodeSubmit = function(event) {
    event.preventDefault();
    
    const code = document.getElementById('authCode').value.trim();
    
    const result = verifyCode(tempEmail, code);
    if (!result.success) {
        showNotification(result.error, 'error');
        return;
    }
    
    // Успешная авторизация
    const user = users.find(u => u.email === tempEmail);
    currentUser = { id: user.id, name: user.name, email: user.email };
    saveUserSession();
    updateAuthUI();
    
    closeAuthModal();
    showNotification(`Добро пожаловать, ${user.name}! 🎉`, 'success');
    
    // Очищаем форму
    document.getElementById('authStep1').style.display = 'block';
    document.getElementById('authStep2').style.display = 'none';
    document.getElementById('authEmail').value = '';
    if (document.getElementById('authName')) document.getElementById('authName').value = '';
    document.getElementById('authCode').value = '';
};

window.resendCode = function() {
    if (!tempEmail) return;
    sendVerificationCode(tempEmail);
    showNotification('Новый код отправлен!', 'success');
};

window.backToEmail = function() {
    document.getElementById('authStep1').style.display = 'block';
    document.getElementById('authStep2').style.display = 'none';
    document.getElementById('authCode').value = '';
};

// ============ БРОНИРОВАНИЯ ============
function loadBookings() {
    const saved = localStorage.getItem('busBookings');
    bookings = saved ? JSON.parse(saved) : [];
}

function saveBookings() {
    localStorage.setItem('busBookings', JSON.stringify(bookings));
}

function addBooking(booking) {
    bookings.push(booking);
    saveBookings();
}

function getUserBookings(userId) {
    return bookings.filter(b => b.userId === userId && b.status !== 'refunded');
}

function cancelBooking(bookingId, reason, cardNumber) {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
        booking.status = 'refunded';
        booking.refundReason = reason;
        booking.refundCard = cardNumber;
        booking.refundDate = new Date().toLocaleString();
        saveBookings();
        return true;
    }
    return false;
}

// ============ ОТРИСОВКА МАРШРУТОВ ============
function renderRoutes() {
    const container = document.querySelector('.routes-grid');
    if (!container) return;
    
    container.innerHTML = routesData.map(route => `
        <div class="route-card" onclick="startBooking(${route.id})">
            <div class="route-img" style="background-image: url('${route.img}')"></div>
            <div class="route-title">${route.from} → ${route.to}</div>
            <div class="route-details">🕐 Отправление: ${route.time}</div>
            <div style="color: #FFB347; font-weight: bold; font-size: 1.2rem; margin-top: 10px;">
                ${route.price} ₽
            </div>
            <button style="margin-top: 15px; width: 100%;">Выбрать места</button>
        </div>
    `).join('');
}

// ============ ВЫБОР МЕСТ ============
window.startBooking = function(routeId) {
    if (!currentUser) {
        showNotification('Сначала войдите в аккаунт!', 'error');
        openAuthModal('login');
        return;
    }
    const route = routesData.find(r => r.id === routeId);
    openSeatSelection(route);
};

let selectedSeat = null;
let selectedRoute = null;

function openSeatSelection(route) {
    selectedRoute = route;
    selectedSeat = null;
    
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.id = 'seatModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="qr-content" style="color:#0f172a;text-align:left;max-width:450px">
            <h2 style="margin-bottom:10px">${route.from} → ${route.to}</h2>
            <p style="color:#64748b;margin-bottom:15px">💰 ${route.price} ₽ | 🕐 ${route.time}</p>
            <div class="seats-grid" id="seatGrid"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
                <span id="totalPrice" style="font-weight:bold;font-size:1.1rem">0 ₽</span>
                <button id="buyBtn" disabled>Купить билет</button>
            </div>
            <button onclick="closeSeatModal()" style="margin-top:10px;background:#64748b;width:100%">Отмена</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    const grid = document.getElementById('seatGrid');
    for (let i = 1; i <= 12; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.textContent = i;
        
        const isBooked = bookings.some(b => b.routeId === route.id && b.seatNumber === i && b.status === 'paid');
        if (isBooked) seat.classList.add('booked');
        
        seat.onclick = () => {
            if (seat.classList.contains('booked')) return;
            document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
            seat.classList.add('selected');
            selectedSeat = i;
            document.getElementById('totalPrice').textContent = `${route.price} ₽`;
            document.getElementById('buyBtn').disabled = false;
            document.getElementById('buyBtn').onclick = () => confirmPurchase(route, i);
        };
        grid.appendChild(seat);
    }
}

window.closeSeatModal = function() {
    const modal = document.getElementById('seatModal');
    if (modal) modal.remove();
    selectedSeat = null;
};

function confirmPurchase(route, seatNumber) {
    const newBooking = {
        id: Date.now(),
        userId: currentUser.id,
        routeId: route.id,
        routeName: `${route.from} → ${route.to}`,
        seatNumber,
        price: route.price,
        date: new Date().toLocaleDateString(),
        status: 'paid',
        ticketNumber: `TKT${Date.now()}`
    };
    
    addBooking(newBooking);
    closeSeatModal();
    showNotification('Билет успешно куплен! 🎉', 'success');
    setTimeout(() => openProfileModal(), 500);
}

// ============ ПРОФИЛЬ ============
function openProfileModal() {
    if (!currentUser) return;
    
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.id = 'profileModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="qr-content" style="color:#0f172a;max-width:600px;max-height:80vh;overflow-y:auto">
            <button onclick="closeProfileModal()" style="position:absolute;right:15px;top:15px;background:transparent;color:#64748b;padding:5px;font-size:1.5rem">&times;</button>
            
            <h2 style="margin-bottom:10px">👤 Профиль</h2>
            <div style="background:linear-gradient(135deg,#FFB347,#FF6B6B);color:white;padding:20px;border-radius:15px;margin-bottom:20px">
                <h3 style="margin-bottom:5px">${currentUser.name}</h3>
                <p style="opacity:0.9;font-size:0.95rem">${currentUser.email}</p>
            </div>
            
            <h3 style="margin-bottom:15px;border-bottom:2px solid #e2e8f0;padding-bottom:8px">🎫 Мои билеты</h3>
            <div id="profileBookings" style="text-align:left"></div>
            
            <button onclick="logoutUser()" style="margin-top:20px;width:100%;background:#ef4444">🚪 Выйти из аккаунта</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    loadProfileBookings();
}

window.closeProfileModal = function() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.remove();
};

function loadProfileBookings() {
    const container = document.getElementById('profileBookings');
    if (!container) return;
    
    const myBookings = getUserBookings(currentUser.id);
    
    if (myBookings.length === 0) {
        container.innerHTML = '<p style="color:#64748b;padding:30px;text-align:center">У вас пока нет билетов<br><br><button onclick="closeProfileModal();document.querySelector(\'.tab-btn\').click()" style="margin-top:10px">🚌 Выбрать маршрут</button></p>';
        return;
    }
    
    container.innerHTML = myBookings.map(b => `
        <div style="background:#f8fafc;padding:15px;border-radius:12px;margin-bottom:15px;border:1px solid #e2e8f0">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
                <div>
                    <h4 style="color:#FFB347;margin-bottom:5px">${b.routeName}</h4>
                    <p style="font-size:0.9rem;color:#475569">🪑 Место №${b.seatNumber}</p>
                    <p style="font-size:0.85rem;color:#64748b">📅 ${b.date}</p>
                    <p style="font-family:monospace;font-size:0.8rem;color:#94a3b8;margin-top:5px">🎫 ${b.ticketNumber}</p>
                </div>
                <div style="text-align:right">
                    <span style="background:#10b981;color:white;padding:5px 12px;border-radius:15px;font-size:0.8rem;font-weight:600;display:block;margin-bottom:10px">Оплачен</span>
                    <p style="font-weight:bold;color:#0f172a">${b.price} ₽</p>
                </div>
            </div>
            <button onclick="openRefundModal(${b.id}, '${b.routeName}', ${b.price})" style="background:#ef4444;width:100%;margin-top:10px">
                ↩️ Оформить возврат
            </button>
        </div>
    `).join('');
}

// ============ ВОЗВРАТ ============
window.openRefundModal = function(bookingId, routeName, price) {
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.id = 'refundModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="qr-content" style="color:#0f172a;max-width:450px;text-align:left">
            <h2 style="color:#ef4444;margin-bottom:10px">↩️ Возврат билета</h2>
            <p style="color:#64748b;margin-bottom:5px">Маршрут: <strong>${routeName}</strong></p>
            <p style="color:#64748b;margin-bottom:20px">Сумма: <strong style="color:#10b981;font-size:1.2rem">${price} ₽</strong></p>
            
            <form onsubmit="processRefund(event, ${bookingId})">
                <div class="form-group">
                    <label style="color:#0f172a;text-align:left;display:block;margin-bottom:8px">Причина возврата *</label>
                    <select id="refundReason" required style="width:100%;padding:12px;border-radius:10px;border:2px solid #e2e8f0">
                        <option value="">Выберите причину</option>
                        <option value="changed_plans">Изменились планы</option>
                        <option value="illness">Болезнь</option>
                        <option value="emergency">Срочные обстоятельства</option>
                        <option value="other">Другая причина</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label style="color:#0f172a;text-align:left;display:block;margin-bottom:8px">Номер карты *</label>
                    <input type="text" id="cardNumber" placeholder="0000 0000 0000 0000" 
                           pattern="[0-9\s]{19}" maxlength="19" required 
                           style="width:100%;padding:12px;border-radius:10px;border:2px solid #e2e8f0">
                    <p style="font-size:0.75rem;color:#64748b;margin-top:5px">16 цифр</p>
                </div>
                
                <div style="background:#fef3c7;padding:12px;border-radius:10px;margin-bottom:15px;border-left:4px solid #f59e0b">
                    <p style="font-size:0.85rem;color:#92400e;margin:0">⚠️ Возврат: 3-5 рабочих дней</p>
                </div>
                
                <button type="submit" style="background:#ef4444;width:100%;margin-bottom:10px">Подтвердить возврат</button>
                <button type="button" onclick="closeRefundModal()" style="background:#64748b;width:100%">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Форматирование карты
    const cardInput = document.getElementById('cardNumber');
    cardInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = value;
    });
};

window.closeRefundModal = function() {
    const modal = document.getElementById('refundModal');
    if (modal) modal.remove();
};

window.processRefund = function(event, bookingId) {
    event.preventDefault();
    
    const reason = document.getElementById('refundReason').value;
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    
    if (cardNumber.length !== 16) {
        showNotification('Введите корректный номер карты', 'error');
        return;
    }
    
    const success = cancelBooking(bookingId, reason, cardNumber);
    
    if (success) {
        closeRefundModal();
        showNotification('Возврат оформлен! Средства поступят на карту', 'success');
        setTimeout(() => {
            closeProfileModal();
            openProfileModal();
        }, 1000);
    }
};

// ============ ВЫХОД ============
window.logoutUser = function() {
    currentUser = null;
    saveUserSession();
    updateAuthUI();
    closeProfileModal();
    showNotification('Вы вышли из аккаунта', 'success');
};

// ============ УВЕДОМЛЕНИЯ ============
window.showNotification = function(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = msg;
    if (type === 'error') el.style.background = '#ef4444';
    if (type === 'info') el.style.background = '#3b82f6';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
};

// Запуск
document.addEventListener('DOMContentLoaded', initApp);