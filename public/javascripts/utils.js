// --------------------
// U T I L S
// --------------------
Vannik.Util.handleKeyboard = function(maze) {
	var bindKeyEvents = function(maze) {
		$(document).keyup(function(e) {
			e.preventDefault();
			
			// Hide previous notifications
			$(maze.notificationView.$el).hide();

			var direction = '';
    		if(e.which == 37) {  // Left arrow key code
    			direction = 'west';
	        }
	        else if(e.which == 38) {  // Up arrow key code
	        	direction = 'north';
	        }
	        else if(e.which == 39) {  // Right arrow key code
	        	direction = 'east';
	        }
	        else if(e.which == 40) {  // Down arrow key code
	        	direction = 'south';
	        }
    		maze.eventAggregator.trigger('move-' + direction);
	    });
	}
	bindKeyEvents(maze);
}
