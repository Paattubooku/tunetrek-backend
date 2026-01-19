const { makeApiRequest, sendStatsEvent } = require("../utils/api");
const { createDownloadLinks } = require("../utils/crypto");
const { JIOSAAVN_API_BASE_URL, CTX, API_VERSION } = require("../config");
const { getLocationFromIP, formatLocationForCookie, getLanguagesForLocation } = require("../utils/ipLocation");

exports.getHomePage = async (req, res) => {
    try {
        let { language } = req.query;

        // Get user's real IP address (works with Vercel, Cloudflare, etc.)
        const userIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '0.0.0.0';

        console.log('[Home] Detected user IP:', userIP);

        // Get location from IP
        const locationData = await getLocationFromIP(userIP);
        const location = formatLocationForCookie(locationData);

        console.log('[Home] Formatted cookie:', location);

        // If language is default or not provided, try to detect from location
        // The frontend currently defaults to "Tamil,English" if no selection.
        // We can check if it matches the default or simple fallback.
        if (!language || language.toLowerCase() === "tamil,english" || language.toLowerCase() === "english") {
            const detectedLangs = getLanguagesForLocation(locationData);
            if (detectedLangs) {
                console.log(`[Home] Auto-switching language from '${language}' to detected '${detectedLangs}' based on location`);
                language = detectedLangs;
            }
        }

        const url = `${JIOSAAVN_API_BASE_URL}?__call=webapi.getLaunchData&api_version=${API_VERSION}&_format=json&_marker=0&ctx=${CTX}`;

        const launchData = await makeApiRequest(url, language, location);

        const keysToRemove = [
            'history', 'promo:vx:data:139', 'promo:vx:data:163',
            'browse_discover', 'global_config', 'promo:vx:data:168',
            'promo:vx:data:162', 'promo:vx:data:107'
        ];

        keysToRemove.forEach(key => delete launchData[key]);

        if (launchData.modules) {
            const modulesToRemove = [
                'promo:vx:data:139', 'promo:vx:data:163',
                'promo:vx:data:168', 'promo:vx:data:162', 'promo:vx:data:107'
            ];
            modulesToRemove.forEach(key => delete launchData.modules[key]);
        }

        const value = launchData.modules;
        delete launchData.modules;

        const sortedAlbumArray = Object.entries(value || {}).sort(([, a], [, b]) => {
            return (a.position || 999) - (b.position || 999);
        });

        const sortedAlbums = Object.fromEntries(sortedAlbumArray);

        const updatedObject = Object.fromEntries(
            Object.entries(launchData).map(([key, data]) => {
                const title = sortedAlbums[key]?.title || "Pick Your Mood";
                return [title, data];
            })
        );

        const url1 = `${JIOSAAVN_API_BASE_URL}?__call=content.getTopSearches&ctx=${CTX}&api_version=${API_VERSION}&_format=json&_marker=0`;
        const topsearchDetails = await makeApiRequest(url1, language, location);

        const updated = Object.fromEntries(
            Object.entries(updatedObject).flatMap(([key, value]) =>
                key === 'Trending Now'
                    ? [[key, value], ["Top Hits", topsearchDetails]]
                    : [[key, value]]
            )
        );

        // Add location metadata to response
        const response = {
            ...updated,
            _metadata: {
                userLocation: {
                    city: locationData.city,
                    state: locationData.state,
                    country: locationData.country,
                    ip: locationData.ip
                }
            }
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message || "An error occurred" });
    }
};

