package com.When2Meet.calendar.auth;

import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PasswordHasher {
    private static final int ITERATIONS = 310_000;
    private static final int SALT_LENGTH = 16;
    private static final int HASH_LENGTH = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    public String encode(String password) {
        byte[] salt = new byte[SALT_LENGTH];
        RANDOM.nextBytes(salt);
        byte[] hash = derive(password, salt, ITERATIONS);
        return "pbkdf2$" + ITERATIONS + "$"
            + Base64.getEncoder().encodeToString(salt) + "$"
            + Base64.getEncoder().encodeToString(hash);
    }

    public boolean matches(String password, String encodedPassword) {
        String[] parts = encodedPassword.split("\\$", -1);
        if (parts.length != 4 || !"pbkdf2".equals(parts[0])) {
            throw new IllegalArgumentException("Invalid stored password hash");
        }

        int iterations = Integer.parseInt(parts[1]);
        byte[] salt = Base64.getDecoder().decode(parts[2]);
        byte[] expectedHash = Base64.getDecoder().decode(parts[3]);
        byte[] actualHash = derive(password, salt, iterations);
        return MessageDigest.isEqual(expectedHash, actualHash);
    }

    private byte[] derive(String password, byte[] salt, int iterations) {
        char[] passwordChars = password.toCharArray();
        PBEKeySpec spec = new PBEKeySpec(passwordChars, salt, iterations, HASH_LENGTH * 8);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                .generateSecret(spec)
                .getEncoded();
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("Could not hash password", error);
        } finally {
            spec.clearPassword();
            java.util.Arrays.fill(passwordChars, '\0');
        }
    }
}
