const { makeApiRequest } = require("../utils/api");
const { JIOSAAVN_API_BASE_URL, CTX, API_VERSION } = require("../config");

// Helper to handle potential malformed JSON from these specific endpoints
// access via raw fetch to get text
const fetchAndParseRadioParams = async (url) => {
    // We can reuse makeApiRequest logic but we need text, not json() immediately
    // Since makeApiRequest does response.json(), we'll implement a variant or just use fetch directly here using the same headers.
    // Ideally we refactor makeApiRequest to support text, but for now I'll duplicate the fetch config to ensure safety as per constraints.
    // Actually, better: extend makeApiRequest? No, let's just use it and catch error?
    // If response.json() fails, we can't easily recover the text stream in standard fetch polyfills sometimes.
    // Let's copy-paste the headers logic for now to stay robust and "safe".

    // Actually, I'll import headers or just hardcode them as they are critical constants.
    const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': `gdpr_acceptance=true; DL=english; L=English; geo=49.206.118.191%2CIN%2CTamil%20Nadu%2CCoimbatore%2C641018; mm_latlong=11.0142%2C76.9941; AKA_A2=A;`,
        'Priority': 'u=0, i',
        'Sec-CH-UA': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    };

    const response = await fetch(url, { headers });
    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch (e) {
        // Apply the specific fix from original code if standard parse fails
        // Original fix: rawContent.replaceAll('From \"','From \\\"').replaceAll('\")','\\\")');
        // then unescape double backslashes
        console.warn("JSON Parse failed, attempting regex fix...");
        const fix = text.replaceAll('From \"', 'From \\\"').replaceAll('\")', '\\\")');
        const unescapedInput = fix.replace(/\\\\"/g, '"').replace(/\\\\/g, '\\');
        return JSON.parse(unescapedInput);
    }
};

