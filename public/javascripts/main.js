var Vannik = {
	Models: {},
	Collections: {},
	Views: {},
	Util: {}
};

var socket;


$(function() {
	// Twitter stuff initialization
	$(".collapse").collapse();
	$('.btn').button();

	
	// Notifications
	var notificationView = new Vannik.Views.Notification();

	// Statistics
	var statisticsModel = new Vannik.Models.Statistics();
	var statisticsView = new Vannik.Views.Statistics({
		model: statisticsModel
	});
	statisticsView.render();
	
	// Start button
	var startButton = new Vannik.Views.StartMazeButton();
	startButton.render();
	
	// The maze
	var mazeView = new Vannik.Views.Maze({
		startMazeView: startButton,
		notificationView: notificationView,
		statistics: statisticsModel
	});
	mazeView.render();
	
	Vannik.Util.handleKeyboard(mazeView);
	
	// Enable auto pilot
	$('#mazeAutopilot').on("change", function() {
		mazeView.toggleAutopilot();
	});
	// Stop at dead ends, yes/no
	$('#mazeStopAtDeadEnds').on("change", function() {
		mazeView.toggleStopAtDeadEnd();
	});
});
