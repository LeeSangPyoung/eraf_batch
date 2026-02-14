package com.tes.batch.scheduler.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long validityInMilliseconds;

    private SecretKey key;

    @PostConstruct
    protected void init() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "JWT secret key must be at least 32 bytes (256 bits) for HMAC-SHA256, got " + keyBytes.length
                + " bytes. Please set a stronger jwt.secret value.");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Create JWT token
     */
    public String createToken(String userId, String id, Integer userType, Set<String> groupIds) {
        Claims claims = Jwts.claims().subject(userId).build();
        Map<String, Object> claimsMap = new HashMap<>();
        claimsMap.put("id", id);
        claimsMap.put("user_type", userType);
        claimsMap.put("group_ids", groupIds != null ? groupIds : Collections.emptySet());

        Date now = new Date();
        Date validity = new Date(now.getTime() + validityInMilliseconds);

        return Jwts.builder()
                .claims(claimsMap)
                .subject(userId)
                .issuedAt(now)
                .expiration(validity)
                .signWith(key)
                .compact();
    }

    /**
     * Get authentication from token
     */
    public Authentication getAuthentication(String token) {
        Claims claims = getClaims(token);
        String userId = claims.getSubject();
        Integer userType = claims.get("user_type", Integer.class);

        Collection<GrantedAuthority> authorities = new ArrayList<>();
        if (userType != null && userType == 0) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));

        UserDetails userDetails = new User(userId, "", authorities);
        return new UsernamePasswordAuthenticationToken(userDetails, token, authorities);
    }

    /**
     * Get user ID from token
     */
    public String getUserId(String token) {
        return getClaims(token).getSubject();
    }

    /**
     * Get internal ID from token
     */
    public String getId(String token) {
        return getClaims(token).get("id", String.class);
    }

    /**
     * Get user type from token
     */
    public Integer getUserType(String token) {
        return getClaims(token).get("user_type", Integer.class);
    }

    /**
     * Get group IDs from token
     */
    @SuppressWarnings("unchecked")
    public Set<String> getGroupIds(String token) {
        List<String> groupList = getClaims(token).get("group_ids", List.class);
        return groupList != null ? new HashSet<>(groupList) : Collections.emptySet();
    }

    /**
     * Validate token
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.warn("Invalid JWT signature: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.warn("Expired JWT token: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("Unsupported JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    /**
     * Get claims from token
     */
    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Resolve token from header
     */
    public String resolveToken(String bearerToken) {
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
