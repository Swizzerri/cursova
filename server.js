const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.db');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Раздача статики из папки public

// --- ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('❌ Ошибка подключения к БД:', err.message);
    else console.log('✅ Подключено к SQLite базе данных');
});

// Создание таблиц при старте
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        route_id INTEGER NOT NULL,
        seat_number INTEGER NOT NULL,
        price INTEGER NOT NULL,
        status TEXT DEFAULT 'paid',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Добавляем тестового пользователя, если база пуста
    db.get("SELECT count(*) as count FROM users", (err, row) => {
        if (row.count === 0) {
            const testId = uuidv4();
            bcrypt.hash('123456', 10, (err, hash) => {
                db.run(
                    "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
                    [testId, 'Тестовый Пользователь', 'test@test.com', hash],
                    () => console.log('👤 Создан тестовый пользователь: test@test.com / 123456')
                );
            });
        }
    });
});

// --- API МАРШРУТЫ ---

// 1. Регистрация
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'Заполните все поля' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        db.run(
            "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
            [id, name, email, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ success: false, error: 'Email уже занят' });
                    }
                    return res.status(500).json({ success: false, error: 'Ошибка БД' });
                }
                res.json({ success: true, user: { id, name, email } });
            }
        );
    } catch (err) {
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// 2. Вход
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        if (!user) return res.status(401).json({ success: false, error: 'Неверный email или пароль' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            res.json({
                success: true,
                user: { id: user.id, name: user.name, email: user.email }
            });
        } else {
            res.status(401).json({ success: false, error: 'Неверный email или пароль' });
        }
    });
});

// 3. Получение маршрутов (статика + фото)
app.get('/api/routes', (req, res) => {
    const routes = [
        {
            id: 1,
            from: 'Москва',
            to: 'Санкт-Петербург',
            price: 1500,
            time: '08:00',
            img: 'https://images.unsplash.com/photo-1558231902-120029b46294?w=500&q=80'
        },
        {
            id: 2,
            from: 'Казань',
            to: 'Нижний Новгород',
            price: 900,
            time: '14:30',
            img: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=500&q=80'
        },
        {
            id: 3,
            from: 'Сочи',
            to: 'Адлер',
            price: 450,
            time: '10:15',
            img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=500&q=80'
        },
        {
            id: 4,
            from: 'Екатеринбург',
            to: 'Челябинск',
            price: 600,
            time: '18:00',
            img: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=500&q=80'
        }
    ];
    res.json(routes);
});

// 4. ПОКУПКА БИЛЕТА — С ТРАНЗАКЦИЕЙ И ПРОВЕРКОЙ ЗАНЯТОСТИ МЕСТА
app.post('/api/bookings', (req, res) => {
    const { userId, routeId, seatNumber, price } = req.body;

    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Проверяем, не занято ли место
        db.get(
            "SELECT id FROM bookings WHERE route_id = ? AND seat_number = ? AND status != 'refunded'",
            [routeId, seatNumber],
            (err, row) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ success: false, error: 'Ошибка проверки мест' });
                }

                if (row) {
                    db.run("ROLLBACK");
                    return res.status(400).json({ success: false, error: 'Это место уже занято!' });
                }

                // Имитируем задержку обработки платежа (1 сек)
                setTimeout(() => {
                    const bookingId = uuidv4();

                    db.run(
                        "INSERT INTO bookings (id, user_id, route_id, seat_number, price) VALUES (?, ?, ?, ?, ?)",
                        [bookingId, userId, routeId, seatNumber, price],
                        function(err) {
                            if (err) {
                                db.run("ROLLBACK");
                                return res.status(500).json({ success: false, error: 'Ошибка создания брони' });
                            }

                            // Фиксируем транзакцию
                            db.run("COMMIT", (err) => {
                                if (err) {
                                    db.run("ROLLBACK");
                                    return res.status(500).json({ success: false, error: 'Ошибка фиксации' });
                                }
                                console.log(`✅ Транзакция успешна: Билет ${bookingId} куплен`);
                                res.json({ success: true, bookingId });
                            });
                        }
                    );
                }, 1000);
            }
        );
    });
});

// 5. Получить мои билеты
app.get('/api/bookings/:userId', (req, res) => {
    const sql = `
        SELECT b.*, 
               CASE b.route_id 
                 WHEN 1 THEN 'Москва - Санкт-Петербург'
                 WHEN 2 THEN 'Казань - Нижний Новгород'
                 WHEN 3 THEN 'Сочи - Адлер'
                 WHEN 4 THEN 'Екатеринбург - Челябинск'
                 ELSE 'Неизвестный маршрут'
               END as route_name
        FROM bookings b
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `;

    db.all(sql, [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Ошибка БД' });
        res.json(rows);
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});