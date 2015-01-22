var KrakUIApp = angular.module('KrakUIApp', []);

KrakUIApp.controller('KrakUIController', [ '$scope', function($scope) {
	
	$scope.greeting = 'Hola!';
	$scope.activeTicker = "select ticker";
	$scope.tickers = [];
	
	// Set chosen asset pair
	$scope.setActiveTicker = function(newActiveTicker) {
		console.debug("Setting active ticker to : " + newActiveTicker)
		$scope.activeTicker = newActiveTicker;
	};
	
	// get initial set of tradable asset pairs
	window.KrakUI.kraken.api('AssetPairs', {}, function(error, data) {
	    if(error) {
	        console.log(error);
	    }
	    else {
	        console.log(data.result);
	        $scope.tickers = data.result;
	    }
	});
} ]);