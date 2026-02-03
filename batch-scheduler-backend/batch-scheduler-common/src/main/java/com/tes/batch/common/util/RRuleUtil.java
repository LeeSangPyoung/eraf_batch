package com.tes.batch.common.util;

import org.dmfs.rfc5545.DateTime;
import org.dmfs.rfc5545.recur.InvalidRecurrenceRuleException;
import org.dmfs.rfc5545.recur.RecurrenceRule;
import org.dmfs.rfc5545.recur.RecurrenceRuleIterator;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.TimeZone;

/**
 * Utility class for RRULE (RFC 5545) parsing and calculation.
 * Uses lib-recur library for RRULE processing.
 */
public final class RRuleUtil {

    private RRuleUtil() {
        // Utility class
    }

    /**
     * Calculate the next run date based on RRULE.
     *
     * @param rruleStr       RRULE string (e.g., "FREQ=DAILY;INTERVAL=1")
     * @param startDate      Start date in epoch milliseconds
     * @param timezone       Timezone string (e.g., "UTC", "Asia/Seoul")
     * @param afterDate      Calculate next run after this date (epoch ms)
     * @param currentRunCount Current run count (for max run limit)
     * @param maxRun         Maximum number of runs (0 = unlimited)
     * @param runForever     Whether to run forever
     * @param endDate        End date in epoch milliseconds (null = no end)
     * @return Next run date in epoch milliseconds, or null if no more runs
     */
    public static Long calculateNextRunDate(
            String rruleStr,
            long startDate,
            String timezone,
            Long afterDate,
            int currentRunCount,
            Integer maxRun,
            boolean runForever,
            Long endDate
    ) {
        if (rruleStr == null || rruleStr.isEmpty()) {
            return null;
        }

        // Check if max runs reached
        if (!runForever && maxRun != null && maxRun > 0 && currentRunCount >= maxRun) {
            return null;
        }

        try {
            RecurrenceRule rule = new RecurrenceRule(rruleStr);
            TimeZone tz = timezone != null ? TimeZone.getTimeZone(timezone) : TimeZone.getTimeZone("UTC");

            DateTime start = new DateTime(tz, startDate);
            RecurrenceRuleIterator iterator = rule.iterator(start);

            long now = afterDate != null ? afterDate : System.currentTimeMillis();

            // Skip past dates
            while (iterator.hasNext()) {
                DateTime nextDateTime = iterator.nextDateTime();
                long nextMillis = nextDateTime.getTimestamp();

                // Check end date
                if (endDate != null && nextMillis > endDate) {
                    return null;
                }

                // Return if after the reference time
                if (nextMillis > now) {
                    return nextMillis;
                }
            }

            return null;

        } catch (InvalidRecurrenceRuleException e) {
            throw new IllegalArgumentException("Invalid RRULE: " + rruleStr, e);
        }
    }

    /**
     * Calculate the next N run dates based on RRULE.
     *
     * @param rruleStr  RRULE string
     * @param startDate Start date in epoch milliseconds
     * @param timezone  Timezone string
     * @param count     Number of dates to calculate
     * @return List of next run dates in epoch milliseconds
     */
    public static List<Long> calculateNextRunDates(
            String rruleStr,
            long startDate,
            String timezone,
            int count
    ) {
        List<Long> results = new ArrayList<>();

        if (rruleStr == null || rruleStr.isEmpty()) {
            return results;
        }

        try {
            RecurrenceRule rule = new RecurrenceRule(rruleStr);
            TimeZone tz = timezone != null ? TimeZone.getTimeZone(timezone) : TimeZone.getTimeZone("UTC");

            DateTime start = new DateTime(tz, startDate);
            RecurrenceRuleIterator iterator = rule.iterator(start);

            long now = System.currentTimeMillis();
            int found = 0;

            while (iterator.hasNext() && found < count) {
                DateTime nextDateTime = iterator.nextDateTime();
                long nextMillis = nextDateTime.getTimestamp();

                if (nextMillis > now) {
                    results.add(nextMillis);
                    found++;
                }
            }

            return results;

        } catch (InvalidRecurrenceRuleException e) {
            throw new IllegalArgumentException("Invalid RRULE: " + rruleStr, e);
        }
    }

    /**
     * Validate an RRULE string.
     *
     * @param rruleStr RRULE string to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidRRule(String rruleStr) {
        if (rruleStr == null || rruleStr.isEmpty()) {
            return false;
        }

        try {
            new RecurrenceRule(rruleStr);
            return true;
        } catch (InvalidRecurrenceRuleException e) {
            return false;
        }
    }

    /**
     * Parse RRULE and return human-readable description.
     *
     * @param rruleStr RRULE string
     * @return Human-readable description
     */
    public static String describe(String rruleStr) {
        if (rruleStr == null || rruleStr.isEmpty()) {
            return "No recurrence";
        }

        try {
            RecurrenceRule rule = new RecurrenceRule(rruleStr);
            StringBuilder sb = new StringBuilder();

            sb.append("Every ");
            if (rule.getInterval() > 1) {
                sb.append(rule.getInterval()).append(" ");
            }

            switch (rule.getFreq()) {
                case YEARLY -> sb.append(rule.getInterval() > 1 ? "years" : "year");
                case MONTHLY -> sb.append(rule.getInterval() > 1 ? "months" : "month");
                case WEEKLY -> sb.append(rule.getInterval() > 1 ? "weeks" : "week");
                case DAILY -> sb.append(rule.getInterval() > 1 ? "days" : "day");
                case HOURLY -> sb.append(rule.getInterval() > 1 ? "hours" : "hour");
                case MINUTELY -> sb.append(rule.getInterval() > 1 ? "minutes" : "minute");
                case SECONDLY -> sb.append(rule.getInterval() > 1 ? "seconds" : "second");
            }

            if (rule.getCount() != null) {
                sb.append(", ").append(rule.getCount()).append(" times");
            }

            if (rule.getUntil() != null) {
                sb.append(", until ").append(rule.getUntil());
            }

            return sb.toString();

        } catch (InvalidRecurrenceRuleException e) {
            return "Invalid RRULE";
        }
    }

    /**
     * Convert LocalDateTime to RRULE DateTime.
     */
    public static DateTime toDateTime(LocalDateTime localDateTime, String timezone) {
        ZoneId zoneId = timezone != null ? ZoneId.of(timezone) : ZoneOffset.UTC;
        long millis = localDateTime.atZone(zoneId).toInstant().toEpochMilli();
        TimeZone tz = TimeZone.getTimeZone(zoneId);
        return new DateTime(tz, millis);
    }

    /**
     * Convert epoch milliseconds to RRULE DateTime.
     */
    public static DateTime toDateTime(long millis, String timezone) {
        TimeZone tz = timezone != null ? TimeZone.getTimeZone(timezone) : TimeZone.getTimeZone("UTC");
        return new DateTime(tz, millis);
    }
}
