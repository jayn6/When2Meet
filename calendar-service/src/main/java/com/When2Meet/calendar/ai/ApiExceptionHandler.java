package com.When2Meet.calendar.ai;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler({
        org.springframework.web.client.HttpServerErrorException.class,
        org.springframework.web.client.ResourceAccessException.class
    })
    public ResponseEntity<Map<String, String>> aiBusy(Exception e) {
        return ResponseEntity.status(503).body(
            Map.of("error", "The AI service is busy or too slow. Please try again in a minute."));
    }
}