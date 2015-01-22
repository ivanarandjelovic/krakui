console.log("Krakui browser starting ...");

window.KrakUI = {};

var KrakenClient = require('kraken-api');

window.KrakUI.kraken = new KrakenClient(krakUiApiKey.api_key,krakUiApiKey.api_secret);


