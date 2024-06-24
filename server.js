const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const { request } = require('http');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection setup
const username = "StudentBanana";
const password = "Pieceofshit@123";
const cluster = "movie.utrmflm.mongodb.net";
const dbname = "movie";
const uri = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cluster}/${dbname}?retryWrites=true&w=majority`;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error.message);
    });

// Mongoose schemas and models
const LoginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

const User = mongoose.model("User", LoginSchema);

const HistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pokemonName: String,
    imageUrl: String,
    typing: String,
    totalBaseStats: Number
});

const History = mongoose.model("History", HistorySchema);

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from 'public' directory
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false
}));

app.set('view engine', 'ejs');

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle registration form submission
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Regular expression to enforce password complexity:
        // At least 6 characters, at least one special character
        const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).send('Password must be at least 6 characters long and include at least one special character.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name: username, password: hashedPassword });
        await newUser.save();
        res.redirect('/login'); // Redirect to login page after registration
    } catch (error) {
        console.error("Error registering user:", error.message);
        res.status(500).send("Error registering user");
    }
});

// Handle login form submission
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ name: username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).send('Invalid username or password');
        }

        req.session.userId = user._id;
        res.redirect('/index.html'); // Redirect to index.html upon successful login
    } catch (error) {
        console.error("Error logging in:", error.message);
        res.status(500).send("Error logging in");
    }
});

// Serve index.html after successful login
app.get('/', (req, res) => {
    // Check if user is logged in (authenticated) based on session
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));

    } else {
        res.redirect('/login'); // Redirect to login page if not logged in
    }
});

app.post('/saveHistory', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('User not authenticated');
    }

    try {
        const { pokemonName, imageUrl, typing, totalBaseStats } = req.body;
        const newHistory = new History({
            userId: req.session.userId,
            pokemonName,
            imageUrl,
            typing,
            totalBaseStats
        });
        await newHistory.save();
        console.log("Pokémon details saved to history:", newHistory);
        res.status(200).send('Pokémon details saved to history');
    } catch (error) {
        console.error("Error saving history:", error.message);
        res.status(500).send("Error saving history: " + error.message);
    }
});


// Serve history.html
app.get('/history.html', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'history.html'));
    } else {
        res.redirect('/login');
    }
});

// Fetch history data for the logged-in user
app.get('/historyData', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('User not authenticated');
    }

    try {
        const historyData = await History.find({ userId: req.session.userId });
        res.status(200).json(historyData);
    } catch (error) {
        console.error("Error fetching history data:", error.message);
        res.status(500).send("Error fetching history data");
    }
});
// Endpoint to delete a history entry
app.delete('/deleteHistory', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('User not authenticated');
    }

    try {
        const { name } = req.query;
        const result = await History.deleteOne({ userId: req.session.userId, pokemonName: name });
        
        if (result.deletedCount === 0) {
            return res.status(404).send('No history entry found with the given name');
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error("Error deleting history entry:", error.message);
        res.status(500).send("Error deleting history entry");
    }
});
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Logout failed');
        }
        res.clearCookie('connect.sid'); // clear the session cookie
        res.status(200).send('Logout successful');
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
