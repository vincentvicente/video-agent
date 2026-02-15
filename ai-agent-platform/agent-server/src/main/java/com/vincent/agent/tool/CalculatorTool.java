package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
public class CalculatorTool {

    @Tool(description = "Evaluate a mathematical expression and return the result. Supports +, -, *, /, parentheses, and basic operations.")
    public String calculate(
            @ToolParam(description = "The mathematical expression to evaluate, e.g. '2 + 3 * 4'") String expression) {
        try {
            double result = evaluateExpression(expression);
            if (result == Math.floor(result) && !Double.isInfinite(result)) {
                return "Result: " + (long) result;
            }
            return "Result: " + result;
        } catch (Exception e) {
            return "Error evaluating expression: " + e.getMessage();
        }
    }

    private double evaluateExpression(String expr) {
        expr = expr.replaceAll("\\s+", "");
        return parseAddSub(expr, new int[]{0});
    }

    private double parseAddSub(String expr, int[] pos) {
        double result = parseMulDiv(expr, pos);
        while (pos[0] < expr.length()) {
            char op = expr.charAt(pos[0]);
            if (op == '+' || op == '-') {
                pos[0]++;
                double right = parseMulDiv(expr, pos);
                result = op == '+' ? result + right : result - right;
            } else {
                break;
            }
        }
        return result;
    }

    private double parseMulDiv(String expr, int[] pos) {
        double result = parsePower(expr, pos);
        while (pos[0] < expr.length()) {
            char op = expr.charAt(pos[0]);
            if (op == '*' || op == '/') {
                pos[0]++;
                double right = parsePower(expr, pos);
                result = op == '*' ? result * right : result / right;
            } else {
                break;
            }
        }
        return result;
    }

    private double parsePower(String expr, int[] pos) {
        double result = parseUnary(expr, pos);
        if (pos[0] < expr.length() && expr.charAt(pos[0]) == '^') {
            pos[0]++;
            double right = parsePower(expr, pos);
            result = Math.pow(result, right);
        }
        return result;
    }

    private double parseUnary(String expr, int[] pos) {
        if (pos[0] < expr.length() && expr.charAt(pos[0]) == '-') {
            pos[0]++;
            return -parseAtom(expr, pos);
        }
        return parseAtom(expr, pos);
    }

    private double parseAtom(String expr, int[] pos) {
        if (pos[0] < expr.length() && expr.charAt(pos[0]) == '(') {
            pos[0]++; // skip '('
            double result = parseAddSub(expr, pos);
            if (pos[0] < expr.length() && expr.charAt(pos[0]) == ')') {
                pos[0]++; // skip ')'
            }
            return result;
        }

        int start = pos[0];
        while (pos[0] < expr.length() && (Character.isDigit(expr.charAt(pos[0])) || expr.charAt(pos[0]) == '.')) {
            pos[0]++;
        }
        if (start == pos[0]) {
            throw new RuntimeException("Unexpected character at position " + pos[0]);
        }
        return Double.parseDouble(expr.substring(start, pos[0]));
    }
}
