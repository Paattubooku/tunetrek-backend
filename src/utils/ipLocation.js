// Get location details from IP address
const getLocationFromIP = async (ip) => {
    try {
        console.log('[IP Location] Detecting location for IP:', ip);

        // Use ip-api.com (free, no API key needed, 45 requests/minute)
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon`);
        const data = await response.json();

        console.log('[IP Location] API Response:', data);

        if (data.status === 'success') {
            const locationData = {
                ip: ip,
                city: data.city || 'Unknown',
                state: data.regionName || data.region || 'Unknown',
                country: data.country || 'IN',
                countryCode: data.countryCode || 'IN',
                postalCode: data.zip || '000000',
                latitude: data.lat || 0,
                longitude: data.lon || 0
            };
            console.log('[IP Location] Detected location:', locationData);
            return locationData;
        }

        // Fallback to default
        console.log('[IP Location] API failed, using default location');
        return getDefaultLocation(ip);
    } catch (error) {
        console.error('[IP Location] Error fetching IP location:', error);
        return getDefaultLocation(ip);
    }
};

const getDefaultLocation = (ip) => {
    return {
        ip: ip || '0.0.0.0',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        countryCode: 'IN',
        postalCode: '600001',
        latitude: 13.0827,
        longitude: 80.2707
    };
};

// Format location for JioSaavn cookie
const formatLocationForCookie = (location) => {
    // JioSaavn format: IP,CountryCode,State,City,PostalCode
    // Note: IP uses colons (:) not %2C, other fields use %2C
    // Example: 2401:4900:1cc9:726c:9169:9be2:ba46:b240%2CIN%2CTamil%20Nadu%2CChennai%2C600009

    // Replace dots with colons for IP (to mimic IPv6-like format)
    const ipFormatted = location.ip.replace(/\./g, ':');

    const geo = `${ipFormatted}%2C${location.countryCode}%2C${encodeURIComponent(location.state)}%2C${encodeURIComponent(location.city)}%2C${location.postalCode}`;
    const latlong = `${location.latitude}%2C${location.longitude}`;

    return { geo, latlong };
};

// Get preferred languages based on location
const getLanguagesForLocation = (location) => {
    if (location.countryCode !== 'IN') return 'english';

    const state = location.state.toLowerCase();

    if (state.includes('tamil')) return 'tamil,english';
    if (state.includes('karnataka')) return 'kannada,english';
    if (state.includes('andhra') || state.includes('telangana')) return 'telugu,english';
    if (state.includes('kerala')) return 'malayalam,english';
    if (state.includes('maharashtra')) return 'hindi,marathi,english';
    if (state.includes('punjab')) return 'punjabi,hindi,english';
    if (state.includes('bengal')) return 'bengali,hindi,english';
    if (state.includes('gujarat')) return 'gujarati,hindi,english';
    if (state.includes('rajasthan')) return 'rajasthani,hindi,english';
    if (state.includes('haryana')) return 'haryanvi,hindi,english';
    if (state.includes('assam')) return 'assamese,hindi,english';
    if (state.includes('odisha')) return 'odia,hindi,english';
    if (state.includes('bhojpuri')) return 'bhojpuri,hindi,english';

    // Default for rest of India
    return 'hindi,english';
};

module.exports = {
    getLocationFromIP,
    formatLocationForCookie,
    getDefaultLocation,
    getLanguagesForLocation
};
