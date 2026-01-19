// Get location details from IP address
const getLocationFromIP = async (ip) => {
    try {
        // Use ip-api.com (free, no API key needed, 45 requests/minute)
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon`);
        const data = await response.json();

        if (data.status === 'success') {
            return {
                ip: ip,
                city: data.city || 'Unknown',
                state: data.regionName || data.region || 'Unknown',
                country: data.country || 'IN',
                countryCode: data.countryCode || 'IN',
                postalCode: data.zip || '000000',
                latitude: data.lat || 0,
                longitude: data.lon || 0
            };
        }

        // Fallback to default
        return getDefaultLocation(ip);
    } catch (error) {
        console.error('Error fetching IP location:', error);
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
    // Format: IP%2CCountryCode%2CState%2CCity%2CPostalCode
    const geo = `${location.ip}%2C${location.countryCode}%2C${encodeURIComponent(location.state)}%2C${encodeURIComponent(location.city)}%2C${location.postalCode}`;
    const latlong = `${location.latitude}%2C${location.longitude}`;

    return { geo, latlong };
};

module.exports = {
    getLocationFromIP,
    formatLocationForCookie,
    getDefaultLocation
};
