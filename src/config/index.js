const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
    PORT: process.env.PORT || 8080,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET || "dev_secret",
    JIOSAAVN_API_BASE_URL: "https://www.jiosaavn.com/api.php",
    JIOSAAVN_STATS_BASE_URL: "https://stats.jiosaavn.com/stats.php",
    CTX: "web6dot0",
    API_VERSION: "4",
};
