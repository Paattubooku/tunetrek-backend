const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

const authMiddleware = (req, res, next) => {
    const tokenHeader = req.header("Authorization");
    if (!tokenHeader) return res.status(401).json({ error: "Access denied" });

    try {
        const token = tokenHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Access denied. Malformed token." });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: "Invalid token" });
    }
};

module.exports = authMiddleware;
