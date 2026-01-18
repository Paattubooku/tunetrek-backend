const express = require('express');
const router = express.Router();
const recentlyPlayedController = require('../controllers/recentlyPlayedController');

router.post('/add', recentlyPlayedController.addToRecentlyPlayed);
router.get('/:user_id', recentlyPlayedController.getRecentlyPlayed);
router.post('/clear', recentlyPlayedController.clearRecentlyPlayed);

module.exports = router;
