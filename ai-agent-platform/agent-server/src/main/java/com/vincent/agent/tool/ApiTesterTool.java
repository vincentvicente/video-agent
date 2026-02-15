package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class ApiTesterTool {

    private final RestTemplate restTemplate = new RestTemplate();

    @Tool(description = "Send an HTTP request to test an API endpoint. Returns status code, headers, and response body.")
    public String testApi(
            @ToolParam(description = "HTTP method: GET, POST, PUT, DELETE") String method,
            @ToolParam(description = "The full URL to request") String url,
            @ToolParam(description = "Request body as JSON string (for POST/PUT, empty string for GET/DELETE)") String body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(
                    body != null && !body.isEmpty() ? body : null, headers);

            HttpMethod httpMethod = HttpMethod.valueOf(method.toUpperCase());
            ResponseEntity<String> response = restTemplate.exchange(url, httpMethod, entity, String.class);

            return String.format("Status: %d\nHeaders: %s\nBody: %s",
                    response.getStatusCode().value(),
                    response.getHeaders().toSingleValueMap(),
                    response.getBody());
        } catch (Exception e) {
            return "API Error: " + e.getMessage();
        }
    }
}