exports.getRadio = async (req, res) => {
    const { query, urlid } = req.query;

    if (!query || !urlid) {
        return res.status(400).json({
            error: 'Both "query" and "urlid" parameters are required.'
        });
    }

    const url = `${JIOSAAVN_API_BASE_URL}?__call=webradio.createEntityStation&entity_id=${query}&entity_type=queue&freemium=&shared=&_format=json&_marker=0&api_version=4&ctx=android`;

    try {
        // Replaced Puppeteer with fetchAndParse
        const parsedObject = await fetchAndParseRadioParams(url);

        if (!parsedObject.stationid) {
            throw new Error("No stationid found in response");
        }

        // Original code hardcoded this internal URL? 
        // const url1 = `https://mserver-pi.vercel.app/moreRadio?query=${parsedObject.stationid}`;
        // This looks like a self-referential call to another server? 
        // If "mserver-pi.vercel.app" is THIS server (or the previous version), we should call our own function logic or the external API directly.
        // The original code called `makeApiRequest(url1)` which implies it was hitting an external endpoint.
        // However, `url1` points to `/moreRadio` which IS defined in this app?
        // If it's this app, we should just call the logic directly to save a hop.
        // BUT the constraint says "Responses are identical to original behavior".
        // If I change it to internal logic, it's faster.
        // The original URL was `mserver-pi.vercel.app`. It's likely the production URL of the original code.
        // If I leave it, it hits the PRODUCTION server, not localhost.
        // I should PROBABLY call the logic for `moreRadio` here directly if possible??
        // Wait, the original code: `const url1 = ...mserver-pi...; const [result] = await Promise.all([makeApiRequest(url1)...])`
        // It was calling ITSELF (or the prod version of itself).
        // To be cleaner and more scalable, I should call the `getMoreRadio` logic (JioSaavn API) directly instead of round-tripping to a vercel app.
        // `moreRadio` does: `webradio.getSong&stationid=...&k=20...`

        // I will REPLACE the self-call with the direct JioSaavn call that /moreRadio would have made.
        // /moreRadio params: query=stationid
        // logic: fetch webradio.getSong with k=20

        const stationId = parsedObject.stationid;
        const moreRadioUrl = `${JIOSAAVN_API_BASE_URL}?__call=webradio.getSong&stationid=${encodeURIComponent(stationId)}&k=20&next=1&api_version=4&_format=json&_marker=0&ctx=android`;

        // Call parallel: More Radio (Stations songs) + URLID song (Single song)
        const url2 = `${JIOSAAVN_API_BASE_URL}?__call=webapi.get&token=${urlid}&type=song&includeMetaTags=0&ctx=${CTX}&api_version=${API_VERSION}&_format=json&_marker=0`;

        // We use Promise.all for parallelism
        const [stationSongsRaw, singleSongData] = await Promise.all([
            fetchAndParseRadioParams(moreRadioUrl), // Use standard fetch logic for consistency
            makeApiRequest(url2)
        ]);

        let allResults = {
            stationId: stationId,
            songs: [],
        };

        // Add single song
        if (singleSongData.songs && singleSongData.songs.length > 0) {
            allResults.songs.push(singleSongData.songs[0]);
        }

        // Add station songs
        // Logic from moreRadio:
        // Object.keys(parsedObject).forEach((key) => { if (key !== 'stationid') allResults.push(parsedObject[key].song); });
        if (stationSongsRaw) {
            Object.keys(stationSongsRaw).forEach((key) => {
                if (key !== 'stationid' && stationSongsRaw[key].song) {
                    allResults.songs.push(stationSongsRaw[key].song);
                }
            });
        }

        return res.status(200).json(allResults);
    } catch (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

exports.getMoreRadio = async (req, res) => {
    const { query, k } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'The "query" parameter is required.' });
    }

    const songCount = k ? parseInt(k) : 20;

    const url = `${JIOSAAVN_API_BASE_URL}?__call=webradio.getSong&stationid=${encodeURIComponent(query)}&k=${songCount}&next=1&api_version=4&_format=json&_marker=0&ctx=android`;

    try {
        const parsedObject = await fetchAndParseRadioParams(url);

        let allResults = [];
        if (k != 1) {
            Object.keys(parsedObject).forEach((key) => {
                if (key !== 'stationid' && parsedObject[key]?.song) {
                    allResults.push(parsedObject[key].song);
                }
            });
        } else {
            if (parsedObject.song) allResults.push(parsedObject.song);
        }

        return res.status(200).json(allResults);
    } catch (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

exports.getRadioNew = async (req, res) => {
    try {
        const { query, name, l, language } = req.query;
        let url;
        // Logic from original code
        if (query && !name && !l) {
            url = `${JIOSAAVN_API_BASE_URL}?__call=webradio.createStation&pid=${query}&_format=json&_marker=0&api_version=${API_VERSION}&ctx=iphoneapp`;
        } else if (!query && name && l) {
            url = `${JIOSAAVN_API_BASE_URL}?name=${name}&api_version=${API_VERSION}&_format=json&_marker=0&ctx=iphoneapp&__call=webradio.createFeaturedStation&language=${l}`;
        } else if (!query && name && language && !l) {
            // Original hardcoded logic? preserved as is
            url = `https://www.jiosaavn.com/api.php?language=tamil,english&pid=&query=Ilaiyaraaja&name=Ilaiyaraaja&mode=&artistid=&api_version=4&_format=json&_marker=0&ctx=web6dot0&__call=webradio.createArtistStation`;
        } else {
            return res.status(400).send({ error: 'Invalid parameters. Provide either query or name and l.' });
        }

        // Using robust fetchAndParseRadioParams to handle potential malformed JSON
        const response = await fetchAndParseRadioParams(url);
        const stationId = response.stationid;

        const url1 = `${JIOSAAVN_API_BASE_URL}?__call=webradio.getSong&stationid=${stationId}&k=20&next=0&api_version=4&_format=json&_marker=0&ctx=iphoneapp`;
        const result = await fetchAndParseRadioParams(url1);

        let allResults = {
            stationId,
            songs: []
        };

        Object.keys(result).forEach(key => {
            if (key !== "stationid" && result[key].song) {
                allResults.songs.push(result[key].song);
            }
        });

        res.json(allResults);
    } catch (error) {
        res.status(500).json({ error: error.message || "An error occurred" });
    }
};

exports.getMoreRadioNew = async (req, res) => {
    try {
        const { id, k } = req.params;
        const url = `${JIOSAAVN_API_BASE_URL}?__call=webradio.getSong&stationid=${id}&k=${k}&next=0&api_version=4&_format=json&_marker=0&ctx=iphoneapp`;
        const result = await fetchAndParseRadioParams(url);

        let allResults = [];
        if (k != 1) {
            Object.keys(result).forEach((key) => {
                if (key !== 'stationid' && result[key].song) {
                    allResults.push(result[key].song);
                }
            });
        } else {
            if (result.song) allResults.push(result.song);
        }

        res.json(allResults);
    } catch (error) {
        res.status(500).json({ error: error.message || 'An error occurred' });
    }
};
