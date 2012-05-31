package models;

import static akka.pattern.Patterns.ask;
import static java.util.concurrent.TimeUnit.SECONDS;

import java.util.HashMap;
import java.util.Map;

import models.MazeClient.Direction;

import org.codehaus.jackson.JsonNode;
import org.codehaus.jackson.node.ObjectNode;

import play.Logger;
import play.libs.Akka;
import play.libs.F.Callback;
import play.libs.F.Callback0;
import play.libs.Json;
import play.mvc.WebSocket;
import akka.actor.ActorRef;
import akka.actor.Props;
import akka.actor.UntypedActor;
import akka.dispatch.Await;
import akka.util.Duration;

/**
 * A chat room is an Actor.
 */
public class Maze extends UntypedActor {
    
    // Default room.
    static ActorRef defaultMaze = Akka.system().actorOf(new Props(Maze.class));
    
    // Current maze guid
//    static String mazeGuid = "";
    
    // Cells of this maze.
    Map<String, WebSocket.Out<JsonNode>> cells = new HashMap<String, WebSocket.Out<JsonNode>>();
    
    /**
     * Initialize the maze.
     */
    public static void init(WebSocket.In<JsonNode> in, final WebSocket.Out<JsonNode> out) throws Exception{
        
        // Send the Join message to the room
    	String result = (String)Await.result(ask(defaultMaze,new Init(out), 5000), Duration.create(1, SECONDS));
        
        if("OK".equals(result)) {
            
            // For each event received on the socket,
            in.onMessage(new Callback<JsonNode>() {
               public void invoke(JsonNode event) {
                   
                   // Send an event to the maze.
            	   String type = event.get("type").asText();
            	   
            	   if ("move".equals(type)) {
            		   String moveDirection = event.get("direction").asText();
            		   JsonNode isAutopilotNode = event.get("isAutopilot");
            		   boolean isAutopilot = false;
            		   if (isAutopilotNode != null) {
            			   isAutopilot = isAutopilotNode.asBoolean();
            		   }
            		   defaultMaze.tell(new MazeMoveEvent(out, moveDirection, isAutopilot));
            	   } else if ("jump".equals(type)) {
            		   String x = event.get("x").asText();
            		   String y = event.get("y").asText();
            		   defaultMaze.tell(new MazeJumpEvent(out, x, y));
            	   } else {
            		   String x = event.get("x").asText();
            		   String y = event.get("y").asText();
            		   defaultMaze.tell(new MazeEvent(out, type, x, y));
            	   }
            	   
               } 
            });
            
            // When the socket is closed.
            in.onClose(new Callback0() {
               public void invoke() {
                   
                   // Send a Quit message to the room.
            	   defaultMaze.tell(new Quit());
                   
               }
            });
        } else {
            // Cannot connect, create a Json error.
            ObjectNode error = Json.newObject();
            error.put("error", result);
            
            // Send the error to the socket.
            out.write(error);
        }
    }
    
