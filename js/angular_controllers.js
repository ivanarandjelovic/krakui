var KrakUIApp = angular.module('KrakUIApp', []);

var DEFAULT_ASSET_PAIR = 'XXBTZEUR';

KrakUIApp.controller('KrakUIController', [
		'$scope',
		'$interval',
		function($scope, $interval) {

			$scope.greeting = 'Hola!';
			$scope.activeTicker = "...";
			$scope.tickers = [ "none" ];
			$scope.assetPairs = null;
			$scope.serverTime = new Date(0);
			$scope.serverUnixtime = 0;
			var servertimeUpdateCounter = 60;

			// Set chosen asset pair
			$scope.setActiveTicker = function(newActiveTicker) {
				console.debug("Setting active ticker to : " + newActiveTicker)
				$scope.activeTicker = newActiveTicker;
			};

			// get initial set of tradable asset pairs
			window.KrakUI.kraken.api('AssetPairs', {},
					function(error, data) {
						if (error) {
							console.log(error);
						} else {
							console.log("got asset pairs:")
							console.log(data.result);
							$scope.assetPairs = data.result;
							$scope.tickers = [];
							for (assetPairName in $scope.assetPairs) {
								if ($scope.assetPairs
										.hasOwnProperty(assetPairName)) {
									$scope.tickers.push(assetPairName);
								}
							}
							if ($scope.assetPairs[DEFAULT_ASSET_PAIR]) {
								$scope.activeTicker = DEFAULT_ASSET_PAIR;
							} else {
								for (assetPairName in $scope.assetPairs) {
									if ($scope.assetPairs
											.hasOwnProperty(assetPairName)) {
										$scope.activeTicker = assetPairName;
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
		} ]);