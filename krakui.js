console.log("Krakui browser starting ...");


var KrakenClient = require('kraken-api');

// Expose KrakUI.kraken to others
window.KrakUI = {};
window.KrakUI.kraken = new KrakenClient(krakUiApiKey.api_key,krakUiApiKey.api_secret);

