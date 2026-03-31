const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_super_secret_key'; // In production, use environment variables
const SALT_ROUNDS = 10;

// MySQL Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Replace with your MySQL username
    password: '1234', // Replace with your MySQL password
    database: 'medihub',
    waitForConnections: true,
    connectionLimit: 10
});

app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Registration Endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role, address } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ error: 'Username already exists' });

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        await pool.execute(
            'INSERT INTO users (username, password, role, address, name) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, role, address, username]
        );
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { username: user.username, role: user.role, address: user.address } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login server error' });
    }
});

// Load data from JSON file
app.get('/api/data', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT id, username, role, address, name FROM users');
        const [stock] = await pool.execute('SELECT * FROM stock');
        const [sales] = await pool.execute('SELECT * FROM sales');
        const [orders] = await pool.execute('SELECT * FROM orders');
        const [feedback] = await pool.execute('SELECT * FROM feedback');
        const [notifications] = await pool.execute('SELECT * FROM notifications');

        res.json({
            users,
            stockData: stock,
            salesData: sales,
            expiryData: stock, // Mapping stock to expiry for current frontend logic
            orders,
            feedbackData: feedback,
            notifications
        });
    } catch (error) {
        console.error('Data Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Save data to JSON file
app.post('/api/save', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { stockData, salesData, orders, feedbackData, notifications } = req.body;

        // Update Stock
        await connection.execute('DELETE FROM stock');
        for (const item of stockData) {
            await connection.execute('INSERT INTO stock (medicine, quantity, manufactureDate, price) VALUES (?, ?, ?, ?)', 
                [item.medicine, item.quantity, item.manufactureDate, item.price]);
        }
        
        // Update Orders (Simplified example)
        await connection.execute('DELETE FROM orders');
        for (const order of orders) {
            await connection.execute(
                'INSERT INTO orders (orderId, medicine, quantity, totalPrice, username, deliveryAddress, paymentMethod, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [order.orderId, order.medicine, order.quantity, order.totalPrice, order.username, order.deliveryAddress, order.paymentMethod, order.date, order.status]
            );
        }
        
        // You can extend this logic for sales, feedback, and notifications tables similarly

        await connection.commit();
        res.status(200).send({ message: 'Data saved successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Save error:', error);
        res.status(500).send({ error: 'Failed to save data' });
    } finally {
        connection.release();
    }
});

// Fallback to index.html for SPA routing if needed
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'medics.html'));
});

app.listen(PORT, () => {
    console.log(`Medi Hub Server running at http://localhost:${PORT}`);
});