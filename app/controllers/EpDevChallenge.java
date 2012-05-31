package controllers;

import models.Maze;

import org.codehaus.jackson.JsonNode;

import play.Routes;
import play.mvc.Controller;
import play.mvc.Result;
import play.mvc.WebSocket;

public class EpDevChallenge extends Controller {

    /**
     * Display the home page.
     */
    public static Result index() {
    	return ok(views.html.index.render());
    }

    /**
     * Handle the maze websocket.
     */
    public static WebSocket<JsonNode> maze() {
        return new WebSocket<JsonNode>() {
            
            // Called when the Websocket Handshake is done.
            public void onReady(WebSocket.In<JsonNode> in, WebSocket.Out<JsonNode> out){
                
                // Init the maze.
                try { 
                    Maze.init(in, out);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        };
    }

    /**
     * JavaScript routing.
     */
    public static Result javascriptRoutes() {
        response().setContentType("text/javascript");
        return ok(
            Routes.javascriptRouter("jsRoutes",
                controllers.routes.javascript.EpDevChallenge.maze() 
            )
        );
    }
}
