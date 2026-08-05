const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const LINKS_FILE = path.join(__dirname, 'links.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Helper: Links Read Karna
const readLinks = () => {
    if (!fs.existsSync(LINKS_FILE)) fs.writeFileSync(LINKS_FILE, '{}', 'utf-8');
    return JSON.parse(fs.readFileSync(LINKS_FILE, 'utf-8') || '{}');
};

// Helper: Links Save Karna
const writeLinks = (data) => {
    fs.writeFileSync(LINKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

// 1. Home Page Serve Karna
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Short Link Generate Karne ka API
app.post('/api/shorten', (req, res) => {
    const { originalUrl } = req.body;
    if (!originalUrl) return res.status(400).json({ success: false, message: "URL is required" });

    const links = readLinks();
    // Ek unique 6 characters ka random code banana
    const shortCode = Math.random().toString(36).substring(2, 8);
    
    links[shortCode] = originalUrl;
    writeLinks(links);

    res.json({ success: true, shortUrl: `${req.protocol}://${req.get('host')}/go/${shortCode}` });
});

// 3. Ad-Wall Page Serve Karna
app.get('/go/:code', (req, res) => {
    const links = readLinks();
    const originalUrl = links[req.params.code];

    if (!originalUrl) return res.status(404).send("<h1>URL Not Found!</h1>");
    
    // User ko direct bhejne ki bajaye Ad page par bhejna
    res.sendFile(path.join(__dirname, 'redirect.html'));
});

// 4. Original URL Get Karne ka API (For Redirect Page)
app.get('/api/get-url/:code', (req, res) => {
    const links = readLinks();
    const originalUrl = links[req.params.code];
    if (!originalUrl) return res.json({ success: false });
    res.json({ success: true, url: originalUrl });
});

app.listen(PORT, () => console.log(`🚀 Earning App live on port ${PORT}`));
