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

module.exports = {
    makeApiRequest
};
