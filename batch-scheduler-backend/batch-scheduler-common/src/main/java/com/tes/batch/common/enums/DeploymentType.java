package com.tes.batch.common.enums;

/**
 * Agent 배포 방식
 */
public enum DeploymentType {
    /**
     * JAR 파일 직접 배포 (기존 방식)
     */
    JAR("JAR"),

    /**
     * Docker 컨테이너로 배포
     */
    DOCKER("Docker");

    private final String displayName;

    DeploymentType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
