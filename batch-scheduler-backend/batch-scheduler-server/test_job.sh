#!/bin/bash
#
# Dummy batch job for testing log output
#

log() {
    local level="${2:-INFO}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S.%3N')
    echo "[$timestamp] [$level] $1"
}

echo "============================================================"
log "BATCH TEST JOB (Shell) - STARTED"
echo "============================================================"

# Simulate initialization
log "Initializing job..."
sleep 0.5

# Simulate processing steps
TOTAL_STEPS=10
TOTAL_RECORDS=$((RANDOM % 100 + 100))
SUCCESS_COUNT=0
FAIL_COUNT=0

log "Processing $TOTAL_RECORDS records in $TOTAL_STEPS steps"
echo "----------------------------------------"

for step in $(seq 1 $TOTAL_STEPS); do
    log "[STEP $step/$TOTAL_STEPS] Starting step $step..."

    # Simulate work
    RECORDS_IN_STEP=$((TOTAL_RECORDS / TOTAL_STEPS))

    for i in $(seq 1 $RECORDS_IN_STEP); do
        sleep 0.02  # Simulate processing time

        # Random success/failure (95% success rate)
        if [ $((RANDOM % 100)) -lt 95 ]; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            FAIL_COUNT=$((FAIL_COUNT + 1))
            log "[STEP $step] Record $i failed - validation error" "WARN"
        fi
    done

    log "[STEP $step] Completed: $RECORDS_IN_STEP records processed"

    # Show progress
    PROGRESS=$((step * 100 / TOTAL_STEPS))
    log "[STEP $step] Progress: ${PROGRESS}%"
    echo "----------------------------------------"
done

# Summary
log "[STEP $TOTAL_STEPS] Processing Summary:"
log "[STEP $TOTAL_STEPS]   - Total Records: $TOTAL_RECORDS"
log "[STEP $TOTAL_STEPS]   - Success: $SUCCESS_COUNT"
log "[STEP $TOTAL_STEPS]   - Failed: $FAIL_COUNT"

if [ $TOTAL_RECORDS -gt 0 ]; then
    SUCCESS_RATE=$((SUCCESS_COUNT * 100 / TOTAL_RECORDS))
else
    SUCCESS_RATE=0
fi
log "[STEP $TOTAL_STEPS]   - Success Rate: ${SUCCESS_RATE}%"
echo "----------------------------------------"

# Cleanup
log "[STEP $TOTAL_STEPS/$TOTAL_STEPS] Completed: Cleanup & Finalization [OK]"

echo "============================================================"
log "All 10 Steps Completed!"
echo "============================================================"

# Final status
echo ""
echo "############################################################"
echo "#                                                          #"
echo "#       BATCH TEST JOB (Shell) - COMPLETED SUCCESSFULLY    #"
echo "#                                                          #"
echo "############################################################"

log "Final Status: COMPLETED"
log "End Time: $(date -Iseconds)"
log "Exit Code: 0 (SUCCESS)"

exit 0
