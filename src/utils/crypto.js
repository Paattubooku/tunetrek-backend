const CryptoJS = require("crypto-js");

const createDownloadLinks = (encryptedMediaUrl) => {
    if (!encryptedMediaUrl) return [];

    try {
        const qualities = [
            { id: '_12', bitrate: '12kbps' },
            { id: '_48', bitrate: '48kbps' },
            { id: '_96', bitrate: '96kbps' },
            { id: '_160', bitrate: '160kbps' },
            { id: '_320', bitrate: '320kbps' },
        ];

        const key = '38346591';

        const decrypted = CryptoJS.DES.decrypt(
            {
                ciphertext: CryptoJS.enc.Base64.parse(encryptedMediaUrl),
            },
            CryptoJS.enc.Utf8.parse(key),
            { mode: CryptoJS.mode.ECB }
        );

        const decryptedLink = decrypted.toString(CryptoJS.enc.Utf8);

        if (!decryptedLink) return [];

        // Check if the link contains any of the quality identifiers
        const hasQuality = qualities.some(q => decryptedLink.includes(q.id));

        if (hasQuality) {
            return qualities.map(({ id, bitrate }) => ({
                quality: bitrate,
                link: decryptedLink.replace(/_\d+/, id), // Regex replace for robustness
            }));
        }

        return [{ quality: "universal", link: decryptedLink }];
    } catch (error) {
        console.error("Decryption error:", error);
        return []; // Return empty array on error instead of throwing to avoid crashing
    }
}

module.exports = {
    createDownloadLinks
};
