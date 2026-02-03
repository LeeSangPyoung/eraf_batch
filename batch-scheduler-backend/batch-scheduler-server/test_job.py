#!/usr/bin/env python3
"""
Dummy batch job for testing log output
"""
import sys
import time
import random
from datetime import datetime

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] [{level}] {message}", flush=True)

def main():
    log("=" * 60)
    log("BATCH TEST JOB - STARTED")
    log("=" * 60)

    # Simulate initialization
    log("Initializing job...")
    time.sleep(0.5)

    # Simulate processing steps
    total_steps = 10
    total_records = random.randint(100, 200)
    success_count = 0
    fail_count = 0

    log(f"Processing {total_records} records in {total_steps} steps")
    log("-" * 40)

    for step in range(1, total_steps + 1):
        log(f"[STEP {step}/{total_steps}] Starting step {step}...")

        # Simulate work
        records_in_step = total_records // total_steps
        for i in range(records_in_step):
            time.sleep(0.02)  # Simulate processing time

            # Random success/failure
            if random.random() > 0.05:  # 95% success rate
                success_count += 1
            else:
                fail_count += 1
                log(f"[STEP {step}] Record {i+1} failed - validation error", "WARN")

        log(f"[STEP {step}] Completed: {records_in_step} records processed")

        # Show progress
        progress = (step / total_steps) * 100
        log(f"[STEP {step}] Progress: {progress:.0f}%")
        log("-" * 40)

    # Summary
    log(f"[STEP {total_steps}] Processing Summary:")
    log(f"[STEP {total_steps}]   - Total Records: {total_records}")
    log(f"[STEP {total_steps}]   - Success: {success_count}")
    log(f"[STEP {total_steps}]   - Failed: {fail_count}")
    success_rate = (success_count / total_records) * 100 if total_records > 0 else 0
    log(f"[STEP {total_steps}]   - Success Rate: {success_rate:.2f}%")
    log("-" * 40)

    # Cleanup
    log(f"[STEP {total_steps}/{total_steps}] Completed: Cleanup & Finalization [OK]")

    log("=" * 60)
    log("All 10 Steps Completed!")
    log("=" * 60)

    # Final status
    print("\n" + "#" * 60)
    print("#" + " " * 58 + "#")
    print("#" + "        BATCH TEST JOB - COMPLETED SUCCESSFULLY".center(58) + "#")
    print("#" + " " * 58 + "#")
    print("#" * 60)

    end_time = datetime.now()
    log(f"Final Status: COMPLETED")
    log(f"Start Time: {datetime.now().isoformat()}")
    log(f"End Time: {end_time.isoformat()}")
    log(f"Exit Code: 0 (SUCCESS)")

    return 0

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        log(f"FATAL ERROR: {str(e)}", "ERROR")
        sys.exit(1)
