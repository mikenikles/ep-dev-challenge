// --------------------
// M O D E L S
// --------------------
Vannik.Models.Statistics = Backbone.Model.extend({
	defaults : {
		totalMoves: 0,
		totalForks: 0,
		totalDeadEnds: 0
	}
});

Vannik.Models.Cell = Backbone.Model.extend({
	// Tuning: The next possible directions are chosen
	//         the way they're ordered in this array.
	//         The end goal is to reach the South-East
	//         corner of the maze, so let's make sure
	//         we move in that direction at every fork.
	directions : ['east', 'south', 'north', 'west'],
	
	numberOfDirectionsToMove : function() {
		var self = this;
		var directionsCount = 0;
		_.each(this.directions, function(direction) {
			if('UNEXPLORED' == self.get(direction)) {
				directionsCount++;
			}
		});
		return directionsCount;
	},
	
	isFork : function() {
		return this.numberOfDirectionsToMove() > 1;
	},
	
	isDeadEnd : function() {
		return this.numberOfDirectionsToMove() == 0;
	},

	getNextPossibleDirection : function() {
		var self = this;
		var nextDirection = '';
		_.every(this.directions, function(direction) {
			if('UNEXPLORED' == self.get(direction)) {
				nextDirection = direction;
				return false;
			} else {
				return true;
			}
		});
		return nextDirection;
	},
	
	jumpTo : function() {
		// Triggered when we want to jump to this cell from another place.
		// The autopilot uses this to jump to forks.
		console.log('Jumping to x: ' + this.get('x') + '; y: ' + this.get('y'));
		socket.send(JSON.stringify(
			{ type: 'jump', x: this.get('x'), y: this.get('y') }
		));
	}
});
