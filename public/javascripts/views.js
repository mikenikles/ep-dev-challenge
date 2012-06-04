// --------------------
// V I E W S
// --------------------

// An event aggregator that every view has access to
Backbone.View.prototype.eventAggregator = _.extend({}, Backbone.Events);

Vannik.Views.Notification = Backbone.View.extend({
	el: $('#notification'),
	
	template: _.template($('#notification-tpl').text()),
	
	initialize : function() {
		_.bindAll(this, "renderSuccess", "renderWarning", "renderNotification", "scrollToNotification");
	},
	
	scrollToNotification : function() {
		$('html, body').animate({
			scrollTop: 0
		}, 1000);
	},

	renderSuccess : function(title, msg) {
		this.renderNotification('alert-success', title, msg)
        return this;
	},

	renderWarning : function(title, msg) {
		this.renderNotification('alert-error', title, msg)
		return this;
	},
	
	renderNotification : function(className, title, msg) {
		$(this.el).html(this.template({className: className, title: title, msg: msg}));
		$(this.el).fadeIn('slow');
		//scrollToTopLeft(); // TODO [Mike Nikles]: Implement
	}
});

Vannik.Views.Statistics = Backbone.View.extend({
	el: $('#statistics'),
	
	template: _.template($('#statistics-tpl').text()),
	
	initialize : function() {
		_.bindAll(this, "render");
		this.model.bind('change', this.render);
	},
	
	render : function() {
		$(this.el).html(this.template(this.model.toJSON()));
	}
});

Vannik.Views.Cell = Backbone.View.extend({
	
    events: {
        "click":      "jumpTo"
    },

	initialize : function() {
		_.bindAll(this, "render", "onModelChange", "jumpTo");
		this.model.bind('change', this.onModelChange);
	},
	
	attributes : function () {
	    return {
	    	class : 'span1 cell',
	    	'data-original-title' : 'x: '+ this.model.get('x') +'; y: '+ this.model.get('y')//,
	    };
	},
	
	jumpTo : function() {
		// According to the requirements, this is only valid for previously visited cells
		if (this.model.get('previouslyVisited') == true) {
			this.model.jumpTo();
		} else {
			console.log('Attempted to jump to an unvisited cell at x: ' + this.model.get('x') + '; y:' + this.model.get('y'));
		}
	},
	
	setBorders : function() {
		var self = this;
		_.each(this.model.directions, function(direction) {
			if('BLOCKED' == self.model.get(direction)) {
				$(self.el).removeClass(direction).addClass(direction);
			}
		});
	},
	
	updateCellColor : function() {
		if(this.model.isFork()) {
			$(this.el).addClass('intersection');
		} else if(this.model.isDeadEnd()) {
			$(this.el).addClass('deadEnd');
		} else {
			$(this.el).addClass('visited');
		}
	},
	
	onModelChange : function() {
		this.setBorders();
		this.updateCellColor();
	},
	
	render : function() {
		$(this.el).html('&nbsp;'); // Making sure it shows up
		return this;
	}
});

