// using native fetch
const fs = require('fs');
const logFile = 'repro_log.txt';

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

const JIOSAAVN_API_BASE_URL = "https://www.jiosaavn.com/api.php";

const baseHeaders = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
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

const cookieIndia = `gdpr_acceptance=true; DL=english; L=English; geo=49.206.118.191%2CIN%2CTamil%20Nadu%2CCoimbatore%2C641018; mm_latlong=11.0142%2C76.9941; AKA_A2=A;`;

const makeApiRequest = async (url, customHeaders) => {
    try {
        log(`Fetching: ${url}`);
        const response = await fetch(url, { headers: customHeaders });
        log(`Status: ${response.status}`);
        const text = await response.text();
        // log(`Body First 100: ${text.substring(0, 100)}`);
        try {
            return JSON.parse(text);
        } catch (e) {
            log(`JSON Parse Error: ${e.message}`);
            return null;
        }
    } catch (error) {
        log(`Error: ${error.message}`);
        return null;
    }
};

const testRadioNew = async () => {
    fs.writeFileSync(logFile, "Starting Test\n");
    const query = "Nc-DXXKk";
    const urlCreate = `${JIOSAAVN_API_BASE_URL}?__call=webradio.createStation&pid=${query}&_format=json&_marker=0&api_version=4&ctx=iphoneapp`;

    // Test 1: With Custom Cookie
    log("--- Test 1: India Cookies ---");
    const headers1 = { ...baseHeaders, 'Cookie': cookieIndia };
    const res1 = await makeApiRequest(urlCreate, headers1);
    log(`Result 1 StationID: ${res1?.stationid}`);

    // Test 2: No Geo Cookie (just basic)
    log("--- Test 2: Basic Cookies ---");
    const headers2 = { ...baseHeaders, 'Cookie': 'gdpr_acceptance=true; DL=english; L=English;' };
    const res2 = await makeApiRequest(urlCreate, headers2);
    log(`Result 2 StationID: ${res2?.stationid}`);
};

testRadioNew();
