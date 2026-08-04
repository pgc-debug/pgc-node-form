const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const app = express();

// Render ke liye PORT setting
const PORT = process.env.PORT || 3000; 

const DATA_FILE = path.join(__dirname, 'data.json');

// Session Config
app.use(session({
    secret: 'my-super-secret-key-123',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "secret123";

// Helper Functions
const readDataFromFile = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
            return [];
        }
        const fileData = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(fileData || '[]');
    } catch (e) {
        return [];
    }
};

const writeDataToFile = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error("Error writing file:", e);
    }
};

const isAuthenticated = (req, res, next) => {
    if (req.session.isLoggedIn) return next();
    res.redirect('/login');
};

// ==========================================
// 📄 NEW SERVE PAGES SECTION (MULTI-PAGE)
// ==========================================

// 1. Serve Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

// 2. Serve About Page
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

// 3. Serve Contact Form Page
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. Serve Admin Dashboard (Protected)
app.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ==========================================
// 🔐 AUTHENTICATION ROUTES
// ==========================================

app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login</title>
            <link rel="stylesheet" href="fstyle.css">
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <h2>Admin Login</h2>
                    <form action="/login" method="POST">
                        <input type="text" name="username" placeholder="Username" required>
                        <input type="password" name="password" placeholder="Password" required>
                        <button type="submit">Login</button>
                    </form>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isLoggedIn = true;
        res.redirect('/admin');
    } else {
        res.send("<h3>❌ Invalid Credentials! <a href='/login'>Try Again</a></h3>");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ==========================================
// ⚙️ API ROUTES (DATA OPERATIONS)
// ==========================================

app.get('/api/submissions', isAuthenticated, (req, res) => {
    const submissions = readDataFromFile();
    res.json(submissions.reverse());
});

app.post('/api/submit', (req, res) => {
    const { name, email, phone, city, gender, message } = req.body;
    if (name && email && phone && city && gender && message) {
        const submissions = readDataFromFile();
        const newData = {
            id: submissions.length + 1,
            name, email, phone, city, gender, message,
            date: new Date().toLocaleString()
        };
        submissions.push(newData);
        writeDataToFile(submissions);
        res.status(200).json({ success: true, message: "Saved!" });
    } else {
        res.status(400).json({ success: false, message: "Required fields missing!" });
    }
});

app.delete('/api/submissions/:id', isAuthenticated, (req, res) => {
    const id = parseInt(req.params.id);
    let submissions = readDataFromFile();
    const initialLength = submissions.length;
    submissions = submissions.filter(item => item.id !== id);
    
    if (submissions.length < initialLength) {
        writeDataToFile(submissions);
        res.status(200).json({ success: true, message: "Deleted!" });
    } else {
        res.status(404).json({ success: false, message: "Not found!" });
    }
});

// Server Listen
app.listen(PORT, () => {
    console.log(`✅ Secure Server running on port ${PORT}`);
});
