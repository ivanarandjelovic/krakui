var KrakUIApp = angular.module('KrakUIApp', []);

var DEFAULT_ASSET_PAIR = 'XXBTZEUR';
var TICKER_UPDATE_INTERVAL_IN_MS = 5000;
var OHLC_UPDATE_INTERVAL_IN_MS = 10000;
var graphPointCount = 60;
var graphPointInterval = 1;
var orderBookCount = 1000;
// Number of points on liner order graph
var ordLinPointCount = 500.0;
var ordersData = null;

var graphIntervals = [ {
	name : "hour",
	interval : 1,
	count : 60
}, {
	name : "3h",
	interval : 1,
	count : 180
}, {
	name : "8h",
	interval : 5,
	count : 96
}, {
	name : "24h",
	interval : 15,
	count : 96
}, {
	name : "1 week",
	interval : 240,
	count : 42
}, {
	name : "1 month",
	interval : 1440,
	count : 31
}, {
	name : "1 year",
	interval : 1440,
	count : 366
} ];

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
							$scope.graphIntervals = graphIntervals;
							$scope.selectedGraphInterval = 0;
							$scope.orderDataTime = null;
							
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
													"pair" : $scope.activeAssetPair,
													"since" : $scope.last,
													"interval" : graphPointInterval
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
																// console.log("KrakUIApp.chartOHLC"+KrakUIApp.chartOHLC);
																for (j = 0; j < KrakUIApp.chartOHLC.series.length; j++) {
																	KrakUIApp.chartOHLC.series[j].data[KrakUIApp.chartOHLC.series[j].data.length - 1]
																			.remove(false);
																}
															}
															
															// Add new points and shift others, redraw only at
															// the last loop
															KrakUIApp.chartOHLC.series[0].addPoint({
																x : item[0] * 1000,
																y : parseFloat(item[2])
															}, false, !firstUpdate, true);
															
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
										"pair" : $scope.activeAssetPair,
										"interval" : graphPointInterval
									}, function(error, data) {
										var OHLCdata = null;
										if (error) {
											console.log(error);
											// We have to re-schedule this for later:
											console.log("got OHLC data error, will repeat later");
											$interval(initOHLC, 1000, 1, false);
										} else {
											console.log("got OHLC data (probably too much to log)");
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
							};
							
							// get all the orders for current asset pair
							var getOrders = function() {
								window.KrakUI.kraken.api('Depth', {
									"pair" : $scope.activeAssetPair,
									"count" : orderBookCount
								}, function(error, data) {
									orderData = null;
									if (error) {
										console.log(error);
										// We have to re-schedule this for later:
										console.log("got order data error, will repeat later");
										$interval(getOrders, 1000, 1, false);
									} else {
										console
												.log("got getOrders data (probably too much to log)");
										orderData = data.result[$scope.activeAssetPair];
										$scope.orderDataTime = new Date();
									}
									recalcOrders(orderData);
									drawOrders($scope.activeAssetPair, orderData);
									drawOrdersLin($scope.activeAssetPair);
								});
							}

							// Set chosen asset pair
							$scope.setActiveAssetPair = function(newActiveAssetPair) {
								console.debug("Setting active asset pair to : "
										+ newActiveAssetPair)
								$scope.activeAssetPair = newActiveAssetPair;
								// Initiate ticker update and other updates:
								tickerUpdate();
								initOHLC();
								$interval(getOrders,1500,1,false);
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
							
							$scope.changeGraph = function() {
								graphPointCount = graphIntervals[$scope.selectedGraphInterval].count;
								graphPointInterval = graphIntervals[$scope.selectedGraphInterval].interval;
								initOHLC();
							};
							
						} ]);

