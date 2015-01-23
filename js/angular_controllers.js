var KrakUIApp = angular.module('KrakUIApp', []);

var DEFAULT_ASSET_PAIR = 'XXBTZEUR';
var TICKER_UPDATE_INTERVAL_IN_MS = 5000;
var OHLC_UPDATE_INTERVAL_IN_MS = 10000;

KrakUIApp.controller('KrakUIController', [
		'$scope',
		'$interval',
		function($scope, $interval) {

			var servertimeUpdateCounter = 60;

			$scope.activeAssetPair = null;
			$scope.assetPairNames = [ "none" ];
			// $scope.assetPairs = null;
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
								}
								// $scope.$apply();
							});
				}
			}
			
			// Function to update OHLC graph
			var updateOHLC = function() {
				if($scope.activeAssetPair === null) {
					$scope.OHLC = null;
				} else {
					// get ticker info
					window.KrakUI.kraken.api('OHLC', {pair : $scope.activeAssetPair},
							function(error, data) {
								var OHLCdata = null;
								if (error) {
									console.log(error);
								} else {
									console.log("got OHLC data (probably too much to log)")
									OHLCdata = data.result[$scope.activeAssetPair];
								}
								drawOHLC($scope.activeAssetPair,OHLCdata);
							});
				}
			}
			
			// Set chosen asset pair
			$scope.setActiveAssetPair = function(newActiveAssetPair) {
				console.debug("Setting active asset pair to : " + newActiveAssetPair)
				$scope.activeAssetPair = newActiveAssetPair;
				// Initiate ticker update and other updates:
				tickerUpdate();
				updateOHLC();
			};

			// get initial set of treadable asset pairs
			window.KrakUI.kraken.api('AssetPairs', {},
					function(error, data) {
						if (error) {
							console.log(error);
						} else {
							console.log("got asset pairs:")
							console.log(data.result);
							// $scope.assetPairs = data.result;
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
							// $scope.$apply();
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

			// Set update of ticker data every TICKER_UPDATE_INTERVAL_IN_MS
			// milliseconds
			$interval(function() {
				// Initiate ticker update
				tickerUpdate();
			}, TICKER_UPDATE_INTERVAL_IN_MS);
		
			// Set update of OHLC data and chart
			$interval(function() {
				// Initiate ticker update
				updateOHLC();
			}, OHLC_UPDATE_INTERVAL_IN_MS);

		} ]);



// Chart drawing section:

var drawOHLC = function (activePairName, OHLCdata) {
	
	var times = [];
	var highs = [];
	var lows = [];
	var data = [];
	var i = 0;
	var item = null;
	
//	for(i = 0; i<OHLCdata.length;i++) {
	for(i = Math.max(0,OHLCdata.length-60); i<OHLCdata.length;i++) {
		item = OHLCdata[i];
		times.push(item[0]*1000);
		highs.push({x:item[0]*1000, y:parseFloat(item[2])});
		lows.push({x:item[0]*1000, y:parseFloat(item[3])});
	}
	
	$(function () {
	    $('#chartOHLC').highcharts({
	        title: {
	            text: 'Asset pair trading graph',
	            x: -20 // center
	        },
	        subtitle: {
	            text: 'Asset pair: '+activePairName,
	            x: -20
	        },
	        xAxis: {
                type: 'datetime',
                tickPixelInterval: 150
                //,
	            //categories: times
            },
	        yAxis: {
	            title: {
	                text: 'Price'
	            },
	            plotLines: [{
	                value: 0,
	                width: 1,
	                color: '#808080'
	            }]
	        },
	        tooltip: {
	            valueSuffix: 'EUR'
	        },
	        legend: {
	            layout: 'vertical',
	            align: 'right',
	            verticalAlign: 'middle',
	            borderWidth: 0
	        },
	        series: [{
	            name: 'High',
	            data: highs
	        }, {
	            name: 'Low',
	            data: lows
	        }]
	    });
	});
};
