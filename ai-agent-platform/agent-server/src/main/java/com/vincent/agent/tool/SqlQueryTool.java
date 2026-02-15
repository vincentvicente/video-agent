package com.vincent.agent.tool;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class SqlQueryTool {

    private final JdbcTemplate jdbcTemplate;

    @Tool(description = "Execute a read-only SQL query against the database and return the results. Only SELECT statements are allowed.")
    public String executeSql(
            @ToolParam(description = "The SQL SELECT query to execute") String sql) {
        try {
            String trimmed = sql.trim().toUpperCase();
            if (!trimmed.startsWith("SELECT")) {
                return "Error: Only SELECT queries are allowed for safety.";
            }
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql);
            if (results.isEmpty()) {
                return "No results found.";
            }
            StringBuilder sb = new StringBuilder();
            sb.append("Columns: ").append(results.get(0).keySet()).append("\n");
            for (Map<String, Object> row : results) {
                sb.append(row.values()).append("\n");
            }
            sb.append("Total rows: ").append(results.size());
            return sb.toString();
        } catch (Exception e) {
            return "SQL Error: " + e.getMessage();
        }
    }
}
