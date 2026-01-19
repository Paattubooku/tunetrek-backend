const { JIOSAAVN_API_BASE_URL } = require("../config");

// Keep-alive agent for performance optimization (if using node-fetch or undici in future, but fetch in Node 18+ handles this well mostly)
// For now, using native fetch.

const makeApiRequest = async (url, language = "English", location = null) => {
    try {
        // Default location (Coimbatore, Tamil Nadu)
        const defaultGeo = "49.206.118.191%2CIN%2CTamil%20Nadu%2CCoimbatore%2C641018";
        const defaultLatLong = "11.0142%2C76.9941";

        // Use provided location or default
        const geo = location?.geo || defaultGeo;
        const latlong = location?.latlong || defaultLatLong;

        // Normalize language to lowercase
        const normalizedLanguage = language.toLowerCase();

        const cookieString = `gdpr_acceptance=true; DL=english; L=${normalizedLanguage}; geo=${geo}; mm_latlong=${latlong}; AKA_A2=A;`;
        console.log('[API] Sending cookie to JioSaavn:', cookieString);

        const response = await fetch(url, {
            headers: {
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "en-US,en;q=0.9",
                Cookie: cookieString,
                Priority: "u=0, i",
                "Sec-CH-UA":
                    '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
                "Sec-CH-UA-Mobile": "?0",
                "Sec-CH-UA-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            },
        });

        if (!response.ok) {
            throw new Error(`API Request failed with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`[API Error] ${url}:`, error.message);
        throw error;
    }
};

const { JIOSAAVN_STATS_BASE_URL } = require("../config");

// Helper to generate a random device ID
const generateDeviceId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const sendStatsEvent = async (eventName, params = {}, locationData = null) => {
    try {
        const timestamp = Date.now();
        const deviceId = generateDeviceId(); // In a real app, this should be persistent per user

        // Default location if not provided
        const city = locationData?.city || "Chennai";
        const state = locationData?.region || "Tamil Nadu"; // 'region' is standard in ip-api, mapping to state
        const country = locationData?.countryCode || "IN";

        const statsPayload = [{
            "event_name": eventName,
            "cc": country,
            "state": state,
            "city": city,
            "ctx": "web6dot0",
            "language": "english", // Defaulting, maybe pass from params
            "app_language": "NULL",
            "mobile_network": "NULL",
            "network_type": "4g",
            "login_mode": "Web",
            "app_version": "6.0",
            "device_id": deviceId, // We generate a random one for now
            "ts": timestamp.toString(),
            "tz": "Asia/Calcutta",
            "login_state": false,
            "promode": "NULL",
            ...params // Spread specific params like search_query, search_duration_in_ms
        }];

        const formBody = new URLSearchParams();
        formBody.append('batch_params', JSON.stringify(statsPayload));

        // Using no-cors mode might be needed if calling from browser, 
        // but here we are server-side, so we can just call it.
        // However, JioSaavn might check referrer or origin. We mock them in headers.

        await fetch(JIOSAAVN_STATS_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
                'Origin': 'https://www.jiosaavn.com',
                'Referer': 'https://www.jiosaavn.com/'
            },
            body: formBody
        });

        // We generally fire and forget stats, so we don't return anything critical
        console.log(`[Stats] Sent ${eventName}`);
    } catch (error) {
        console.error(`[Stats Error] Failed to send ${eventName}:`, error.message);
        // Don't throw, stats failure shouldn't break the app
    }
};

module.exports = {
    makeApiRequest,
    sendStatsEvent
};
