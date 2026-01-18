const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/auth");

router.post("/playlist", authMiddleware, userController.createPlaylist);
router.get("/playlists", authMiddleware, userController.getPlaylists);

module.exports = router;