    public void onReceive(Object event) throws Exception {
        
    	if(event instanceof Init) {
    		Init init = (Init) event;
    		
    		try {
    			// Initialize the EP maze
    			JsonNode responseJson = MazeClient.init();
    			ObjectNode initResponse = Json.newObject();
    			initResponse.put("ep", responseJson);
    			initResponse.put("type", "init");
    			if (responseJson != null) {
    	            initResponse.put("success", "An EP maze has successfully been created.");
				} else {
					initResponse.put("error", "An EP maze is already initialized, no need to create a new one.");
				}
    			init.channel.write(initResponse);
    			getSender().tell("OK");
    			
    		} catch (Exception exception) {
    			ObjectNode initResponse = Json.newObject();
    			initResponse.put("type", "init");
    			initResponse.put("error", exception.getMessage());
    			init.channel.write(initResponse);
    			
    			getSender().tell("NOK");
    		}
    	} else if(event instanceof MazeMoveEvent) {
    		MazeMoveEvent move = (MazeMoveEvent) event;
    		ObjectNode responseToClient = Json.newObject();
			try {
				JsonNode responseJson = MazeClient.move(Direction.valueOf(move.direction));
				responseToClient.put("ep", responseJson);
				responseToClient.put("isAutopilot", move.isAutopilot);
				
				move.channel.write(responseToClient);
				getSender().tell("OK");
			} catch (Exception exception) {
				responseToClient.put("type", "move");
    			responseToClient.put("error", exception.getMessage());

    			move.channel.write(responseToClient);
				getSender().tell("NOK");
			}
    	} else if(event instanceof MazeJumpEvent) {
    		MazeJumpEvent jump = (MazeJumpEvent) event;
    		JsonNode responseJson = MazeClient.jump(jump.x, jump.y);
    		
    		ObjectNode responseToClient = Json.newObject();
    		responseToClient.put("type", "jump");
    		responseToClient.put("ep", responseJson);
    		
    		jump.channel.write(responseToClient);
    		getSender().tell("OK");
    	} else if(event instanceof MazeEvent) {
    		MazeEvent mazeEvent = (MazeEvent) event;
    		Logger.info(String.format("MazeEvent received with type: %s; x: %s; y: %s", mazeEvent.type, mazeEvent.x, mazeEvent.y));

            ObjectNode eventResponse = Json.newObject();
            eventResponse.put("test", "Hello");

            mazeEvent.channel.write(eventResponse);
    		
        } else if(event instanceof Join) {
            
            // Received a Join message
            Join join = (Join)event;
            
            // Check if this username is free.
            if(cells.containsKey(join.username)) {
                getSender().tell("This username is already used");
            } else {
                cells.put(join.username, join.channel);
                getSender().tell("OK");
            }
            
        } else if(event instanceof Talk)  {
            
            // Received a Talk message
            Talk talk = (Talk)event;
            
            
        } else if(event instanceof Quit)  {
            
            // Received a Quit message
            //Quit quit = (Quit)event;
            getSender().tell("WebSocket connection disconnected.");
        } else {
            unhandled(event);
        }
        
    }
    
    // -- Events
    
    public static class Init {
    	final WebSocket.Out<JsonNode> channel;
    	
    	public Init(WebSocket.Out<JsonNode> channel) {
    		this.channel = channel;
		}
    }

    public static class MazeEvent {
    	final WebSocket.Out<JsonNode> channel;
    	String type;
    	String x;
    	String y;
    	
    	public MazeEvent(WebSocket.Out<JsonNode> channel, String eventType, String x, String y) {
    		this.channel = channel;
    		this.type = eventType;
    		this.x = x;
    		this.y = y;
		}
    }
    
    public static class MazeMoveEvent {
    	final WebSocket.Out<JsonNode> channel;
    	String direction;
    	boolean isAutopilot;
    	
    	public MazeMoveEvent(WebSocket.Out<JsonNode> channel, String direction, boolean isAutopilot) {
    		this.channel = channel;
    		this.direction = direction;
    		this.isAutopilot = isAutopilot;
    	}
    }
    
    public static class MazeJumpEvent {
    	final WebSocket.Out<JsonNode> channel;
    	String x;
    	String y;
    	
    	public MazeJumpEvent(WebSocket.Out<JsonNode> channel, String x, String y) {
    		this.channel = channel;
    		this.x = x;
    		this.y = y;
    	}
    }
    
    public static class Join {
        
        final String username;
        final WebSocket.Out<JsonNode> channel;
        
        public Join(String username, WebSocket.Out<JsonNode> channel) {
            this.username = username;
            this.channel = channel;
        }
        
    }
    
    public static class Talk {
        
        final String username;
        final String text;
        
        public Talk(String username, String text) {
            this.username = username;
            this.text = text;
        }
        
    }
    
    public static class Quit {
    }
    
}
