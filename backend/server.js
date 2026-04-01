const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const PORT = 3000;
const JWT_SECRET = 'your_super_secret_key'; // In production, use environment variables
const SALT_ROUNDS = 10;
const realtimeClients = new Set();

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Replace with your MySQL username
    password: '1234',  // Replace with your MySQL password
    database: 'medihub',
    waitForConnections: true,
    connectionLimit: 10
});

app.use(express.json());
app.use(express.static(FRONTEND_DIR));

const defaultMedicineImage = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80';

const sendRealtimeEvent = (res, event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const headerToken = authHeader && authHeader.split(' ')[1];
    const queryToken = req.query.token;
    const token = headerToken || queryToken;

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
};

const normalizeDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ');
    if (typeof value === 'string' && value.length <= 10) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 19).replace('T', ' ');
};

const formatDateOnly = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
};

const parseItems = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        return JSON.parse(value);
    } catch {
        return [];
    }
};

const sanitizeUser = (user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    address: user.address,
    name: user.name
});

const ensureColumn = async (tableName, columnName, definition) => {
    const [rows] = await pool.execute(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );

    if (rows[0].count === 0) {
        await pool.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
};

const ensureSchema = async () => {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            address TEXT,
            name VARCHAR(255)
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS stock (
            id INT AUTO_INCREMENT PRIMARY KEY,
            medicine VARCHAR(255) NOT NULL,
            batchNo VARCHAR(100),
            expiryDate DATE,
            quantity INT NOT NULL,
            supplierId INT,
            imageUrl TEXT,
            price DECIMAL(10, 2),
            manufactureDate DATE
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS sales (
            id INT AUTO_INCREMENT PRIMARY KEY,
            medicine VARCHAR(255),
            quantity INT,
            price DECIMAL(10, 2),
            paymentMethod VARCHAR(50)
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS orders (
            orderId VARCHAR(255) PRIMARY KEY,
            medicine TEXT,
            quantity INT,
            totalPrice DECIMAL(10, 2),
            username VARCHAR(255),
            deliveryAddress TEXT,
            paymentMethod VARCHAR(50),
            date DATETIME,
            status VARCHAR(50),
            customerId INT,
            items JSON
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            message TEXT,
            date DATETIME
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            message TEXT,
            date DATETIME,
            username VARCHAR(255),
            relatedOrderId VARCHAR(255),
            type VARCHAR(50),
            supplierId INT,
            isRead BOOLEAN DEFAULT FALSE
        )
    `);

    await ensureColumn('stock', 'batchNo', 'VARCHAR(100)');
    await ensureColumn('stock', 'expiryDate', 'DATE');
    await ensureColumn('stock', 'supplierId', 'INT');
    await ensureColumn('stock', 'imageUrl', 'TEXT');
    await ensureColumn('orders', 'customerId', 'INT');
    await ensureColumn('orders', 'items', 'JSON');
    await ensureColumn('notifications', 'supplierId', 'INT');
    await ensureColumn('notifications', 'isRead', 'BOOLEAN DEFAULT FALSE');
    await ensureColumn('notifications', 'medicineName', 'VARCHAR(255)');
    await ensureColumn('notifications', 'actionStatus', "VARCHAR(50) DEFAULT 'pending'");
};

const seedDemoData = async () => {
    const demoPassword = await bcrypt.hash('1234', SALT_ROUNDS);
    const demoUsers = [
        ['admin@medics.com', demoPassword, 'Admin', 'Main Branch', 'Admin User'],
        ['pharm@medics.com', demoPassword, 'Pharmacist', 'Pharmacy Floor', 'John Pharmacist'],
        ['supp@medics.com', demoPassword, 'Supplier', 'Supplier Warehouse', 'Medica Supplier'],
        ['cust@medics.com', demoPassword, 'Customer', '221B Baker Street', 'Jane Customer']
    ];

    for (const user of demoUsers) {
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE username = ? LIMIT 1',
            [user[0]]
        );
        if (existingUsers.length === 0) {
            await pool.execute(
                'INSERT INTO users (username, password, role, address, name) VALUES (?, ?, ?, ?, ?)',
                user
            );
        }
    }

    const [supplierRows] = await pool.execute(
        "SELECT id FROM users WHERE role = 'Supplier' ORDER BY id ASC LIMIT 1"
    );
    const supplierId = supplierRows[0]?.id || null;

    const medicines = [
        ['Paracetamol 500mg', 'B001', '2027-12-31', 500, supplierId, defaultMedicineImage, 25.00],
        ['Amoxicillin 250mg', 'B002', '2026-08-15', 200, supplierId, defaultMedicineImage, 40.00],
        ['Ibuprofen 400mg', 'B003', '2028-01-20', 350, supplierId, defaultMedicineImage, 35.00],
        ['Cetirizine 10mg', 'B004', '2027-04-10', 150, supplierId, defaultMedicineImage, 20.00],
        ['Vitamin C 1000mg', 'B005', '2028-05-30', 80, supplierId, defaultMedicineImage, 18.00]
    ];

    for (const medicine of medicines) {
        const [existingMedicines] = await pool.execute(
            'SELECT id FROM stock WHERE medicine = ? AND batchNo = ? LIMIT 1',
            [medicine[0], medicine[1]]
        );
        if (existingMedicines.length === 0) {
            await pool.execute(
                `INSERT INTO stock (medicine, batchNo, expiryDate, quantity, supplierId, imageUrl, price, manufactureDate)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
                medicine
            );
        }
    }
};

