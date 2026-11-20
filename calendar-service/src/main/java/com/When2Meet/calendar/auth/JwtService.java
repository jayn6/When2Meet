package com.When2Meet.calendar.auth;

import com.When2Meet.calendar.user.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class JwtService {
    private static final String ALGORITHM = "HmacSHA256";
    private static final SecureRandom RANDOM = new SecureRandom();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final byte[] signingKey = new byte[32];

    public JwtService() {
        RANDOM.nextBytes(signingKey);
    }

    public String generateToken(User user) {
        try {
            Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
            String header = encoder.encodeToString(objectMapper.writeValueAsBytes(
                Map.of("alg", "HS256", "typ", "JWT")
            ));
            long now = Instant.now().getEpochSecond();
            String payload = encoder.encodeToString(objectMapper.writeValueAsBytes(
                Map.of(
                    "sub", user.getId().toString(),
                    "email", user.getEmail(),
                    "iat", now,
                    "exp", now + 86_400
                )
            ));
            String unsignedToken = header + "." + payload;
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(signingKey, ALGORITHM));
            String signature = encoder.encodeToString(
                mac.doFinal(unsignedToken.getBytes(java.nio.charset.StandardCharsets.UTF_8))
            );
            return unsignedToken + "." + signature;
        } catch (JsonProcessingException | GeneralSecurityException error) {
            throw new IllegalStateException("Could not create authentication token", error);
        }
    }

    public String extractEmail(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw unauthorized();
        }

        String[] parts = authorization.substring(7).split("\\.", -1);
        if (parts.length != 3) {
            throw unauthorized();
        }

        try {
            Base64.Decoder decoder = Base64.getUrlDecoder();
            Map<String, Object> header = objectMapper.readValue(
                decoder.decode(parts[0]), new TypeReference<>() {}
            );
            if (!"HS256".equals(header.get("alg"))) {
                throw unauthorized();
            }

            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(signingKey, ALGORITHM));
            byte[] expectedSignature = mac.doFinal(
                (parts[0] + "." + parts[1])
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8)
            );
            if (!MessageDigest.isEqual(expectedSignature, decoder.decode(parts[2]))) {
                throw unauthorized();
            }

            Map<String, Object> claims = objectMapper.readValue(
                decoder.decode(parts[1]), new TypeReference<>() {}
            );
            Object expiration = claims.get("exp");
            Object email = claims.get("email");
            if (!(expiration instanceof Number expiry)
                    || expiry.longValue() <= Instant.now().getEpochSecond()
                    || !(email instanceof String address)
                    || address.isBlank()) {
                throw unauthorized();
            }
            return address;
        } catch (IOException | GeneralSecurityException | IllegalArgumentException error) {
            throw unauthorized();
        }
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(
            HttpStatus.UNAUTHORIZED,
            "Your session is invalid or expired. Please sign in again."
        );
    }
}