exports.getDetails = async (req, res) => {
    try {
        const { id, type, p, n } = req.params;
        // FIX: Boolean logic fix (type == "playlist" || "mix") -> (["playlist", "mix"].includes(type))
        const isPlaylistOrMix = ["playlist", "mix"].includes(type);

        const { language = "tamil,english" } = req.query;
        let url;
        if (isPlaylistOrMix) {
            url = `${JIOSAAVN_API_BASE_URL}?__call=webapi.get&token=${id}&type=${type}&p=${p || 1}&n=${n || 50}&includeMetaTags=0&ctx=${CTX}&api_version=${API_VERSION}&_format=json&_marker=0`;
        } else {
            url = `${JIOSAAVN_API_BASE_URL}?__call=webapi.get&token=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}&includeMetaTags=0&ctx=${CTX}&api_version=${API_VERSION}&_format=json&_marker=0`;
        }

        const songDetails = await makeApiRequest(url, language);
        if (songDetails.hasOwnProperty('songs')) {
            const updatedSongs = songDetails.songs.map(song => ({
                ...song,
                modules: songDetails.modules
            }));
            res.json(updatedSongs[0]); // Original behavior: strictly returns first song with modules?
        } else {
            res.json(songDetails);
        }
    } catch (error) {
        res.status(500).json({ error: "An error occurred" });
    }
};

exports.getOtherDetails = async (req, res) => {
    try {
        const { title, source, data } = req.params;
        const { language = "tamil,english" } = req.query;
        const url = `${JIOSAAVN_API_BASE_URL}?__call=${source}&api_version=${API_VERSION}&_format=json&_marker=0&ctx=${CTX}&${data}`;

        const responseData = await makeApiRequest(url, language);
        const otherDetails = { [title]: responseData };
        res.json(otherDetails);
    } catch (error) {
        res.status(500).json({ error: "An error occurred" });
    }
};

exports.getTopSearch = async (req, res) => {
    try {
        const { language = "tamil,english" } = req.query;
        const url = `${JIOSAAVN_API_BASE_URL}?__call=content.getTopSearches&ctx=${CTX}&api_version=${API_VERSION}&_format=json&_marker=0`;
        const topsearchDetails = await makeApiRequest(url, language);
        res.json(topsearchDetails);
    } catch (error) {
        res.status(500).json({ error: "An error occurred" });
    }
};

exports.search = async (req, res) => {
    const startTime = Date.now();
    let locationData = null;
    try {
        const { q: query, language = "tamil,english" } = req.query;
        if (!query) return res.status(400).json({ error: 'Query parameter is required' });

        // Get user's real IP address
        const userIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '0.0.0.0';

        // Get location from IP
        locationData = await getLocationFromIP(userIP);
        const location = formatLocationForCookie(locationData);

        const url = `${JIOSAAVN_API_BASE_URL}?__call=autocomplete.get&ctx=${CTX}&api_version=${API_VERSION}&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`;
        const response = await makeApiRequest(url, language, location);

        // Filter keys
        const validKeys = ['TOPQUERY', 'ALBUMS', 'SONGS', 'PLAYLISTS', 'ARTISTS'];
        Object.keys(response).forEach(key => {
            if (!validKeys.includes(key.toUpperCase())) {
                delete response[key];
            } else if (key === "topquery") {
                response["top Results"] = response.topquery;
                delete response.topquery;
            }
        });

        const sortedResult = Object.entries(response)
            .sort(([, a], [, b]) => (a.position || 0) - (b.position || 0))
            .reduce((acc, [key, value]) => {
                // Capitalize first letter
                const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                acc[formattedKey] = value;
                return acc;
            }, {});

        res.json(sortedResult);

        // Log search stats
        const duration = Date.now() - startTime;
        sendStatsEvent("SEARCH_EVENT", {
            search_query: query,
            search_duration_in_ms: duration
        }, locationData);

    } catch (error) {
        console.error('Error searching:', error);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }
};

exports.getTopSearches = async (req, res) => {
    try {
        const { language = "tamil,english" } = req.query;
        // Get user's real IP address
        const userIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '0.0.0.0';

        // Get location from IP
        const locationData = await getLocationFromIP(userIP);
        const location = formatLocationForCookie(locationData);

        const url = `${JIOSAAVN_API_BASE_URL}?__call=content.getTopSearches&ctx=${CTX}&api_version=${API_VERSION}&_format=json&_marker=0`;
        const response = await makeApiRequest(url, language, location);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: "An error occurred" });
    }
};

