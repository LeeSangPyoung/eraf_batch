package com.tes.batch.scheduler.audit;

import com.tes.batch.scheduler.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * [L6] Audit logging for critical operations
 * Logs: Who, When, What, Result
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final SecurityUtils securityUtils;

    @Pointcut("execution(* com.tes.batch.scheduler.domain..service.*Service.create*(..))")
    public void createOperations() {}

    @Pointcut("execution(* com.tes.batch.scheduler.domain..service.*Service.update*(..))")
    public void updateOperations() {}

    @Pointcut("execution(* com.tes.batch.scheduler.domain..service.*Service.delete*(..))")
    public void deleteOperations() {}

    @Pointcut("execution(* com.tes.batch.scheduler.domain.user.service.UserService.login(..))")
    public void loginOperations() {}

    @Pointcut("execution(* com.tes.batch.scheduler.domain.job.service.JobService.manuallyRunJob(..))")
    public void manualRunOperations() {}

    @AfterReturning(
        pointcut = "createOperations() || updateOperations() || deleteOperations() || loginOperations() || manualRunOperations()",
        returning = "result"
    )
    public void auditLog(JoinPoint joinPoint, Object result) {
        try {
            String userId = getCurrentUserId();
            String operation = joinPoint.getSignature().getName();
            String targetClass = joinPoint.getTarget().getClass().getSimpleName();
            String timestamp = Instant.now().toString();

            // Extract first argument as identifier (jobId, userId, etc.)
            String identifier = "";
            if (joinPoint.getArgs().length > 0) {
                Object firstArg = joinPoint.getArgs()[0];
                if (firstArg != null) {
                    identifier = firstArg.toString().length() > 100
                        ? firstArg.toString().substring(0, 100) + "..."
                        : firstArg.toString();
                }
            }

            log.info("[AUDIT] user={}, timestamp={}, operation={}.{}, target={}, result={}",
                    userId, timestamp, targetClass, operation, identifier,
                    result != null ? "SUCCESS" : "NULL");
        } catch (Exception e) {
            // Don't let audit logging failure break the main operation
            log.error("Audit logging failed", e);
        }
    }

    private String getCurrentUserId() {
        try {
            return securityUtils.getCurrentId();
        } catch (Exception e) {
            return "SYSTEM";
        }
    }
}
