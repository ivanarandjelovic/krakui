var KrakUIApp = angular.module('KrakUIApp', []);

KrakUIApp.controller('KrakUIController', [ '$scope', function($scope) {
	$scope.greeting = 'Hola!';
	$scope.activeTicker = "select ticker";
	$scope.tickers = ["123","abc","xxx"];
	$scope.setActiveTicker = function(newActiveTicker) {
		console.debug("Setting active ticker to : " + newActiveTicker)
		$scope.activeTicker = newActiveTicker;
	};
} ]);