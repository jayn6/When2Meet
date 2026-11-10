package com.When2Meet.calendar.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.When2Meet.calendar.ai.dto.TimetableExtractionResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.model}")
    private String model;

    private final ObjectMapper mapper = new ObjectMapper()
        .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private final RestTemplate restTemplate = new RestTemplate(timeoutFactory());

    private static org.springframework.http.client.SimpleClientHttpRequestFactory timeoutFactory() {
        org.springframework.http.client.SimpleClientHttpRequestFactory f =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        f.setConnectTimeout(10000);
        f.setReadTimeout(60000);
        return f;
   }

    public TimetableExtractionResponse extract(MultipartFile file)
            throws Exception {

        // Convert image to Base64
        String base64Image = Base64.getEncoder()
                .encodeToString(file.getBytes());

        String mimeType = file.getContentType();

        // Instructions for Gemini
        String prompt = """
            Analyze this  timetable image.

            Extract every class you can identify.

            For each class return:
            - subject
            - dayOfWeek (MONDAY, TUESDAY, WEDNESDAY,
              THURSDAY, FRIDAY, SATURDAY or SUNDAY)
            - startTime (HH:mm, 24-hour format)
            - endTime (HH:mm, 24-hour format)
            - room
            - teacher

            Rules:
            1. Read the timetable columns and rows carefully.
            2. Do not invent missing information.
            3. Use null for information that cannot be identified.
            4. Do not confuse break periods with classes.
            5. If a class is repeated on different days,
               return a separate entry for each day.
            6. Return only valid JSON.
            7. Do not include markdown or explanations.

            Expected JSON structure:
            {
              "classes": [
                {
                  "subject": "Mathematics",
                  "dayOfWeek": "MONDAY",
                  "startTime": "09:00",
                  "endTime": "10:30",
                  "room": "B14",
                  "teacher": null
                }
              ]
            }
            """;

        // Image part
        Map<String, Object> imagePart = Map.of(
            "inline_data",
            Map.of(
                "mime_type", mimeType,
                "data", base64Image
            )
        );

        // Text part
        Map<String, Object> textPart = Map.of(
            "text", prompt
        );

        // Request contents
        Map<String, Object> content = Map.of(
            "parts", List.of(imagePart, textPart)
        );

        // Ask Gemini for JSON output
        Map<String, Object> generationConfig = Map.of(
            "responseMimeType", "application/json",
            "thinkingConfig", Map.of("thinkingLevel", "low")
        );

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(content),
            "generationConfig", generationConfig
        );

        String url =
            "https://generativelanguage.googleapis.com/v1beta/models/"
            + model + ":generateContent";

        HttpHeaders headers = new HttpHeaders();

        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        HttpEntity<Map<String, Object>> request =
            new HttpEntity<>(requestBody, headers);

        // Send request to Gemini
        ResponseEntity<String> response = null;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                response = restTemplate.exchange(url, HttpMethod.POST, request, String.class);
                break;
            } catch (org.springframework.web.client.HttpServerErrorException e) {
                if (attempt == 3) throw e;
                Thread.sleep(2000L * attempt);
            }
}

        JsonNode root = mapper.readTree(response.getBody());

        if (root == null ||
            !root.path("candidates").isArray() ||
            root.path("candidates").isEmpty()) {

            throw new RuntimeException(
                "Gemini could not extract the timetable."
            );
        }

        JsonNode parts = root
            .path("candidates")
            .get(0)
            .path("content")
            .path("parts");

        StringBuilder result = new StringBuilder();

        for (JsonNode part : parts) {
            if (part.has("text")) {
                result.append(part.get("text").asText());
            }
        }

        // Convert returned JSON into Java DTO
        /*return mapper.readValue(
            result.toString(),
            TimetableExtractionResponse.class
        );*/

        String json = result.toString().trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        }
        return mapper.readValue(json, TimetableExtractionResponse.class);
    }
}