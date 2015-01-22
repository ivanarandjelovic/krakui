console.log("Krakui browser starting ...");

// var KrakenClient = require('kraken-api');
// var kraken = new KrakenClient('krakUiApiKey.api_key',
// 'krakUiApiKey.api_secret');

window.test = "123";

window.KrakUIApp = window.angular.module('KrakUIApp', []);

window.KrakUIApp.controller('KrakUIController', [ '$scope', function($scope) {
	$scope.greeting = 'Hola!';
	$scope.activeTicker = "select ticker";
	$scope.tickers = ["123","abc","xxx"];
	$scope.setActiveTicker = function(newActiveTicker) {
		console.debug("Setting active ticker to : " + newActiveTicker)
		$scope.activeTicker = newActiveTicker;
	};
} ]);