// calculate data needed for order graph
var recalcOrders = function(orderData) {
	
	var asks = orderData.asks;
	var bids  = orderData.bids;

	var now = ((new Date()).getTime())/1000;
	var min1ago= now - 60;
	var min15ago = now - 15*60;

	var minPrice = null, maxPrice = null, i;
	
	for(i = 0; i< asks.length; i++) {
		if(!minPrice) {
			minPrice = Number(asks[i][0]);
		}
		if(!maxPrice) {
			maxPrice = Number(asks[i][0]);
		}
		if(minPrice>Number(asks[i][0])) {
			minPrice = Number(asks[i][0]);
		}
		if(maxPrice<Number(asks[i][0])) {
			maxPrice = Number(asks[i][0]);
		}
	}

	for(i = 0; i< bids.length; i++) {
		if(!minPrice) {
			minPrice = Number(bids[i][0]);
		}
		if(!maxPrice) {
			maxPrice = Number(bids[i][0]);
		}
		if(minPrice>Number(bids[i][0])) {
			minPrice = Number(bids[i][0]);
		}
		if(maxPrice<Number(bids[i][0])) {
			maxPrice = Number(bids[i][0]);
		}
	}
	
	if(minPrice && maxPrice) {
		// We have our range here:
		var range = maxPrice - minPrice;
		var step = range / ordLinPointCount; //We want 1000 graph points (easy to calculate the "bucket")
		KrakUIApp.ordSell1Lin = [];
		KrakUIApp.ordSell2Lin = [];
		KrakUIApp.ordSell3Lin = [];
		KrakUIApp.ordBid1Lin = [];
		KrakUIApp.ordBid2Lin = [];
		KrakUIApp.ordBid3Lin = [];
		var index = minPrice, i;
		for(i = 0; i <= ordLinPointCount; i++) {
/*			KrakUIApp.ordSell1Lin[index] = 0.0;
			KrakUIApp.ordSell2Lin[index] = 0.0;
			KrakUIApp.ordSell3Lin[index] = 0.0;
			KrakUIApp.ordBuy1Lin[index] = 0.0;
			KrakUIApp.ordBuy2Lin[index] = 0.0;
			KrakUIApp.ordBuy3Lin[index] = 0.0;
*/		
			KrakUIApp.ordSell1Lin[i] = {x:index,y:0.0};
			KrakUIApp.ordSell2Lin[i] = {x:index,y:0.0};
			KrakUIApp.ordSell3Lin[i] = {x:index,y:0.0};
			KrakUIApp.ordBid1Lin[i] = {x:index,y:0.0};
			KrakUIApp.ordBid2Lin[i] = {x:index,y:0.0};
			KrakUIApp.ordBid3Lin[i] = {x:index,y:0.0};
			index += step;
		} 
		
		for(i = 0; i< asks.length; i++) {
			item = asks[i];
			index = Math.ceil((item[0] - minPrice)/step);
			if(index<0) {
				index = 0;
			} else if (index>ordLinPointCount) {
				index = ordLinPointCount;
			}
			if(item[2] > min1ago) {
				KrakUIApp.ordSell1Lin[index].y += Number(item[1]);
			} else if(item[2] > min15ago) {
				KrakUIApp.ordSell2Lin[index].y += Number(item[1]);
			} else {
				KrakUIApp.ordSell3Lin[index].y += Number(item[1]);
			}
		}
		for(i = 0; i< bids.length; i++) {
			item = bids[i];
			index = Math.ceil((item[0] - minPrice)/step);
			if(index<0) {
				index = 0;
			} else if (index>ordLinPointCount) {
				index = ordLinPointCount;
			}
			if(item[2] > min1ago) {
				KrakUIApp.ordBid1Lin[index].y += Number(item[1]);
			} else if(item[2] > min15ago) {
				KrakUIApp.ordBid2Lin[index].y += Number(item[1]);
			} else {
				KrakUIApp.ordBid3Lin[index].y += Number(item[1]);
			}
		}
		
	}
	
	//Clear data
	KrakUIApp.orderBid1 = [], KrakUIApp.orderBid2 = [], KrakUIApp.orderBid3 = [], KrakUIApp.orderSell1 = [], KrakUIApp.orderSell2 = [], KrakUIApp.orderSell3 = [];
	
	var sum1=0.0, sum2=0.0, sum3 = 0.0;
	
	for(i = 0; i< asks.length; i++) {
		if(asks[i][2] > min1ago) {
			sum1+=Number(asks[i][1]);
		} else if(asks[i][2] > min15ago) {
			sum2+=Number(asks[i][1]);
		} else {
			sum3+=Number(asks[i][1]);
		}
		KrakUIApp.orderSell1.push({x:Number(asks[i][0]),y:sum1});
		KrakUIApp.orderSell2.push({x:Number(asks[i][0]),y:sum2});
		KrakUIApp.orderSell3.push({x:Number(asks[i][0]),y:sum3});
	}
	
	sum1=0.0, sum2=0.0, sum3 = 0.0;
	for(i = 0; i< bids.length; i++) {
		if(bids[i][2] > min1ago) {
			sum1+=Number(bids[i][1]);
		} else if(bids[i][2] > min15ago) {
			sum2+=Number(bids[i][1]);
		} else {
			sum3+=Number(bids[i][1]);
		}
		KrakUIApp.orderBid1.push({x:Number(bids[i][0]),y:sum1});
		KrakUIApp.orderBid2.push({x:Number(bids[i][0]),y:sum2});
		KrakUIApp.orderBid3.push({x:Number(bids[i][0]),y:sum3});
	}
	
	// Sort the arrays now:
	var sortFuncAsc = function(a,b){
		return (a.x-b.x);
	};
	
	KrakUIApp.orderSell1.sort(sortFuncAsc);
	KrakUIApp.orderSell2.sort(sortFuncAsc);
	KrakUIApp.orderSell3.sort(sortFuncAsc);
	KrakUIApp.orderBid1.sort(sortFuncAsc);
	KrakUIApp.orderBid2.sort(sortFuncAsc);
	KrakUIApp.orderBid3.sort(sortFuncAsc);
}

