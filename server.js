const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('./config/database.js');
const socketConnection = require("./socket/connection.js");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { title } = require('process');

const app = express();
const server = http.createServer(app);
const PORT = 3000;
app.use(express.static('public'));
app.set('view engine', 'ejs');

const SECRET_KEY = 'your-secret-key'; // Change this to a strong secret key

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); // Use cookie parser to handle cookies

const io = socketIo(server,{
    cors: {
        origin:"*",
        methods:["GET","POST"]
    }
})

socketConnection(io);


let user = null;

// Middleware to check if user is authenticated using JWT
function isAuthenticated(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/users/login');
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        res.redirect('/users/login');
    }
}

// Routes
app.get('/', (req, res) => {
    const token = req.cookies.token;
    let user = null;

    if (token) {
        try {
            user = jwt.verify(token, SECRET_KEY);
        } catch (err) {
            res.clearCookie('token'); // Clear invalid token
        }
    }

    res.render('index', { user });
});

app.get('/race', isAuthenticated, (req, res) => {
    try {
        mysql.query("SELECT * FROM users WHERE id = ?", [req.user.id], (err, results) => {
            if (err) throw err;
            res.render('race', { user: results[0] });
        });
    } catch (err) {
        console.log(err);
    }
});

app.get('/user/profile', isAuthenticated, (req, res) => {
    try {
        mysql.query("SELECT * FROM users WHERE id = ?", [req.user.id], (err, results) => {
            if (err) throw err;
            res.render('profile', { user: results[0] });
        });
    } catch (err) {
        console.log(err);
    }
});

app.get('/users/login', (req, res) => {
    res.render('login', { user: null });
});

app.get('/register/new', (req, res) => {
    res.render('register', { user: null, title: 'Register' });
});

// Register a new user with hashed password
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        mysql.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Error registering user:', err);
                    return res.status(500).send('Error registering user');
                }
                console.log('User registered successfully');
                res.redirect('/users/login');
            });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).send('Error registering user');
    }
});

// Login and generate JWT token
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    mysql.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Error logging in:', err);
            return res.status(500).send('Error logging in');
        }

        if (results.length === 0) {
            return res.status(401).send('Invalid email or password');
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).send('Invalid email or password');
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, name: user.name }, SECRET_KEY, { expiresIn: '2h' });

        // Set the token in a cookie
        res.cookie('token', token, { httpOnly: true });

        res.redirect('/');
    });
});

// Logout by clearing JWT cookie
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});


server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