Vannik.Views.Maze = Backbone.View.extend({
	el: $('#maze'),
	
	maxRows: 50,
	maxColumns: 50,

	startMazeView: {},
	notificationView: {},
	statistics: {},
	
	forks: [],
	
	isAutopilot: false,
	isStopAtDeadEnd: false,
	
	initialize : function() {
		_.bindAll(this, "serverResponseReceived", "proceedToNextCell");
		this.startMazeView = this.options.startMazeView;
		this.notificationView = this.options.notificationView;
		this.statistics = this.options.statistics;
		
		// Bind to events
		this.eventAggregator.on('all', this.handleEvent, this);
		
    	// Initialize the cell cache
		Vannik.Cells = new Array(this.maxRows);
		for(i = 0; i < Vannik.Cells.length; i++) {
			Vannik.Cells[i] = new Array(this.maxColumns);
		}
	},
	
	toggleAutopilot : function() {
		this.isAutopilot = !this.isAutopilot;
	},
	
	toggleStopAtDeadEnd : function() {
		this.isStopAtDeadEnd = !this.isStopAtDeadEnd;
	},
	
	handleEvent : function(eventName) {
		switch(eventName) {
		case 'move-north':
			this.move('NORTH');
			break;
		case 'move-east':
			this.move('EAST');
			break;
		case 'move-south':
			this.move('SOUTH');
			break;
		case 'move-west':
			this.move('WEST');
			break;
		case 'start-maze':
			this.cleanup();
			this.start();
			break;
		}
	},
	
	move : function(direction) {
		console.log('Moving ' + direction);
		socket.send(JSON.stringify(
				{ type: 'move', direction: direction }
		));
	},
	
	serverResponseReceived : function(event) {
		var data = JSON.parse(event.data)
		//console.log('Server response: ' + JSON.stringify(data));
		
		if(data.error) {
        	if('init' == data.type) {
        		this.notificationView.renderWarning('Error!', data.error);
                socket.close();
        	}
        	this.notificationView.renderWarning('Warning!', data.error);
		} else {
			if('init' == data.type) {
            	$('#mazeGUID').text(data.ep.currentCell.mazeGuid);
            }
			var currentX = data.ep.currentCell.x;
			var currentY = data.ep.currentCell.y;
			this.statistics.set('totalMoves', this.statistics.get('totalMoves')+1);
			
			// Batch update the current cell's information
			Vannik.Cells[currentX][currentY].set(data.ep.currentCell);
			// This cell is being visited right now, let's reflect that in the model
			Vannik.Cells[currentX][currentY].set({previouslyVisited: true}, {silent: true});
			
			if(Vannik.Cells[currentX][currentY].isFork()) {
				// Keep this model so the autopilot can get back to it when it reaches a dead end
				this.forks.push(Vannik.Cells[currentX][currentY]);
				this.statistics.set('totalForks', this.statistics.get('totalForks')+1);
			}
			
			if(this.isAutopilot) {
				if(Vannik.Cells[currentX][currentY].get('atEnd')) {
					console.log('Done');
					socket.close();
					this.notificationView.renderSuccess('Done!', Vannik.Cells[currentX][currentY].get('note'));
					this.startMazeView.finished();
				} else {
					this.proceedToNextCell(currentX, currentY);
				}
			}
		}
	},
	
	proceedToNextCell : function(x, y) {
		var nextDirection = Vannik.Cells[x][y].getNextPossibleDirection();
		if('' == nextDirection) {
			this.statistics.set('totalDeadEnds', this.statistics.get('totalDeadEnds')+1);
			
			if(this.isStopAtDeadEnd) {
				this.notificationView.renderWarning('Dead end!', 'Oops... You reached a dead end at x: ' + Vannik.Cells[x][y].get('x') + '; y: ' + Vannik.Cells[x][y].get('y'));
				return;
			}
			// Dead end. Jump to a previously visited fork and continue
			var forkCell = this.forks.pop();
			forkCell.jumpTo();
		} else {
			this.eventAggregator.trigger('move-' + nextDirection);
		}
	},
	
	start : function() {
		console.log('Starting to solve the maze');

		// Initialize WebSocket connection to the server
    	var WS = window['MozWebSocket'] ? MozWebSocket : WebSocket
		//socket = new WS("ws://localhost:9000/maze") // @routes.EpDevChallenge.maze().webSocketURL(request)
    	socket = new WS("ws://69.194.139.145:9000/maze") // @routes.EpDevChallenge.maze().webSocketURL(request)
    	socket.onmessage = this.serverResponseReceived;
	},
	
	cleanup : function() {
		// TODO [Mike Nikles]: Ugly stuff right here...
		$('.cell').removeClass().addClass('cell span1');
	},
	
	drawMaze : function() {
		// Draw the maze
		for(row=0; row < this.maxRows; row++) {
			$(this.el).append('<div class="row" id="row' + row + '">');
			
			for(column=0; column < this.maxColumns; column++) {
				// Create and render cell view
				var cell = new Vannik.Models.Cell({x: column, y: row});
				Vannik.Cells[column][row] = cell; // Cache it
				
				// Append rendered cell to the current row
				var cellView = new Vannik.Views.Cell({model: cell});
				$('#row' + row).append(cellView.render().el);
			}
		}
		console.log('Maze rendered. Size: ' + this.maxRows + 'x' + this.maxColumns);

		// Bootstrap tooltip
		$(this.el).tooltip({
			selector: '.cell'
		});
	},
	
	render : function() {
		this.drawMaze();
		return this;
	}
});

Vannik.Views.StartMazeButton = Backbone.View.extend({
	el: $('#startMaze'),
	
    events: {
        "click":      "start"
    },

    initialize : function() {
        _.bindAll(this, "start", "render");
    },
    
    start : function() {
    	$(this.el).button('loading');
    	this.eventAggregator.trigger('start-maze');
    },
    
    finished : function() {
    	$(this.el).button('reset');
    },

    render : function() {
    	return this;
    }
});