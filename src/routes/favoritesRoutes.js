const express = require("express");
const router = express.Router();
const favoritesController = require("../controllers/favoritesController");
// const authMiddleware = require("../middlewares/auth");

router.post("/favorites/add", favoritesController.addFavorite);
router.post("/favorites/remove", favoritesController.removeFavorite);
router.get("/favorites/:user_id", favoritesController.getFavorites);

module.exports = router;