exports.searchSongs = async (req, res) => {
    const startTime = Date.now();
    let locationData = null;
    try {
        const { query } = req.params;
        const { language = "tamil,english" } = req.query;
        const targetLanguages = language.toLowerCase().split(",");

        // Get user's real IP
        const userIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '0.0.0.0';

        // Get location from IP
        locationData = await getLocationFromIP(userIP);
        const location = formatLocationForCookie(locationData);

        let page = 1;
        let allResults = [];
        const MAX_PAGES = 10; // Reduced for performance

        while (page <= MAX_PAGES) {
            const url = `${JIOSAAVN_API_BASE_URL}?p=${page}&_format=json&_marker=0&api_version=${API_VERSION}&ctx=${CTX}&n=50&__call=search.getResults&q=${encodeURIComponent(query)}`;
            // Pass language and location to API request
            const response = await makeApiRequest(url, language, location);

            if (!response.results || !Array.isArray(response.results)) break;

            // Filter based on requested languages provided in search
            const filteredSongs = response.results.filter(
                (song) => targetLanguages.includes(song.language.toLowerCase())
            );
            allResults.push(...filteredSongs);

            if (response.results.length < 50) {
                break;
            }
            page++;
        }
        res.json(allResults);

        // Log search stats
        const duration = Date.now() - startTime;
        sendStatsEvent("SEARCH_EVENT", {
            search_query: query,
            search_duration_in_ms: duration,
            sub_type: "songs"
        }, locationData);

    } catch (error) {
        res.status(500).json({ error: error.message || "An error occurred" });
    }
};

exports.getSongDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { language = "tamil,english" } = req.query;
        const url = `${JIOSAAVN_API_BASE_URL}?__call=song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${id}`;
        const songDetails = await makeApiRequest(url, language);
        res.json(songDetails);
    } catch (error) {
        res.status(500).json({ error: "An error occurred" });
    }
};

exports.searchAlbums = async (req, res) => {
    const startTime = Date.now();
    let locationData = null;
    try {
        const { query } = req.params;
        const { language = "tamil,english" } = req.query;
        const targetLanguages = language.toLowerCase().split(",");

        // Get user's real IP
        const userIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '0.0.0.0';

        // Get location from IP
        locationData = await getLocationFromIP(userIP);
        const location = formatLocationForCookie(locationData);

        let page = 1;
        let allResults = [];
        const MAX_PAGES = 10;

        while (page <= MAX_PAGES) {
            const url = `${JIOSAAVN_API_BASE_URL}?p=${page}&_format=json&_marker=0&api_version=${API_VERSION}&ctx=${CTX}&n=50&__call=search.getAlbumResults&q=${encodeURIComponent(query)}`;
            // Pass language and location
            const response = await makeApiRequest(url, language, location);

            if (!response.results || !Array.isArray(response.results)) break;

            const filteredAlbums = response.results.filter(
                (album) => targetLanguages.includes(album.language.toLowerCase())
            );
            allResults.push(...filteredAlbums);

            if (response.results.length < 50) {
                break;
            }
            page++;
        }
        res.json(allResults);

        // Log search stats
        const duration = Date.now() - startTime;
        sendStatsEvent("SEARCH_EVENT", {
            search_query: query,
            search_duration_in_ms: duration,
            sub_type: "albums"
        }, locationData);

    } catch (error) {
        res.status(500).json({ error: "An error occurred" });
    }
};

exports.getAlbumDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { language = "tamil,english" } = req.query;
        const url = `${JIOSAAVN_API_BASE_URL}?__call=webapi.get&api_version=${API_VERSION}&_format=json&_marker=0&ctx=web6dot0&token=${id}&type=album`;
        const albumDetails = await makeApiRequest(url, language);
        res.json(albumDetails);
    } catch (error) {
        res.status(500).json({ error: "An error occurred" });
    }
};

