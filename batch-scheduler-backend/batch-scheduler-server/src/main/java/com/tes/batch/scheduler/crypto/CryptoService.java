package com.tes.batch.scheduler.crypto;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption service for sensitive data (SSH passwords).
 * IV (12 bytes) is prepended to the ciphertext for each encryption.
 */
@Slf4j
@Service
public class CryptoService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final String ENC_PREFIX = "ENC:";

    @Value("${app.encryption.key:}")
    private String encryptionKeyBase64;

    private SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    @PostConstruct
    public void init() {
        if (encryptionKeyBase64 == null || encryptionKeyBase64.isEmpty()) {
            log.error("*** SECURITY WARNING: Encryption key not configured (app.encryption.key). "
                    + "SSH passwords will be stored in PLAINTEXT. "
                    + "Set APP_ENCRYPTION_KEY env variable. Generate with: openssl rand -base64 32 ***");
            return;
        }
        try {
            byte[] keyBytes = Base64.getDecoder().decode(encryptionKeyBase64);
            if (keyBytes.length != 32) {
                throw new IllegalArgumentException("Encryption key must be 32 bytes (256 bits), got " + keyBytes.length);
            }
            secretKey = new SecretKeySpec(keyBytes, "AES");
            log.info("Encryption service initialized with AES-256-GCM");
        } catch (Exception e) {
            log.error("Failed to initialize encryption key: {}", e.getMessage());
            throw new RuntimeException("Invalid encryption key configuration", e);
        }
    }

    /**
     * Encrypt plaintext. Returns "ENC:" prefixed Base64 string.
     * If encryption key is not configured, returns plaintext as-is.
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            return plaintext;
        }
        if (secretKey == null) {
            log.warn("Encryption key not configured - storing sensitive data without encryption");
            return plaintext;
        }
        if (isEncrypted(plaintext)) {
            return plaintext; // Already encrypted
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes("UTF-8"));

            // Prepend IV to ciphertext: [IV (12 bytes)][ciphertext + tag]
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + ciphertext.length);
            buffer.put(iv);
            buffer.put(ciphertext);

            return ENC_PREFIX + Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            log.error("Encryption failed", e);
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /**
     * Decrypt ciphertext. Accepts "ENC:" prefixed Base64 string.
     * If the value is not encrypted (no prefix), returns as-is (backward compatible).
     */
    public String decrypt(String ciphertext) {
        if (ciphertext == null || ciphertext.isEmpty()) {
            return ciphertext;
        }
        if (!isEncrypted(ciphertext)) {
            return ciphertext; // Not encrypted, return as-is (backward compatible)
        }
        if (secretKey == null) {
            log.warn("Cannot decrypt: encryption key not configured");
            return ciphertext;
        }

        try {
            String encoded = ciphertext.substring(ENC_PREFIX.length());
            byte[] decoded = Base64.getDecoder().decode(encoded);

            // Extract IV and ciphertext
            ByteBuffer buffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[GCM_IV_LENGTH];
            buffer.get(iv);
            byte[] encryptedData = new byte[buffer.remaining()];
            buffer.get(encryptedData);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);

            byte[] plaintext = cipher.doFinal(encryptedData);
            return new String(plaintext, "UTF-8");
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }

    /**
     * Check if a value is already encrypted (has ENC: prefix)
     */
    public boolean isEncrypted(String value) {
        return value != null && value.startsWith(ENC_PREFIX);
    }

    /**
     * Check if the encryption service is properly configured
     */
    public boolean isEnabled() {
        return secretKey != null;
    }
}
