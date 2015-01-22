console.log("Krakui starting ...");

var fs = require('fs');
var krakUiApiKey = JSON.parse(fs.readFileSync('krakui-api-key.json', 'utf8'));

console.log(krakUiApiKey);

var KrakenClient = require('kraken-api');
var kraken = new KrakenClient(krakUiApiKey.api_key, krakUiApiKey.api_secret);

/*// Display user's balance
kraken.api('Balance', null, function(error, data) {
    if(error) {
        console.log(error);
    }
    else {
        console.log(data.result);
    }
});*/

// Get Ticker Info
kraken.api('Ticker', {"pair": 'XXBTZEUR'}, function(error, data) {
    if(error) {
        console.log(error);
    }
    else {
        console.log(data.result);
    }
});


/*kraken.api('AssetPairs', {}, function(error, data) {
    if(error) {
        console.log(error);
    }
    else {
        console.log(data.result);
    }
});*/

