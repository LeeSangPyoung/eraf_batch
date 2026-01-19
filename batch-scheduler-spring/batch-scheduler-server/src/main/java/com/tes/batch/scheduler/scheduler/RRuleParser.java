package com.tes.batch.scheduler.scheduler;

import lombok.extern.slf4j.Slf4j;
import org.dmfs.rfc5545.DateTime;
import org.dmfs.rfc5545.recur.InvalidRecurrenceRuleException;
import org.dmfs.rfc5545.recur.RecurrenceRule;
import org.dmfs.rfc5545.recur.RecurrenceRuleIterator;
import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;
import java.util.TimeZone;

/**
 * Parser for RRULE (RFC 5545) recurrence rules using lib-recur
 */
@Slf4j
@Component
public class RRuleParser {

    /**
     * Get the next occurrence after the given start time
     *
     * @param rrule RRULE string (e.g., "FREQ=DAILY;INTERVAL=1")
     * @param after Get occurrences after this time
     * @return Next occurrence datetime, or null if no more occurrences
     */
    public ZonedDateTime getNextOccurrence(String rrule, ZonedDateTime after) {
        try {
            // Parse the RRULE
            RecurrenceRule rule = new RecurrenceRule(rrule);

            // Convert ZonedDateTime to lib-recur DateTime
            TimeZone timeZone = TimeZone.getTimeZone(after.getZone());
            DateTime start = new DateTime(
                    timeZone,
                    after.getYear(),
                    after.getMonthValue() - 1, // 0-based month
                    after.getDayOfMonth(),
                    after.getHour(),
                    after.getMinute(),
                    after.getSecond()
            );

            // Create iterator
            RecurrenceRuleIterator iterator = rule.iterator(start);

            // Get next occurrence that is after the given time
            long afterMillis = after.toInstant().toEpochMilli();

            // Skip occurrences until we find one after the given time
            int maxIterations = 1000; // Safety limit
            int count = 0;

            while (iterator.hasNext() && count < maxIterations) {
                DateTime next = iterator.nextDateTime();
                long nextMillis = next.getTimestamp();

                if (nextMillis > afterMillis) {
                    // Convert back to ZonedDateTime
                    return ZonedDateTime.ofInstant(
                            java.time.Instant.ofEpochMilli(nextMillis),
                            after.getZone()
                    );
                }
                count++;
            }

            return null;

        } catch (InvalidRecurrenceRuleException e) {
            log.error("Invalid RRULE: {}", rrule, e);
            return null;
        } catch (Exception e) {
            log.error("Error parsing RRULE: {}", rrule, e);
            return null;
        }
    }

    /**
     * Validate an RRULE string
     *
     * @param rrule RRULE string to validate
     * @return true if valid, false otherwise
     */
    public boolean isValidRRule(String rrule) {
        if (rrule == null || rrule.isEmpty()) {
            return false;
        }

        try {
            new RecurrenceRule(rrule);
            return true;
        } catch (InvalidRecurrenceRuleException e) {
            return false;
        }
    }

    /**
     * Get human-readable description of RRULE
     *
     * @param rrule RRULE string
     * @return Human-readable description
     */
    public String getDescription(String rrule) {
        try {
            RecurrenceRule rule = new RecurrenceRule(rrule);
            StringBuilder sb = new StringBuilder();

            sb.append("Every ");

            int interval = rule.getInterval();
            if (interval > 1) {
                sb.append(interval).append(" ");
            }

            switch (rule.getFreq()) {
                case YEARLY -> sb.append(interval > 1 ? "years" : "year");
                case MONTHLY -> sb.append(interval > 1 ? "months" : "month");
                case WEEKLY -> sb.append(interval > 1 ? "weeks" : "week");
                case DAILY -> sb.append(interval > 1 ? "days" : "day");
                case HOURLY -> sb.append(interval > 1 ? "hours" : "hour");
                case MINUTELY -> sb.append(interval > 1 ? "minutes" : "minute");
                case SECONDLY -> sb.append(interval > 1 ? "seconds" : "second");
            }

            Integer count = rule.getCount();
            if (count != null) {
                sb.append(", ").append(count).append(" times");
            }

            return sb.toString();

        } catch (InvalidRecurrenceRuleException e) {
            return "Invalid RRULE";
        }
    }
}