const loadDashboardData = async () => {
    await syncCustomerExpiryAlerts();

    const [users] = await pool.execute(
        'SELECT id, username, role, address, name FROM users ORDER BY id ASC'
    );
    const [stock] = await pool.execute('SELECT * FROM stock ORDER BY id ASC');
    const [sales] = await pool.execute('SELECT * FROM sales ORDER BY id ASC');
    const [ordersRaw] = await pool.execute('SELECT * FROM orders ORDER BY date DESC, orderId DESC');
    const [feedback] = await pool.execute('SELECT * FROM feedback ORDER BY date DESC, id DESC');
    const [notifications] = await pool.execute('SELECT * FROM notifications ORDER BY date DESC, id DESC');

    const orders = ordersRaw.map((order) => ({
        ...order,
        items: parseItems(order.items)
    }));

    return {
        users,
        stockData: stock,
        salesData: sales,
        expiryData: stock,
        orders,
        feedbackData: feedback,
        notifications
    };
};

const broadcastSnapshot = async (reason) => {
    if (realtimeClients.size === 0) return;

    try {
        const snapshot = await loadDashboardData();
        for (const client of realtimeClients) {
            sendRealtimeEvent(client, 'data-sync', { reason, snapshot });
        }
    } catch (error) {
        console.error('Realtime broadcast error:', error);
    }
};

const syncStockAlerts = async (connection) => {
    await connection.execute(
        "DELETE FROM notifications WHERE type IN ('EXPIRED', 'OUT_OF_STOCK')"
    );

    const [medicines] = await connection.execute(
        'SELECT id, medicine, batchNo, expiryDate, quantity, supplierId FROM stock'
    );
    const today = new Date().toISOString().slice(0, 10);

    for (const medicine of medicines) {
        const isExpired = medicine.expiryDate && formatDateOnly(medicine.expiryDate) < today;
        const isOutOfStock = Number(medicine.quantity) === 0;
        if (!isExpired && !isOutOfStock) continue;

        const type = isExpired ? 'EXPIRED' : 'OUT_OF_STOCK';
        const message = `Medicine ${medicine.medicine} (Batch: ${medicine.batchNo || 'N/A'}) is ${isExpired ? 'Expired' : 'Out of Stock'}. Please restock!`;

        await connection.execute(
            `INSERT INTO notifications (message, date, username, relatedOrderId, type, supplierId, isRead, medicineName, actionStatus)
             VALUES (?, NOW(), NULL, NULL, ?, ?, FALSE, ?, 'pending')`,
            [message, type, medicine.supplierId || null, medicine.medicine]
        );
    }
};

