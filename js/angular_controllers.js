var KrakUIApp = angular.module('KrakUIApp', []);

KrakUIApp.controller('KrakUIController', [ '$scope', function($scope) {

	$scope.greeting = 'Hola!';
	$scope.activeTicker = "select ticker";
	$scope.tickers = ["none"];
	$scope.assetPairs = null;

	// Set chosen asset pair
	$scope.setActiveTicker = function(newActiveTicker) {
		console.debug("Setting active ticker to : " + newActiveTicker)
		$scope.activeTicker = newActiveTicker;
	};

	// get initial set of tradable asset pairs
	window.KrakUI.kraken.api('AssetPairs', {}, function(error, data) {
		if (error) {
			console.log(error);
		} else {
			console.log("got asset pairs:")
			console.log(data.result);
			$scope.assetPairs = data.result;
			$scope.tickers = [];
			for (assetPairName in $scope.assetPairs) {
				if ($scope.assetPairs.hasOwnProperty(assetPairName)) {
					$scope.tickers.push(assetPairName);
				}
			}
			if($scope.assetPairs.XXBTZEUR) {
				$scope.activeTicker = 'XXBTZEUR';
			}
			$scope.$apply();

		}
	});
} ]);