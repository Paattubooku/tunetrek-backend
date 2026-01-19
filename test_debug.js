const fs = require('fs');
try {
    const musicController = require('./src/controllers/musicController');
    fs.writeFileSync('debug_output.txt', 'Import successful');
} catch (e) {
    fs.writeFileSync('debug_output.txt', 'Error: ' + e.stack);
}