const syncCustomerExpiryAlerts = async () => {
    const [orders] = await pool.execute(
        'SELECT orderId, username, items FROM orders ORDER BY date DESC'
    );
    const today = new Date().toISOString().slice(0, 10);

    for (const order of orders) {
        const items = parseItems(order.items);
        for (const item of items) {
            if (!item?.expiryDate || item.expiryDate >= today) continue;

            const [existing] = await pool.execute(
                `SELECT id FROM notifications
                 WHERE type = 'CUSTOMER_MEDICINE_EXPIRED'
                   AND username = ?
                   AND relatedOrderId = ?
                   AND medicineName = ?
                 LIMIT 1`,
                [order.username, order.orderId, item.name]
            );

            if (existing.length > 0) continue;

            await pool.execute(
                `INSERT INTO notifications (
                    message, date, username, relatedOrderId, type, supplierId, isRead, medicineName, actionStatus
                 ) VALUES (?, NOW(), ?, ?, 'CUSTOMER_MEDICINE_EXPIRED', NULL, FALSE, ?, 'pending')`,
                [
                    `Alert: Your medicine ${item.name} from order ${order.orderId} is expired. Please do not use it and contact the pharmacist for a replacement.`,
                    order.username,
                    order.orderId,
                    item.name
                ]
            );
        }
    }
};

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role, address, name } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const [result] = await pool.execute(
            'INSERT INTO users (username, password, role, address, name) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, role, address || '', name || username]
        );

        const createdUser = {
            id: result.insertId,
            username,
            role,
            address: address || '',
            name: name || username
        };

        await broadcastSnapshot('user-registered');
        res.status(201).json({
            message: 'User registered successfully',
            user: createdUser
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login server error' });
    }
});

