const express = require('express');
const sqlite3 = require('sqlite3-offline').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const app = express();
app.use(express.json());
const server = http.createServer(app);
const JWT_SECRET = "a-very-strong-secret-key";
const dbPath = path.join('/var/data', 'masklink.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) { console.error("DB Error:", err.message); }
    else {
        console.log("Connected to SQLite at:", dbPath);
        db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password TEXT, name TEXT, emoji TEXT, maskId TEXT UNIQUE)`);
    }
});
app.post('/api/register', async (req, res) => {
    const { email, password, name, emoji } = req.body;
    if (!email || !password || !name || !emoji) return res.status(400).json({ message: "All fields required" });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const maskId = `mask-${Math.random().toString(36).substr(2, 4)}`;
        const sql = `INSERT INTO users (email, password, name, emoji, maskId) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [email, hashedPassword, name, emoji, maskId], function (err) {
            if (err) return res.status(409).json({ message: "Email already exists" });
            res.status(201).json({ message: "User registered!" });
        });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ message: "Invalid credentials" });
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: "Login successful", token, user });
    });
});
app.get('/', (req, res) => res.send('MaskLink Server is Live!'));
const wss = new WebSocket.Server({ server });
wss.on('connection', ws => {
    console.log('Client connected');
    ws.on('message', message => {
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) client.send(message.toString());
        });
    });
    ws.on('close', () => console.log('Client disconnected'));
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
