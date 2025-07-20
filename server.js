// server.js

// ১. প্রয়োজনীয় লাইব্রেরি ইম্পোর্ট করা
const express = require('express');
const sqlite3 = require('sqlite3-offline').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// ২. অ্যাপ এবং সার্ভার সেটাপ
const app = express();
app.use(express.json());
const server = http.createServer(app);

const JWT_SECRET = "a-very-strong-secret-key-for-your-app";

// ৩. ডেটাবেস কানেকশন
// Render.com-এ ডেটা সংরক্ষণের জন্য একটি নির্দিষ্ট ফোল্ডার ব্যবহার করা হয়
const dataDir = '/var/data';
const dbPath = path.join(dataDir, 'masklink.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Connected to the SQLite database at:", dbPath);
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            name TEXT,
            emoji TEXT,
            maskId TEXT UNIQUE
        )`);
    }
});

// ৪. API Endpoints
app.post('/api/register', async (req, res) => {
    const { email, password, name, emoji } = req.body;
    if (!email || !password || !name || !emoji) {
        return res.status(400).json({ message: "All fields are required" });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const maskId = `mask-${Math.random().toString(36).substr(2, 4)}`;
        const sql = `INSERT INTO users (email, password, name, emoji, maskId) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [email, hashedPassword, name, emoji, maskId], function(err) {
            if (err) return res.status(409).json({ message: "Email already exists." });
            res.status(201).json({ message: "User registered successfully!" });
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT * FROM users WHERE email = ?`;
    db.get(sql, [email], async (err, user) => {
        if (!user) return res.status(404).json({ message: "User not found." });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: "Login successful", token, user });
    });
});

app.get('/', (req, res) => res.send('MaskLink Server is Live!'));

// ৫. WebSocket সার্ভার
const wss = new WebSocket.Server({ server });
wss.on('connection', ws => {
    console.log('Client connected');
    ws.on('message', message => {
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
    ws.on('close', () => console.log('Client disconnected'));
});

// ৬. সার্ভার চালু করা
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});```

---

### ধাপ ৩: Render-এ আপনার সার্ভার হোস্ট করা

এখন আমরা Render-কে বলব GitHub থেকে আপনার কোড নিয়ে সেটিকে একটি লাইভ সার্ভারে পরিণত করতে।

1.  **Render অ্যাকাউন্ট তৈরি করুন:** ব্রাউজারে [render.com](https://render.com/) ওয়েবসাইটে যান এবং **"Sign up with GitHub"** অপশনটি ব্যবহার করে অ্যাকাউন্ট তৈরি করুন।
2.  **Render-কে GitHub এক্সেস দিন:** Render আপনার রিপোজিটরিগুলো দেখার জন্য অনুমতি চাইলে "All repositories" সিলেক্ট করে অনুমতি দিন।
3.  **নতুন ওয়েব সার্ভিস তৈরি করুন:**
    *   Render ড্যাশবোর্ডে **"New +"** বাটনে ক্লিক করে **"Web Service"** সিলেক্ট করুন।
    *   আপনার `my-masklink-server` রিপোজিটরিটি লিস্টে দেখাবে। এর পাশে থাকা **"Connect"** বাটনে ক্লিক করুন।
4.  **সার্ভিস কনফিগার করুন:**
    *   **Name:** একটি নাম দিন (যেমন: my-masklink-server)।
    *   **Build Command:** `npm install` লেখা থাকবে।
    *   **Start Command:** `node server.js` লিখুন।
    *   **Instance Type:** **Free** সিলেক্ট করা আছে কিনা তা নিশ্চিত করুন।
5.  **সার্ভার তৈরি করুন:** একদম নিচে থাকা **"Create Web Service"** বাটনে ক্লিক করুন।

**এটাই! আপনার কাজ শেষ!** Render এখন স্বয়ংক্রিয়ভাবে আপনার GitHub থেকে কোড নামাবে, প্যাকেজ ইনস্টল করবে এবং আপনার সার্ভারটি চালু করে দেবে। চালু হয়ে গেলে Render আপনাকে একটি পাবলিক URL (যেমন: `https://my-masklink-server.onrender.com`) দেবে। এই URL টিই হলো আপনার লাইভ সার্ভারের ঠিকানা!

এই পদ্ধতিতে আপনাকে আর কোনো টার্মিনাল বা কমান্ড নিয়ে চিন্তা করতে হবে না। আপনি শুধু আপনার ফোনে Acode editor দিয়ে কোড লিখবেন এবং ব্রাউজার দিয়ে GitHub-এ আপলোড করবেন। বাকি কাজ Render নিজে থেকেই করে দেবে।