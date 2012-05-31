//$(function() {
//	// Build maze
//	var maxRow = 50;
//	var maxColumn = 50;
//	for(row=0; row < maxRow; row++) {
//		$('#maze').append('<div class="row" id="row' + row + '">');
//		
//		for(column=0; column < maxColumn; column++) {
//			var id = column + '/' + row;
//			$('#row' + row).append('<div class="cell span1" id="' + id + '" data-x="'+column+'" data-y="'+row+'">&nbsp;</div>');
//		}
//	}
//	
//	// Each cell can be clicked
//	$(".cell").on("click", function() {
//		console.log("x:" + $(this).data('x'));
//	});
//	
//	
//	// Initialize WebSocket connection to the server
//    var WS = window['MozWebSocket'] ? MozWebSocket : WebSocket
//	var chatSocket = new WS("@routes.Application.chat(username).webSocketURL(request)")
//
//});