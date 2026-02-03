package com.tes.batch.common.enums;

/**
 * User types for role-based access control.
 */
public enum UserType {
    /**
     * Administrator with full access.
     */
    ADMIN(0),

    /**
     * Regular user with group-based access.
     */
    USER(1);

    private final int value;

    UserType(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static UserType fromValue(int value) {
        for (UserType type : values()) {
            if (type.value == value) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown user type: " + value);
    }
}
