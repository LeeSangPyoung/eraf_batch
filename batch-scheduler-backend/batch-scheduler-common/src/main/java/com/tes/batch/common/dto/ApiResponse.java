package com.tes.batch.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Standard API response wrapper for frontend compatibility.
 * Matches the existing Python API response format.
 *
 * @param <T> Type of the data payload
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    /**
     * Whether the request was successful.
     */
    private boolean success;

    /**
     * Response data payload.
     */
    private T data;

    /**
     * Total count for paginated results.
     */
    private Long total;

    /**
     * Error message if success is false.
     */
    private String errorMsg;

    /**
     * List of available status values for filter dropdowns.
     */
    @JsonProperty("status_list")
    private java.util.List<String> statusList;

    /**
     * Create a successful response with data.
     */
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    /**
     * Create a successful response with data and total count.
     */
    public static <T> ApiResponse<T> success(T data, long total) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .total(total)
                .build();
    }

    /**
     * Create a successful response with data and total count (alias).
     */
    public static <T> ApiResponse<T> successWithTotal(T data, long total) {
        return success(data, total);
    }

    /**
     * Create a successful response with data, total count, and status list.
     */
    public static <T> ApiResponse<T> successWithStatusList(T data, long total, java.util.List<String> statusList) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .total(total)
                .statusList(statusList)
                .build();
    }

    /**
     * Create an error response.
     */
    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .errorMsg(message)
                .build();
    }

    /**
     * Create a successful response without data.
     */
    public static <T> ApiResponse<T> ok() {
        return ApiResponse.<T>builder()
                .success(true)
                .build();
    }
}
