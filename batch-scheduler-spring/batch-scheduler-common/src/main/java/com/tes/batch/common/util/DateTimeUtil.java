package com.tes.batch.common.util;

import java.time.*;
import java.time.format.DateTimeFormatter;

/**
 * Utility class for date/time operations.
 * Uses epoch milliseconds for compatibility with existing system.
 */
public final class DateTimeUtil {

    private static final DateTimeFormatter DEFAULT_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private DateTimeUtil() {
        // Utility class
    }

    /**
     * Get current time as epoch milliseconds.
     */
    public static long nowMillis() {
        return System.currentTimeMillis();
    }

    /**
     * Convert epoch milliseconds to LocalDateTime in UTC.
     */
    public static LocalDateTime fromMillis(long millis) {
        return LocalDateTime.ofInstant(
                Instant.ofEpochMilli(millis),
                ZoneOffset.UTC
        );
    }

    /**
     * Convert epoch milliseconds to LocalDateTime in specified timezone.
     */
    public static LocalDateTime fromMillis(long millis, String timezone) {
        ZoneId zoneId = timezone != null ? ZoneId.of(timezone) : ZoneOffset.UTC;
        return LocalDateTime.ofInstant(
                Instant.ofEpochMilli(millis),
                zoneId
        );
    }

    /**
     * Convert LocalDateTime to epoch milliseconds (assuming UTC).
     */
    public static long toMillis(LocalDateTime dateTime) {
        return dateTime.toInstant(ZoneOffset.UTC).toEpochMilli();
    }

    /**
     * Convert LocalDateTime to epoch milliseconds with specified timezone.
     */
    public static long toMillis(LocalDateTime dateTime, String timezone) {
        ZoneId zoneId = timezone != null ? ZoneId.of(timezone) : ZoneOffset.UTC;
        return dateTime.atZone(zoneId).toInstant().toEpochMilli();
    }

    /**
     * Format epoch milliseconds to string.
     */
    public static String format(long millis) {
        return DEFAULT_FORMATTER.format(fromMillis(millis));
    }

    /**
     * Format epoch milliseconds to string with specified timezone.
     */
    public static String format(long millis, String timezone) {
        return DEFAULT_FORMATTER.format(fromMillis(millis, timezone));
    }

    /**
     * Parse string to epoch milliseconds.
     */
    public static long parse(String dateTimeStr) {
        LocalDateTime dateTime = LocalDateTime.parse(dateTimeStr, DEFAULT_FORMATTER);
        return toMillis(dateTime);
    }

    /**
     * Parse string to epoch milliseconds with specified timezone.
     */
    public static long parse(String dateTimeStr, String timezone) {
        LocalDateTime dateTime = LocalDateTime.parse(dateTimeStr, DEFAULT_FORMATTER);
        return toMillis(dateTime, timezone);
    }

    /**
     * Calculate duration in milliseconds.
     */
    public static long durationMillis(long startMillis, long endMillis) {
        return endMillis - startMillis;
    }

    /**
     * Format duration in milliseconds to human-readable string.
     */
    public static String formatDuration(long durationMillis) {
        Duration duration = Duration.ofMillis(durationMillis);
        long hours = duration.toHours();
        long minutes = duration.toMinutesPart();
        long seconds = duration.toSecondsPart();
        long millis = duration.toMillisPart();

        if (hours > 0) {
            return String.format("%02d:%02d:%02d.%03d", hours, minutes, seconds, millis);
        } else if (minutes > 0) {
            return String.format("%02d:%02d.%03d", minutes, seconds, millis);
        } else {
            return String.format("%d.%03ds", seconds, millis);
        }
    }

    /**
     * Parse duration string (HH:mm:ss) to Duration.
     */
    public static Duration parseDuration(String durationStr) {
        if (durationStr == null || durationStr.isEmpty()) {
            return null;
        }

        String[] parts = durationStr.split(":");
        if (parts.length == 3) {
            long hours = Long.parseLong(parts[0]);
            long minutes = Long.parseLong(parts[1]);
            long seconds = Long.parseLong(parts[2]);
            return Duration.ofHours(hours)
                    .plusMinutes(minutes)
                    .plusSeconds(seconds);
        }

        return Duration.parse("PT" + durationStr.toUpperCase());
    }
}
