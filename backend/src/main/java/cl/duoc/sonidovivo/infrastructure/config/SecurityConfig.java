package cl.duoc.sonidovivo.infrastructure.config;

import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.ErrorResponseDTO;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import tools.jackson.databind.json.JsonMapper;

/**
 * Stateless Spring Security configuration protecting routes with role-based Bearer JWTs.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final JsonMapper JSON_MAPPER = JsonMapper.builder().build();

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(
            PasswordEncoder passwordEncoder,
            @Value("${app.security.admin-username:${ADMIN_USERNAME:admin}}") String adminUsername,
            @Value("${app.security.admin-password:${ADMIN_PASSWORD:admin123}}") String adminPassword,
            @Value("${app.security.vendedor-username:${VENDEDOR_USERNAME:vendedor}}") String vendedorUsername,
            @Value("${app.security.vendedor-password:${VENDEDOR_PASSWORD:vendedor123}}") String vendedorPassword,
            @Value("${app.security.cliente-username:${CLIENTE_USERNAME:usuario}}") String clienteUsername,
            @Value("${app.security.cliente-password:${CLIENTE_PASSWORD:usuario123}}") String clientePassword
    ) {
        List<UserDetails> users = new ArrayList<>();

        String rawAdminPass = (adminPassword != null && !adminPassword.isBlank())
                ? adminPassword
                : UUID.randomUUID().toString();
        users.add(User.builder()
                .username(adminUsername)
                .password(passwordEncoder.encode(rawAdminPass))
                .roles("ADMIN")
                .build());

        String rawVendedorPass = (vendedorPassword != null && !vendedorPassword.isBlank())
                ? vendedorPassword
                : UUID.randomUUID().toString();
        users.add(User.builder()
                .username(vendedorUsername)
                .password(passwordEncoder.encode(rawVendedorPass))
                .roles("VENDEDOR")
                .build());

        String rawClientePass = (clientePassword != null && !clientePassword.isBlank())
                ? clientePassword
                : UUID.randomUUID().toString();
        users.add(User.builder()
                .username(clienteUsername)
                .password(passwordEncoder.encode(rawClientePass))
                .roles("CLIENTE")
                .build());

        return new InMemoryUserDetailsManager(users);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> writeErrorResponse(
                response,
                HttpStatus.UNAUTHORIZED,
                "Authentication required or token is invalid",
                request.getRequestURI()
        );
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> writeErrorResponse(
                response,
                HttpStatus.FORBIDDEN,
                "Insufficient permissions to access this resource",
                request.getRequestURI()
        );
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            CorsConfigurationSource corsConfigurationSource,
            AuthenticationEntryPoint authenticationEntryPoint,
            AccessDeniedHandler accessDeniedHandler
    ) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/public/products", "/api/v1/public/products/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // Store endpoints accessible by CLIENTE, VENDEDOR, ADMIN
                        .requestMatchers("/api/v1/store/**").hasAnyRole("CLIENTE", "VENDEDOR", "ADMIN")

                        // Product read & stock adjustment: ADMIN or VENDEDOR
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/products", "/api/v1/admin/products/**").hasAnyRole("ADMIN", "VENDEDOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/products/*/stock").hasAnyRole("ADMIN", "VENDEDOR")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/products/*/stock").hasAnyRole("ADMIN", "VENDEDOR")

                        // Customer list, detail, and registration: ADMIN or VENDEDOR
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/customers", "/api/v1/admin/customers/**").hasAnyRole("ADMIN", "VENDEDOR")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/customers").hasAnyRole("ADMIN", "VENDEDOR")

                        // Operations sales & discount: ADMIN or VENDEDOR
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/operations/sales").hasAnyRole("ADMIN", "VENDEDOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/operations/discount").hasAnyRole("ADMIN", "VENDEDOR")

                        // Strictly ADMIN for write/delete/status on products, customer update, metrics, price adjustment, liquidations
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/products", "/api/v1/admin/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/admin/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/products/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/admin/customers/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/dashboard/metrics").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/dashboard/export").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/operations/price-adjustment").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/operations/liquidations").hasRole("ADMIN")

                        // Fallback admin rule
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    private static void writeErrorResponse(
            HttpServletResponse response,
            HttpStatus status,
            String message,
            String path
    ) throws IOException {
        response.setStatus(status.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponseDTO body = ErrorResponseDTO.of(status.value(), status.getReasonPhrase(), message, path);
        response.getWriter().write(JSON_MAPPER.writeValueAsString(body));
    }
}