// Chart drawing section:
var drawOrdersLin = function(activePairName) {
	if (KrakUIApp.chartOrdersLin) {
		KrakUIApp.chartOrdersLin.destroy();
		KrakUIApp.chartOrdersLin = null;
	}
	
	$(function() {
		var $chartCont = $('#chartOrdersLin').highcharts({
			chart : {
				type : 'column',
				zoomType : 'x'
			},
			title : {
				text : 'Orders',
				x : -20
			// center
			},
			subtitle : {
				text : 'Asset pair: ' + activePairName,
				x : -20
			},
			xAxis : {
				
				tickPixelInterval : 100
			// ,
			// categories: times
			},
			yAxis : {
				title : {
					text : 'Amount'
				}
			},
			tooltip : {
				valueSuffix : ' Pieces'
			},
			legend : {
				layout : 'vertical',
				align : 'right',
				verticalAlign : 'middle',
				borderWidth : 0
			},
			 plotOptions: {
		         column: {
		             stacking: 'normal',
//		             lineColor: '#666666',
		             lineWidth: 1,
		             borderWidth : 0,
		             pointPadding: 0,
		             groupPadding: 0
	         }
	     },
	     series : [  {
				name : 'Bid <1 min',
				data : KrakUIApp.ordBid1Lin,
				color : "#00ff00",
				turboThreshold: 0
			}, {
				name : 'Bid 1-15 min',
				data : KrakUIApp.ordBid2Lin,
				color : "#008800",
				turboThreshold: 0
			}, {
				name : 'Bid >15 min',
				data : KrakUIApp.ordBid3Lin,
				color : "#005500",
				turboThreshold: 0
			},
			 {
				name : 'Sell <1 min',
				data : KrakUIApp.ordSell1Lin,
				color : "yellow",
				turboThreshold: 0
			}, {
				name : 'Sell 1-15 min',
				data : KrakUIApp.ordSell2Lin,
				color : "#ff0000",
				turboThreshold: 0
			}, {
				name : 'Sell >15 min',
				data : KrakUIApp.ordSell3Lin,
				color : "#660000",
				turboThreshold: 0
			} ]
		});
		KrakUIApp.chartOrdersLin = $("#chartOrdersLin").highcharts();
	});
}

