const express = require("express");
const router = express.Router();
const musicController = require("../controllers/musicController");
const radioController = require("../controllers/radioController");

// Music Routes
router.get("/", musicController.getHomePage);
router.get("/details/:id/:type/:p?/:n?", musicController.getDetails);
router.get("/otherDetails/:title/:source/:data", musicController.getOtherDetails);
router.get("/topsearch", musicController.getTopSearch);
router.get("/search", musicController.search);
router.get("/search/songs/:query", musicController.searchSongs);
router.get("/song/:id", musicController.getSongDetails);
router.get("/search/albums/:query", musicController.searchAlbums);
router.get("/album/:id", musicController.getAlbumDetails);
router.get("/search/playlists/:query", musicController.searchPlaylists);
router.get("/playlist/:id", musicController.getPlaylistDetails);
router.get("/artist/:token", musicController.artistMoreDetails);
router.get("/debug/location", musicController.debugLocation);
router.get("/mediaURL/:id/:urlid", musicController.getMediaUrl);

// Radio Routes
router.get("/radio", radioController.getRadio);
router.get("/moreRadio", radioController.getMoreRadio);
router.get("/radioNew", radioController.getRadioNew);
router.get("/moreRadioNew/:id/:k", radioController.getMoreRadioNew);

module.exports = router;
