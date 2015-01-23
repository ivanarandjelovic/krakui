var KrakUIApp = angular.module('KrakUIApp', []);

var DEFAULT_ASSET_PAIR = 'XXBTZEUR';
var TICKER_UPDATE_INTERVAL_IN_MS = 3000;

KrakUIApp.controller('KrakUIController', [
		'$scope',
		'$interval',
		function($scope, $interval) {

			var servertimeUpdateCounter = 60;
			var tickerUpdateIntervalPromise = null;

			$scope.activeAssetPair = null;
			$scope.assetPairNames = [ "none" ];
			//$scope.assetPairs = null;
			$scope.serverTime = new Date(0);
			$scope.serverUnixtime = 0;
			$scope.ticker = null;

			// Function to update current active ticker value
			var tickerUpdate = function() {
				if($scope.activeAssetPair === null) {
					$scope.ticker = null;
				} else {
					// get ticker info
					window.KrakUI.kraken.api('Ticker', {pair : $scope.activeAssetPair},
							function(error, data) {
								if (error) {
									console.log(error);
									$scope.ticker = null;
								} else {
									console.log("got ticker info:")
									console.log(data.result);
									$scope.ticker = data.result[$scope.activeAssetPair];
									$scope.$apply();
								}
							});
				}
			}
			
			// Set chosen asset pair
			$scope.setActiveAssetPair = function(newActiveAssetPair) {
				console.debug("Setting active asset pair to : " + newActiveAssetPair)
				$scope.activeAssetPair = newActiveAssetPair;
				// Initiate ticker update at once:
				tickerUpdate();
			};

			// get initial set of treadable asset pairs
			window.KrakUI.kraken.api('AssetPairs', {},
					function(error, data) {
						if (error) {
							console.log(error);
						} else {
							console.log("got asset pairs:")
							console.log(data.result);
							//$scope.assetPairs = data.result;
							$scope.assetPairNames = [];
							for (assetPairName in data.result) {
								if (data.result
										.hasOwnProperty(assetPairName)) {
									$scope.assetPairNames.push(assetPairName);
								}
							}
							if (data.result[DEFAULT_ASSET_PAIR]) {
								$scope.setActiveAssetPair(DEFAULT_ASSET_PAIR);
							} else {
								for (assetPairName in data.result) {
									if (data.result
											.hasOwnProperty(assetPairName)) {
										$scope.setActiveAssetPair(assetPairName);
										break;
									}
								}
							}
							$scope.$apply();
						}
					});

			// Set update of server time each second
			$interval(function() {
				// update server time only each 60 seconds (and first time)
				if (servertimeUpdateCounter >= 60) {
					servertimeUpdateCounter = 0;
					window.KrakUI.kraken.api('Time', {}, function(error, data) {
						$scope.serverUnixtime = data.result.unixtime;
					});
				} else {
					$scope.serverUnixtime += 1;
				}
				servertimeUpdateCounter += 1;
				$scope.serverTime = new Date($scope.serverUnixtime*1000);

			}, 1000);

			// Set update of ticker data every TICKER_UPDATE_INTERVAL_IN_MS milliseconds
			tickerUpdateIntervalPromise = $interval(function() {
				// Initiate ticker update
				tickerUpdate();
			}, TICKER_UPDATE_INTERVAL_IN_MS);
		
		} ]);