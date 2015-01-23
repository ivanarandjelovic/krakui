var KrakUIApp = angular.module('KrakUIApp', []);

var DEFAULT_ASSET_PAIR = 'XXBTZEUR';
var TICKER_UPDATE_INTERVAL_IN_MS = 5000;
var OHLC_UPDATE_INTERVAL_IN_MS = 10000;

KrakUIApp
		.controller(
				'KrakUIController',
				[
						'$scope',
						'$interval',
						function($scope, $interval) {
							
							var servertimeUpdateCounter = 60;
							var OHLCIntervalPromise = null;
							
							$scope.activeAssetPair = null;
							$scope.assetPairNames = [ "none" ];
							// $scope.assetPairs = null;
							$scope.serverTime = new Date(0);
							$scope.serverUnixtime = 0;
							$scope.ticker = null;
							$scope.last = null;
							
							// Function to update current active ticker value
							var tickerUpdate = function() {
								if ($scope.activeAssetPair === null) {
									$scope.ticker = null;
								} else {
									// get ticker info
									window.KrakUI.kraken.api('Ticker', {
										pair : $scope.activeAssetPair
									}, function(error, data) {
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

							// get the new OHLC data and update the graph:
							var updateOHLC = function() {
								// KrakUIApp.chartOHLC;
								window.KrakUI.kraken
										.api(
												'OHLC',
												{
													pair : $scope.activeAssetPair,
													since : $scope.last
												},
												function(error, data) {
													var OHLCdata = null;
													var firstUpdate = true, i = 0, item = null;
													if (error) {
														console.log(error);
													} else {
														console.log("got OHLC incremental data");
														console.log(data);
														OHLCdata = data.result[$scope.activeAssetPair];
														$scope.last = data.result.last;
													}
													if (OHLCdata) {
														// there is some data, so do the update:
														for (i = 0; i < OHLCdata.length; i++) {
															item = OHLCdata[i];
															if (firstUpdate) {
																// Just remove last point, new one will be added
																// for sure.
																for (j = 0; j < KrakUIApp.chartOHLC.series.length; j++) {
																	KrakUIApp.chartOHLC.series[j].data[KrakUIApp.chartOHLC.series[j].data.length - 1]
																			.remove(false);
																}
															}
															
															// Add new points and shift others
															KrakUIApp.chartOHLC.series[0].addPoint({
																x : item[0] * 1000,
																y : parseFloat(item[2])
															}, false, !firstUpdate,
																	true);
															
															KrakUIApp.chartOHLC.series[1].addPoint({
																x : item[0] * 1000,
																y : parseFloat(item[3])
															}, (i === OHLCdata.length - 1), !firstUpdate,
																	true);
															
															firstUpdate = false;
														}
													}
												});
							}

							// Function to update OHLC graph
							var initOHLC = function() {
								if ($scope.activeAssetPair === null) {
									$scope.OHLC = null;
								} else {
									// get ticker info
									window.KrakUI.kraken.api('OHLC', {
										pair : $scope.activeAssetPair
									}, function(error, data) {
										var OHLCdata = null;
										if (error) {
											console.log(error);
										} else {
											console.log("got OHLC data (probably too much to log)")
											OHLCdata = data.result[$scope.activeAssetPair];
											$scope.last = data.result.last;
										}
										drawOHLC($scope.activeAssetPair, OHLCdata);
										// cancel previous
										// updates, if any.
										if (OHLCIntervalPromise) {
											$interval.cancel(OHLCIntervalPromise);
											OHLCIntervalPromise = null;
										}
										// Set update of OHLC
										// data and chart
										OHLCIntervalPromise = $interval(function() {
											// Initiate
											// ticker
											// update
											updateOHLC();
										}, OHLC_UPDATE_INTERVAL_IN_MS);
										
									});
								}
							}

							// Set chosen asset pair
							$scope.setActiveAssetPair = function(newActiveAssetPair) {
								console.debug("Setting active asset pair to : "
										+ newActiveAssetPair)
								$scope.activeAssetPair = newActiveAssetPair;
								// Initiate ticker update and other updates:
								tickerUpdate();
								initOHLC();
							};
							
							// get initial set of treadable asset pairs
							window.KrakUI.kraken.api('AssetPairs', {}, function(error, data) {
								if (error) {
									console.log(error);
								} else {
									console.log("got asset pairs:")
									console.log(data.result);
									// $scope.assetPairs =
									// data.result;
									$scope.assetPairNames = [];
									for (assetPairName in data.result) {
										if (data.result.hasOwnProperty(assetPairName)) {
											$scope.assetPairNames.push(assetPairName);
										}
									}
									if (data.result[DEFAULT_ASSET_PAIR]) {
										$scope.setActiveAssetPair(DEFAULT_ASSET_PAIR);
									} else {
										for (assetPairName in data.result) {
											if (data.result.hasOwnProperty(assetPairName)) {
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
								// update server time only each 60
								// seconds (and first time)
								if (servertimeUpdateCounter >= 60) {
									servertimeUpdateCounter = 0;
									window.KrakUI.kraken.api('Time', {}, function(error, data) {
										$scope.serverUnixtime = data.result.unixtime;
									});
								} else {
									$scope.serverUnixtime += 1;
								}
								servertimeUpdateCounter += 1;
								$scope.serverTime = new Date($scope.serverUnixtime * 1000);
								
							}, 1000);
							
							// Set update of ticker data every
							// TICKER_UPDATE_INTERVAL_IN_MS
							// milliseconds
							$interval(function() {
								// Initiate ticker update
								tickerUpdate();
							}, TICKER_UPDATE_INTERVAL_IN_MS);
							
						} ]);

// Chart drawing section:

var drawOHLC = function(activePairName, OHLCdata) {
	
	var highs = [];
	var lows = [];
	var volume = [];
	var i = 0;
	var item = null;
	
	// for(i = 0; i<OHLCdata.length;i++) {
	for (i = Math.max(0, OHLCdata.length - 60); i < OHLCdata.length; i++) {
		item = OHLCdata[i];
		highs.push({
			x : item[0] * 1000,
			y : parseFloat(item[2])
		});
		lows.push({
			x : item[0] * 1000,
			y : parseFloat(item[3])
		});
	}
	
	$(function() {
		var $chartCont = $('#chartOHLC').highcharts({
			title : {
				text : 'Asset pair trading graph',
				x : -20
			// center
			},
			subtitle : {
				text : 'Asset pair: ' + activePairName,
				x : -20
			},
			xAxis : {
				type : 'datetime',
				tickPixelInterval : 150
			// ,
			// categories: times
			},
			yAxis : {
				title : {
					text : 'Price'
				},
				plotLines : [ {
					value : 0,
					width : 1,
					color : '#808080'
				} ]
			},
			tooltip : {
				valueSuffix : 'EUR'
			},
			legend : {
				layout : 'vertical',
				align : 'right',
				verticalAlign : 'middle',
				borderWidth : 0
			},
			series : [ {
				name : 'High',
				data : highs
			}, {
				name : 'Low',
				data : lows
			} ]
		});
		KrakUIApp.chartOHLC = Highcharts.charts[$chartCont.data('highchartsChart')];
	});
};


/**
 * Dark theme for Highcharts JS
 * @author Torstein Honsi
 */

// Load the fonts
Highcharts.createElement('link', {
   href: 'http://fonts.googleapis.com/css?family=Unica+One',
   rel: 'stylesheet',
   type: 'text/css'
}, null, document.getElementsByTagName('head')[0]);

Highcharts.theme = {
   colors: ["#2b908f", "#90ee7e", "#f45b5b", "#7798BF", "#aaeeee", "#ff0066", "#eeaaee",
      "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
   chart: {
      backgroundColor: {
         linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
         stops: [
            [0, '#2a2a2b'],
            [1, '#3e3e40']
         ]
      },
      style: {
         fontFamily: "'Unica One', sans-serif"
      },
      plotBorderColor: '#606063'
   },
   title: {
      style: {
         color: '#E0E0E3',
         textTransform: 'uppercase',
         fontSize: '20px'
      }
   },
   subtitle: {
      style: {
         color: '#E0E0E3',
         textTransform: 'uppercase'
      }
   },
   xAxis: {
      gridLineColor: '#707073',
      labels: {
         style: {
            color: '#E0E0E3'
         }
      },
      lineColor: '#707073',
      minorGridLineColor: '#505053',
      tickColor: '#707073',
      title: {
         style: {
            color: '#A0A0A3'

         }
      }
   },
   yAxis: {
      gridLineColor: '#707073',
      labels: {
         style: {
            color: '#E0E0E3'
         }
      },
      lineColor: '#707073',
      minorGridLineColor: '#505053',
      tickColor: '#707073',
      tickWidth: 1,
      title: {
         style: {
            color: '#A0A0A3'
         }
      }
   },
   tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      style: {
         color: '#F0F0F0'
      }
   },
   plotOptions: {
      series: {
         dataLabels: {
            color: '#B0B0B3'
         },
         marker: {
            lineColor: '#333'
         }
      },
      boxplot: {
         fillColor: '#505053'
      },
      candlestick: {
         lineColor: 'white'
      },
      errorbar: {
         color: 'white'
      }
   },
   legend: {
      itemStyle: {
         color: '#E0E0E3'
      },
      itemHoverStyle: {
         color: '#FFF'
      },
      itemHiddenStyle: {
         color: '#606063'
      }
   },
   credits: {
      style: {
         color: '#666'
      }
   },
   labels: {
      style: {
         color: '#707073'
      }
   },

   drilldown: {
      activeAxisLabelStyle: {
         color: '#F0F0F3'
      },
      activeDataLabelStyle: {
         color: '#F0F0F3'
      }
   },

   navigation: {
      buttonOptions: {
         symbolStroke: '#DDDDDD',
         theme: {
            fill: '#505053'
         }
      }
   },

   // scroll charts
   rangeSelector: {
      buttonTheme: {
         fill: '#505053',
         stroke: '#000000',
         style: {
            color: '#CCC'
         },
         states: {
            hover: {
               fill: '#707073',
               stroke: '#000000',
               style: {
                  color: 'white'
               }
            },
            select: {
               fill: '#000003',
               stroke: '#000000',
               style: {
                  color: 'white'
               }
            }
         }
      },
      inputBoxBorderColor: '#505053',
      inputStyle: {
         backgroundColor: '#333',
         color: 'silver'
      },
      labelStyle: {
         color: 'silver'
      }
   },

   navigator: {
      handles: {
         backgroundColor: '#666',
         borderColor: '#AAA'
      },
      outlineColor: '#CCC',
      maskFill: 'rgba(255,255,255,0.1)',
      series: {
         color: '#7798BF',
         lineColor: '#A6C7ED'
      },
      xAxis: {
         gridLineColor: '#505053'
      }
   },

   scrollbar: {
      barBackgroundColor: '#808083',
      barBorderColor: '#808083',
      buttonArrowColor: '#CCC',
      buttonBackgroundColor: '#606063',
      buttonBorderColor: '#606063',
      rifleColor: '#FFF',
      trackBackgroundColor: '#404043',
      trackBorderColor: '#404043'
   },

   // special colors for some of the
   legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
   background2: '#505053',
   dataLabelsColor: '#B0B0B3',
   textColor: '#C0C0C0',
   contrastTextColor: '#F0F0F3',
   maskColor: 'rgba(255,255,255,0.3)'
};

// Apply the theme
Highcharts.setOptions(Highcharts.theme);

