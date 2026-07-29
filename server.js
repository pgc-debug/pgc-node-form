const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session'); // Naya package
const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Session Config (Login status yaad rakhne ke liye)
app.use(session({
    secret: 'my-super-secret-key-123',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 } // 10 minutes tak login rahega
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Fixed Credentials (Aap inhein badal sakte hain)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "secret123";

// Helper Functions
const readDataFromFile = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    const fileData = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(fileData || '[]');
};

const writeDataToFile = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

// Middleware: Check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return next(); // Agar logged in hai to aage jaane do
    }
    res.redirect('/login'); // Agar nahi to login page par bhejo
};

// 1. Serve Form Page (Public)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Serve Login Page HTML Directly
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login</title>
            <link rel="stylesheet" href="style.css">
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

// 3. Handle Login Logic
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isLoggedIn = true; // Session set ho gaya
        res.redirect('/admin');
    } else {
        res.send("<h3>❌ Invalid Credentials! <a href='/login'>Try Again</a></h3>");
    }
});

// 4. Handle Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// 5. Serve Admin Dashboard (Protected - Ab yeh password ke bina nahi khuleha)
app.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 6. Secure API Route (Protected)
app.get('/api/submissions', isAuthenticated, (req, res) => {
    const submissions = readDataFromFile();
    res.json(submissions.reverse());
});

// 7. Public API to Save Data
app.post('/api/submit', (req, res) => {
    const { name, email, message } = req.body;
    if (name && email && message) {
        const submissions = readDataFromFile();
        const newData = {
            id: submissions.length + 1,
            name, email, message,
            date: new Date().toLocaleString()
        };
        submissions.push(newData);
        writeDataToFile(submissions);
        res.status(200).json({ success: true, message: "Saved!" });
    } else {
        res.status(400).json({ success: false, message: "Required fields missing!" });
    }
});

// 8. Delete Single Submission API (Protected)
app.delete('/api/submissions/:id', isAuthenticated, (req, res) => {
    const id = parseInt(req.params.id);
    let submissions = readDataFromFile();
    
    // Check karein agar data exist karta hai
    const initialLength = submissions.length;
    submissions = submissions.filter(item => item.id !== id);
    
    if (submissions.length < initialLength) {
        writeDataToFile(submissions); // Naya array bina deleted item ke save karein
        res.status(200).json({ success: true, message: "Data deleted successfully!" });
    } else {
        res.status(404).json({ success: false, message: "Item not found!" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Secure Server running on http://localhost:${const PORT = process.env.PORT || 3000;}`);
});