var drawOrders = function(activePairName, orderData) {
	if (KrakUIApp.chartOrders) {
		KrakUIApp.chartOrders.destroy();
		KrakUIApp.chartOrders = null;
	}
	
	$(function() {
		var $chartCont = $('#chartOrders').highcharts({
			chart : {
				type : 'area',
				zoomType : 'x'
			},
			title : {
				text : 'Orders',
				x : -20
			// center
			},
			subtitle : {
				text : 'Asset pair: ' + activePairName,
				x : -20
			},
			xAxis : {
				
				tickPixelInterval : 100
			// ,
			// categories: times
			},
			yAxis : {
				title : {
					text : 'Amount'
				},
				plotLines : [ {
					value : 0,
					width : 1,
					color : '#808080'
				} ]
			},
			tooltip : {
				valueSuffix : ' Pieces'
			},
			legend : {
				layout : 'vertical',
				align : 'right',
				verticalAlign : 'middle',
				borderWidth : 0
			},
			 plotOptions: {
		         area: {
		             stacking: 'normal',
		             lineColor: '#666666',
		             lineWidth: 1,
		             marker: {
		                 lineWidth: 1,
		                 lineColor: '#666666'
		             }
	         }
	     },
	     series : [  {
				name : 'Bid <1 min',
				data : KrakUIApp.orderBid1,
				color : "#00ff00"
			}, {
				name : 'Bid 1-15 min',
				data : KrakUIApp.orderBid2,
				color : "#00aa00"
			}, {
				name : 'Bid >15 min',
				data : KrakUIApp.orderBid3,
				color : "#006600"
			},
			 {
				name : 'Sell <1 min',
				data : KrakUIApp.orderSell1,
				color : "#ff0000"
			}, {
				name : 'Sell 1-15 min',
				data : KrakUIApp.orderSell2,
				color : "#aa0000"
			}, {
				name : 'Sell >15 min',
				data : KrakUIApp.orderSell3,
				color : "#660000"
			} ]
		});
		KrakUIApp.chartOrders = $("#chartOrders").highcharts();
	});
}

var drawOHLC = function(activePairName, OHLCdata) {
	
	var highs = [];
	var lows = [];
	var volume = [];
	var i = 0;
	var item = null;
	
	// for(i = 0; i<OHLCdata.length;i++) {
	for (i = Math.max(0, OHLCdata.length - graphPointCount); i < OHLCdata.length; i++) {
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
	
	if (KrakUIApp.chartOHLC) {
		KrakUIApp.chartOHLC.destroy();
		KrakUIApp.chartOHLC = null;
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
				tickPixelInterval : 100
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
		KrakUIApp.chartOHLC = $("#chartOHLC").highcharts();
	});
};

/**
 * Dark theme for Highcharts JS
 * 
 * @author Torstein Honsi
 */

// Load the fonts
Highcharts.createElement('link', {
	href : 'http://fonts.googleapis.com/css?family=Unica+One',
	rel : 'stylesheet',
	type : 'text/css'
}, null, document.getElementsByTagName('head')[0]);

