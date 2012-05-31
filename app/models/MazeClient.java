package models;

import org.apache.commons.lang.StringUtils;
import org.codehaus.jackson.JsonNode;

import play.Logger;
import play.libs.WS;
import play.libs.WS.Response;
import play.libs.WS.WSRequestHolder;

public class MazeClient {

	public enum Direction {
		NORTH, WEST, EAST, SOUTH
	}

	private static final String EP_MAZE_BASE_URL = "http://www.epdeveloperchallenge.com/api/";
	private static final String EP_MAZE_INIT_URL = EP_MAZE_BASE_URL + "init";
	private static final String EP_MAZE_MOVE_URL = EP_MAZE_BASE_URL + "move";
	private static final String EP_MAZE_JUMP_URL = EP_MAZE_BASE_URL + "jump";

	static String mazeGUID = "";

	public static JsonNode init() throws Exception {
		if (StringUtils.isBlank(mazeGUID)) {
			Logger.info("Initializing EP maze...");

			Response response = WS.url(EP_MAZE_INIT_URL).post("").get();
			if (response.getStatus() == 400) {
				throw new Exception(
						"EP maze not created due to 400 HTTP error code (too many mazes currently in EP server memory).");
			}
			JsonNode responseJson = response.asJson();
			mazeGUID = responseJson.findPath("mazeGuid").getTextValue();

			Logger.info("EP maze successfully initialized. GUID: " + mazeGUID);
			return responseJson;
		} else {
			Logger.error("An EP maze is already initialized, no need to create a new one. Current maze GUID: "
					+ mazeGUID);
			return null;
		}
	}

	public static JsonNode move(Direction direction) throws Exception {
		WSRequestHolder requestHolder = WS.url(EP_MAZE_MOVE_URL);
		requestHolder = requestHolder.setHeader("contentType",
				"application/x-www-form-urlencoded");
		requestHolder = requestHolder.setQueryParameter("mazeGuid", mazeGUID);
		requestHolder = requestHolder.setQueryParameter("direction", direction
				.toString().toUpperCase());
		Response response = requestHolder.post("").get();
		Logger.debug("Response received from EP: " + response.getBody());
		if (response.getStatus() == 400) {
			throw new Exception(
					"Move not permitted due to 400 HTTP error code (attempt to move in a direction that is not allowed due to a wall).");
		}
		return response.asJson();
	}

	public static JsonNode jump(String x, String y) throws Exception {
		WSRequestHolder requestHolder = WS.url(EP_MAZE_JUMP_URL);
		requestHolder = requestHolder.setHeader("contentType",
				"application/x-www-form-urlencoded");
		requestHolder = requestHolder.setQueryParameter("mazeGuid", mazeGUID);
		requestHolder = requestHolder.setQueryParameter("x", x);
		requestHolder = requestHolder.setQueryParameter("y", y);
		Response response = requestHolder.post("").get();
		Logger.debug("Response received from EP: " + response.getBody());
		if (response.getStatus() == 400) {
			throw new Exception(
					"Jump not permitted due to 400 HTTP error code (attempt to jump to a location that you have not previously visited).");
		}
		return response.asJson();
	}
}
