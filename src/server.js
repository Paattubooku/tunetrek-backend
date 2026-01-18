const app = require("./app");
const { PORT } = require("./config");
// MongoDB Removed for Supabase Migration

// Start Server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