Highcharts.theme = {
	colors : [ "#2b908f", "#90ee7e", "#f45b5b", "#7798BF", "#aaeeee", "#ff0066",
			"#eeaaee", "#55BF3B", "#DF5353", "#7798BF", "#aaeeee" ],
	chart : {
		backgroundColor : {
			linearGradient : {
				x1 : 0,
				y1 : 0,
				x2 : 1,
				y2 : 1
			},
			stops : [ [ 0, '#2a2a2b' ], [ 1, '#3e3e40' ] ]
		},
		style : {
			fontFamily : "'Unica One', sans-serif"
		},
		plotBorderColor : '#606063'
	},
	title : {
		style : {
			color : '#E0E0E3',
			textTransform : 'uppercase',
			fontSize : '20px'
		}
	},
	subtitle : {
		style : {
			color : '#E0E0E3',
			textTransform : 'uppercase'
		}
	},
	xAxis : {
		gridLineColor : '#707073',
		labels : {
			style : {
				color : '#E0E0E3'
			}
		},
		lineColor : '#707073',
		minorGridLineColor : '#505053',
		tickColor : '#707073',
		title : {
			style : {
				color : '#A0A0A3'
			
			}
		}
	},
	yAxis : {
		gridLineColor : '#707073',
		labels : {
			style : {
				color : '#E0E0E3'
			}
		},
		lineColor : '#707073',
		minorGridLineColor : '#505053',
		tickColor : '#707073',
		tickWidth : 1,
		title : {
			style : {
				color : '#A0A0A3'
			}
		}
	},
	tooltip : {
		backgroundColor : 'rgba(0, 0, 0, 0.85)',
		style : {
			color : '#F0F0F0'
		}
	},
	plotOptions : {
		series : {
			dataLabels : {
				color : '#B0B0B3'
			},
			marker : {
				lineColor : '#333'
			}
		},
		boxplot : {
			fillColor : '#505053'
		},
		candlestick : {
			lineColor : 'white'
		},
		errorbar : {
			color : 'white'
		}
	},
	legend : {
		itemStyle : {
			color : '#E0E0E3'
		},
		itemHoverStyle : {
			color : '#FFF'
		},
		itemHiddenStyle : {
			color : '#606063'
		}
	},
	credits : {
		style : {
			color : '#666'
		}
	},
	labels : {
		style : {
			color : '#707073'
		}
	},
	
	drilldown : {
		activeAxisLabelStyle : {
			color : '#F0F0F3'
		},
		activeDataLabelStyle : {
			color : '#F0F0F3'
		}
	},
	
	navigation : {
		buttonOptions : {
			symbolStroke : '#DDDDDD',
			theme : {
				fill : '#505053'
			}
		}
	},
	
	// scroll charts
	rangeSelector : {
		buttonTheme : {
			fill : '#505053',
			stroke : '#000000',
			style : {
				color : '#CCC'
			},
			states : {
				hover : {
					fill : '#707073',
					stroke : '#000000',
					style : {
						color : 'white'
					}
				},
				select : {
					fill : '#000003',
					stroke : '#000000',
					style : {
						color : 'white'
					}
				}
			}
		},
		inputBoxBorderColor : '#505053',
		inputStyle : {
			backgroundColor : '#333',
			color : 'silver'
		},
		labelStyle : {
			color : 'silver'
		}
	},
	
	navigator : {
		handles : {
			backgroundColor : '#666',
			borderColor : '#AAA'
		},
		outlineColor : '#CCC',
		maskFill : 'rgba(255,255,255,0.1)',
		series : {
			color : '#7798BF',
			lineColor : '#A6C7ED'
		},
		xAxis : {
			gridLineColor : '#505053'
		}
	},
	
	scrollbar : {
		barBackgroundColor : '#808083',
		barBorderColor : '#808083',
		buttonArrowColor : '#CCC',
		buttonBackgroundColor : '#606063',
		buttonBorderColor : '#606063',
		rifleColor : '#FFF',
		trackBackgroundColor : '#404043',
		trackBorderColor : '#404043'
	},
	
	// special colors for some of the
	legendBackgroundColor : 'rgba(0, 0, 0, 0.5)',
	background2 : '#505053',
	dataLabelsColor : '#B0B0B3',
	textColor : '#C0C0C0',
	contrastTextColor : '#F0F0F3',
	maskColor : 'rgba(255,255,255,0.3)'
};

// Apply the theme
Highcharts.setOptions(Highcharts.theme);