exports.searchPlaylists = async (req, res) => {
    const startTime = Date.now();
    let locationData = null;
    try {
        const { query } = req.params;
        const { language = "tamil,english" } = req.query;

        // Get user's real IP
        const userIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '0.0.0.0';

        // Get location from IP
        locationData = await getLocationFromIP(userIP);
        const location = formatLocationForCookie(locationData);

        const url = `${JIOSAAVN_API_BASE_URL}?__call=search.getPlaylistResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&ctx=${CTX}&api_version=${API_VERSION}&p=1&n=50`;
        // Pass language and location
        const response = await makeApiRequest(url, language, location);

        if (response.results) {
            res.json(response.results);
        } else {
            res.json(response);
        }

        // Log search stats
        const duration = Date.now() - startTime;
        sendStatsEvent("SEARCH_EVENT", {
            search_query: query,
            search_duration_in_ms: duration,
            sub_type: "playlists"
        }, locationData);

    } catch (error) {
        res.status(500).json({ error: "An error occurred" });
    }
};

exports.getPlaylistDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { language = "tamil,english" } = req.query;
        const url = `${JIOSAAVN_API_BASE_URL}?__call=playlist.getDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&listid=${id}`;
        const playlistDetails = await makeApiRequest(url, language);
        res.json(playlistDetails);
    } catch (error) {
        res.status(500).json({ error: "An error occurred" });
    }
};

exports.artistMoreDetails = async (req, res) => {
    try {
        const { token } = req.params;
        let { language, p = 0, sub_type = "", more = false } = req.query;
        if (!language) language = "tamil,english";

        // Get user's real IP address
        const userIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '0.0.0.0';

        // Get location from IP
        const locationData = await getLocationFromIP(userIP);
        const location = formatLocationForCookie(locationData);

        // Auto-detect language if default
        if (language.toLowerCase() === "tamil,english" || language.toLowerCase() === "english") {
            const detectedLangs = getLanguagesForLocation(locationData);
            if (detectedLangs) {
                language = detectedLangs;
            }
        }

        // Build the URL based on parameters
        let url;
        if (more === "true" && sub_type) {
            // For pagination requests (more songs or albums)
            url = `${JIOSAAVN_API_BASE_URL}?__call=webapi.get&token=${encodeURIComponent(token)}&type=artist&p=${p}&n_song=50&n_album=50&sub_type=${sub_type}&more=true&category=&sort_order=&includeMetaTags=0&ctx=${CTX}&api_version=${API_VERSION}&_format=json&_marker=0`;
        } else {
            // Initial request
            url = `${JIOSAAVN_API_BASE_URL}?__call=webapi.get&token=${encodeURIComponent(token)}&type=artist&p=${p}&n_song=50&n_album=50&sub_type=&category=&sort_order=&includeMetaTags=0&ctx=${CTX}&api_version=${API_VERSION}&_format=json&_marker=0`;
        }

        const artistDetails = await makeApiRequest(url, language, location);
        res.json(artistDetails);
    } catch (error) {
        res.status(500).json({ error: error.message || "An error occurred" });
    }
};

exports.getMediaUrl = async (req, res) => {
    try {
        const { id, urlid } = req.params;
        const decryptedLink = createDownloadLinks(urlid);
        const result = { id, links: decryptedLink };
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message || error });
    }
};

exports.debugLocation = async (req, res) => {
    try {
        // Get user's real IP address
        const userIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '0.0.0.0';

        // Get location from IP
        const locationData = await getLocationFromIP(userIP);
        const location = formatLocationForCookie(locationData);

        res.json({
            detectedIP: userIP,
            headers: {
                'x-forwarded-for': req.headers['x-forwarded-for'],
                'x-real-ip': req.headers['x-real-ip'],
            },
            locationData: locationData,
            formattedForCookie: location
        });
    } catch (error) {
        res.status(500).json({ error: error.message || "An error occurred" });
    }
};
