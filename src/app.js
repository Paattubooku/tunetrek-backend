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
        'http://localhost:5173',
        'http://localhost:3000',
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
