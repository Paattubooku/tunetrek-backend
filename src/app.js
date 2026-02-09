const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const musicRoutes = require("./routes/musicRoutes");
const userRoutes = require("./routes/userRoutes");
const favoritesRoutes = require("./routes/favoritesRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for large playlist/album data
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
    origin: [
        'https://bdb9ec98-b4a0-4517-ac41-30fb914b556a-00-302966irvgxk9.sisko.replit.dev/login',
        'https://*.repl.co',
        'https://*.replit.dev',
        'http://localhost:5173',
        'http://localhost:3000',
        'https://mserver-pi.vercel.app/',
        'https://tunetrek-frontend.vercel.app', // Production Frontend
        'https://tunetrek-frontend-ashok-kumars-projects.vercel.app', // Vercel Project URL
        process.env.FRONTEND_URL // Allow env variable override
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
// Note: Original app didn't have /api prefix, so we mount at root to preserve routes
app.use("/", musicRoutes);
app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", favoritesRoutes);
app.use("/recently-played", require("./routes/recentlyPlayedRoutes"));

// Error Handler
app.use(errorHandler);

module.exports = app;
