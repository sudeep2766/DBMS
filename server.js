require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'cybershield-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Simple Auth Middleware
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

// Redirect home to login if trying to access portals
app.get('/officer', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'officer.html'));
});

app.get('/admin', checkAuth, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).send('Access Denied: Admins Only');
    }
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.user = { role: 'admin' };
        return res.json({ success: true, redirect: '/admin' });
    } else if (username === process.env.OFFICER_1_USERNAME && password === process.env.OFFICER_1_PASSWORD) {
        req.session.user = { role: 'officer' };
        return res.json({ success: true, redirect: '/officer' });
    } else if (username === process.env.OFFICER_2_USERNAME && password === process.env.OFFICER_2_PASSWORD) {
        req.session.user = { role: 'officer' };
        return res.json({ success: true, redirect: '/officer' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// API: Submit a complaint
app.post('/api/complaints', (req, res) => {
    const { 
        name, email, mobile, region, incident_date, 
        type, description, platform, suspect_info, evidence_file 
    } = req.body;

    if (!name || !email || !mobile || !region || !incident_date || !type || !description) {
        return res.status(400).json({ error: 'All non-optional fields are required.' });
    }

    const query = `INSERT INTO complaints (
        name, email, mobile, region, incident_date, 
        type, description, platform, suspect_info, evidence_file
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [
        name, email, mobile, region, incident_date, 
        type, description, platform, suspect_info, evidence_file
    ], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'Complaint submitted successfully!' });
    });
});

// API: Get all complaints
app.get('/api/complaints', (req, res) => {
    const query = `SELECT * FROM complaints ORDER BY created_at DESC`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// API: Update complaint status
app.patch('/api/complaints/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required.' });
    }

    const query = `UPDATE complaints SET status = ? WHERE id = ?`;
    db.run(query, [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Complaint not found.' });
        }
        res.json({ message: 'Status updated successfully!' });
    });
});

// API: Delete complaint (Admin only - simplified for now)
app.delete('/api/complaints/:id', (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM complaints WHERE id = ?`;
    db.run(query, [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Complaint not found.' });
        }
        res.json({ message: 'Complaint deleted successfully!' });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
