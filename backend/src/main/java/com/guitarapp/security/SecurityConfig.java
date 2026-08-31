package com.guitarapp.security;

import com.guitarapp.config.RateLimitProperties;
import com.guitarapp.exception.ErrorResponseWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
// Enables @PreAuthorize on controller methods — without it the annotations are silently ignored.
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtService jwtService;
    private final ErrorResponseWriter errorResponseWriter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;
    private final RateLimitProperties rateLimitProperties;

    public SecurityConfig(JwtService jwtService,
                          ErrorResponseWriter errorResponseWriter,
                          RestAuthenticationEntryPoint authenticationEntryPoint,
                          RestAccessDeniedHandler accessDeniedHandler,
                          RateLimitProperties rateLimitProperties) {
        this.jwtService = jwtService;
        this.errorResponseWriter = errorResponseWriter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.rateLimitProperties = rateLimitProperties;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // Filters are constructed here (not as beans) so they live only in this chain
        // and are not auto-registered with the servlet container for every request.
        JwtFilter jwtFilter = new JwtFilter(jwtService);
        RateLimitFilter rateLimitFilter = new RateLimitFilter(errorResponseWriter, rateLimitProperties.trustedProxyCount());

        http
            .csrf(AbstractHttpConfigurer::disable)
            // Picks up the CorsConfigurationSource bean (CorsConfig). CSRF stays disabled;
            // the credentialed cross-origin design is CORS-gated (see 3.4 deferred CSRF note).
            .cors(Customizer.withDefaults())
            .sessionManagement(s ->
                s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST,
                    "/api/v1/auth/register",
                    "/api/v1/auth/login",
                    "/api/v1/auth/google",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/logout").permitAll()
                .requestMatchers("/api/v1/health").permitAll()
                // No JWT from Stripe — the Stripe-Signature header (verified against the raw
                // body in StripeWebhookHandler) is the trust boundary for this endpoint.
                .requestMatchers(HttpMethod.POST, "/api/v1/webhooks/stripe").permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(e -> e
                .authenticationEntryPoint(authenticationEntryPoint)   // 401 JSON envelope (unauthenticated)
                .accessDeniedHandler(accessDeniedHandler))            // 403 JSON envelope (authenticated, wrong role)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitFilter, JwtFilter.class);
        return http.build();
    }
}