app.get('/api/data', authenticateToken, async (req, res) => {
    try {
        res.json(await loadDashboardData());
    } catch (error) {
        console.error('Data Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.get('/api/data/stream', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    realtimeClients.add(res);
    sendRealtimeEvent(res, 'connected', { message: 'Realtime stream connected' });

    try {
        sendRealtimeEvent(res, 'data-sync', {
            reason: 'initial-sync',
            snapshot: await loadDashboardData()
        });
    } catch (error) {
        console.error('Initial realtime sync error:', error);
        sendRealtimeEvent(res, 'error', { message: 'Initial realtime sync failed' });
    }

    const heartbeat = setInterval(() => {
        sendRealtimeEvent(res, 'heartbeat', { ts: Date.now() });
    }, 30000);

    req.on('close', () => {
        clearInterval(heartbeat);
        realtimeClients.delete(res);
        res.end();
    });
});

app.patch('/api/profile/address', authenticateToken, async (req, res) => {
    try {
        const { address } = req.body;
        if (!address || !address.trim()) {
            return res.status(400).json({ error: 'Address is required' });
        }

        await pool.execute('UPDATE users SET address = ? WHERE id = ?', [address.trim(), req.user.id]);
        const [rows] = await pool.execute(
            'SELECT id, username, role, address, name FROM users WHERE id = ?',
            [req.user.id]
        );

        await broadcastSnapshot('address-updated');
        res.json({ message: 'Address updated', user: rows[0] });
    } catch (error) {
        console.error('Address update error:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
});

app.post('/api/users', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const { name, email, password, role, address } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE username = ?',
            [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const [result] = await pool.execute(
            'INSERT INTO users (username, password, role, address, name) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, role, address || '', name]
        );

        const [rows] = await pool.execute(
            'SELECT id, username, role, address, name FROM users WHERE id = ?',
            [result.insertId]
        );

        await broadcastSnapshot('user-created');
        res.status(201).json({ user: rows[0] });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.delete('/api/users/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (id === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        await broadcastSnapshot('user-deleted');
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.post('/api/medicines', authenticateToken, requireRole('Pharmacist', 'Admin'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { name, batchNo, expiryDate, quantity, supplierId, imageUrl, price } = req.body;
        if (!name || !batchNo || !expiryDate || Number.isNaN(Number(quantity))) {
            await connection.rollback();
            return res.status(400).json({ error: 'Missing required medicine fields' });
        }

        const [existing] = await connection.execute(
            'SELECT id FROM stock WHERE LOWER(medicine) = LOWER(?) AND batchNo = ?',
            [name, batchNo]
        );
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Medicine with this name and batch already exists' });
        }

        const [result] = await connection.execute(
            `INSERT INTO stock (medicine, batchNo, expiryDate, quantity, supplierId, imageUrl, price, manufactureDate)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
            [
                name,
                batchNo,
                expiryDate,
                Number(quantity),
                supplierId || null,
                imageUrl || defaultMedicineImage,
                price || null
            ]
        );

        await syncStockAlerts(connection);
        await connection.commit();

        const [rows] = await pool.execute('SELECT * FROM stock WHERE id = ?', [result.insertId]);
        await broadcastSnapshot('medicine-created');
        res.status(201).json({ medicine: rows[0] });
    } catch (error) {
        await connection.rollback();
        console.error('Create medicine error:', error);
        res.status(500).json({ error: 'Failed to create medicine' });
    } finally {
        connection.release();
    }
});

app.delete('/api/medicines/:id', authenticateToken, requireRole('Pharmacist', 'Admin'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('DELETE FROM stock WHERE id = ?', [req.params.id]);
        await syncStockAlerts(connection);
        await connection.commit();

        await broadcastSnapshot('medicine-deleted');
        res.json({ message: 'Medicine deleted' });
    } catch (error) {
        await connection.rollback();
        console.error('Delete medicine error:', error);
        res.status(500).json({ error: 'Failed to delete medicine' });
    } finally {
        connection.release();
    }
});

app.post('/api/orders', authenticateToken, requireRole('Customer'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { items, address } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Order items are required' });
        }
        if (!address || !address.trim()) {
            await connection.rollback();
            return res.status(400).json({ error: 'Delivery address is required' });
        }

        const normalizedItems = [];
        let totalPrice = 0;

        for (const item of items) {
            const quantity = Number(item.cartQty || item.quantity);
            if (!item.id || Number.isNaN(quantity) || quantity < 1) {
                await connection.rollback();
                return res.status(400).json({ error: 'Invalid order item' });
            }

            const [rows] = await connection.execute(
                'SELECT * FROM stock WHERE id = ? FOR UPDATE',
                [item.id]
            );
            const medicine = rows[0];
            if (!medicine || Number(medicine.quantity) < quantity) {
                await connection.rollback();
                return res.status(400).json({ error: `Insufficient stock for ${item.name || 'selected medicine'}` });
            }

            await connection.execute(
                'UPDATE stock SET quantity = quantity - ? WHERE id = ?',
                [quantity, item.id]
            );

            const linePrice = Number(medicine.price || 0) * quantity;
            totalPrice += linePrice;
            normalizedItems.push({
                id: medicine.id,
                name: medicine.medicine,
                batchNo: medicine.batchNo,
                expiryDate: formatDateOnly(medicine.expiryDate),
                imageUrl: medicine.imageUrl || defaultMedicineImage,
                price: Number(medicine.price || 0),
                quantity: Number(medicine.quantity),
                cartQty: quantity
            });
        }

        const orderId = `ORD-${Date.now()}`;
        await connection.execute(
            `INSERT INTO orders (
                orderId, medicine, quantity, totalPrice, username, deliveryAddress, paymentMethod,
                date, status, customerId, items
             ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
            [
                orderId,
                normalizedItems.map((item) => item.name).join(', '),
                normalizedItems.reduce((sum, item) => sum + item.cartQty, 0),
                totalPrice,
                req.user.username,
                address.trim(),
                'N/A',
                'Placed',
                req.user.id,
                JSON.stringify(normalizedItems)
            ]
        );

        await connection.execute(
            `INSERT INTO notifications (message, date, username, relatedOrderId, type, supplierId, isRead, medicineName, actionStatus)
             VALUES (?, NOW(), ?, ?, ?, NULL, FALSE, NULL, 'completed')`,
            [
                `Your order ${orderId} has been placed successfully.`,
                req.user.username,
                orderId,
                'ORDER_UPDATE'
            ]
        );

        await syncStockAlerts(connection);
        await connection.commit();

        const [rows] = await pool.execute('SELECT * FROM orders WHERE orderId = ?', [orderId]);
        const order = rows[0] ? { ...rows[0], items: parseItems(rows[0].items) } : null;

        await broadcastSnapshot('order-created');
        res.status(201).json({ order });
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to place order' });
    } finally {
        connection.release();
    }
});

app.post('/api/orders/:orderId/refill-request', authenticateToken, requireRole('Customer'), async (req, res) => {
    try {
        const { medicineName } = req.body;
        const { orderId } = req.params;

        if (!medicineName) {
            return res.status(400).json({ error: 'Medicine name is required' });
        }

        const [orders] = await pool.execute(
            'SELECT orderId, username, items FROM orders WHERE orderId = ? AND customerId = ? LIMIT 1',
            [orderId, req.user.id]
        );
        const order = orders[0];
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const items = parseItems(order.items);
        const hasMedicine = items.some((item) => item.name === medicineName);
        if (!hasMedicine) {
            return res.status(400).json({ error: 'Medicine not found in this order' });
        }

        const [existing] = await pool.execute(
            `SELECT id FROM notifications
             WHERE type = 'CUSTOMER_REQUEST'
               AND username = ?
               AND relatedOrderId = ?
               AND medicineName = ?
               AND actionStatus = 'pending'
             LIMIT 1`,
            [req.user.username, orderId, medicineName]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Request already sent for this medicine' });
        }

        await pool.execute(
            `INSERT INTO notifications (
                message, date, username, relatedOrderId, type, supplierId, isRead, medicineName, actionStatus
             ) VALUES (?, NOW(), ?, ?, 'CUSTOMER_REQUEST', NULL, FALSE, ?, 'pending')`,
            [
                `Customer ${req.user.username} requested ${medicineName} again from order ${orderId}.`,
                req.user.username,
                orderId,
                medicineName
            ]
        );

        await broadcastSnapshot('customer-request-created');
        res.status(201).json({ message: 'Request sent to pharmacist' });
    } catch (error) {
        console.error('Create refill request error:', error);
        res.status(500).json({ error: 'Failed to send request' });
    }
});

app.post('/api/requests/:notificationId/dispatch', authenticateToken, requireRole('Pharmacist', 'Admin'), async (req, res) => {
    try {
        const notificationId = Number(req.params.notificationId);
        const [rows] = await pool.execute(
            `SELECT * FROM notifications
             WHERE id = ? AND type = 'CUSTOMER_REQUEST'
             LIMIT 1`,
            [notificationId]
        );
        const request = rows[0];
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        if (request.actionStatus === 'completed') {
            return res.status(400).json({ error: 'Medicine already marked as sent' });
        }

        await pool.execute(
            `UPDATE notifications
             SET actionStatus = 'completed', isRead = TRUE
             WHERE id = ?`,
            [notificationId]
        );

        await pool.execute(
            `INSERT INTO notifications (
                message, date, username, relatedOrderId, type, supplierId, isRead, medicineName, actionStatus
             ) VALUES (?, NOW(), ?, ?, 'MEDICINE_SENT', NULL, FALSE, ?, 'completed')`,
            [
                `Pharmacist has sent ${request.medicineName} to you for request linked to order ${request.relatedOrderId}.`,
                request.username,
                request.relatedOrderId,
                request.medicineName
            ]
        );

        await broadcastSnapshot('medicine-dispatched');
        res.json({ message: 'Medicine marked as sent to customer' });
    } catch (error) {
        console.error('Dispatch medicine error:', error);
        res.status(500).json({ error: 'Failed to dispatch medicine' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

const startServer = async () => {
    try {
        await ensureSchema();
        await seedDemoData();
        app.listen(PORT, () => {
            console.log(`Medi Hub Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
};

startServer();
