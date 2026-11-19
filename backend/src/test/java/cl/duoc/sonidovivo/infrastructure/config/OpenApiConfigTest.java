package cl.duoc.sonidovivo.infrastructure.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("OpenApiConfig and Swagger Security Tests")
class OpenApiConfigTest {

    private final OpenApiConfig openApiConfig = new OpenApiConfig();

    @Test
    @DisplayName("sonidoVivoOpenAPI registers title, version, description, bearerAuth scheme and requirements")
    void testSonidoVivoOpenApiMetadata() {
        OpenAPI openAPI = openApiConfig.sonidoVivoOpenAPI();

        assertThat(openAPI).isNotNull();
        assertThat(openAPI.getInfo()).isNotNull();
        assertThat(openAPI.getInfo().getTitle()).isEqualTo("Sonido Vivo API");
        assertThat(openAPI.getInfo().getVersion()).isEqualTo("v1");
        assertThat(openAPI.getInfo().getDescription()).contains("Hexagonal omnichannel REST API for Sonido Vivo");

        assertThat(openAPI.getComponents()).isNotNull();
        assertThat(openAPI.getComponents().getSecuritySchemes()).containsKey("bearerAuth");

        SecurityScheme scheme = openAPI.getComponents().getSecuritySchemes().get("bearerAuth");
        assertThat(scheme.getType()).isEqualTo(SecurityScheme.Type.HTTP);
        assertThat(scheme.getScheme()).isEqualTo("bearer");
        assertThat(scheme.getBearerFormat()).isEqualTo("JWT");

        assertThat(openAPI.getSecurity()).isNotEmpty();
        assertThat(openAPI.getSecurity().get(0)).containsKey("bearerAuth");
    }

    @Configuration
    @EnableWebSecurity
    @Import(SecurityConfig.class)
    static class TestSecurityContextConfig {
        @Bean
        public JwtAuthenticationFilter jwtAuthenticationFilter() {
            JwtService jwtService = mock(JwtService.class);
            UserDetailsService userDetailsService = mock(UserDetailsService.class);
            return new JwtAuthenticationFilter(jwtService, userDetailsService);
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
            return mock(CorsConfigurationSource.class);
        }
    }

    @Test
    @DisplayName("SecurityFilterChain allows OpenAPI/Swagger endpoints while protecting admin routes")
    void testSwaggerEndpointsArePermittedAndAdminRoutesRequireAuth() throws Exception {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.register(TestSecurityContextConfig.class);
            context.refresh();

            SecurityFilterChain filterChain = context.getBean(SecurityFilterChain.class);
            assertThat(filterChain).isNotNull();

            // 1. /v3/api-docs (permitAll -> should not return 401 or 403)
            MockHttpServletRequest docsRequest = new MockHttpServletRequest("GET", "/v3/api-docs");
            MockHttpServletResponse docsResponse = new MockHttpServletResponse();
            executeFilterChain(filterChain, docsRequest, docsResponse);
            assertThat(docsResponse.getStatus()).isNotEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
            assertThat(docsResponse.getStatus()).isNotEqualTo(HttpServletResponse.SC_FORBIDDEN);

            // 2. /swagger-ui/index.html (permitAll -> should not return 401 or 403)
            MockHttpServletRequest uiRequest = new MockHttpServletRequest("GET", "/swagger-ui/index.html");
            MockHttpServletResponse uiResponse = new MockHttpServletResponse();
            executeFilterChain(filterChain, uiRequest, uiResponse);
            assertThat(uiResponse.getStatus()).isNotEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
            assertThat(uiResponse.getStatus()).isNotEqualTo(HttpServletResponse.SC_FORBIDDEN);

            // 3. /swagger-ui.html (permitAll -> should not return 401 or 403)
            MockHttpServletRequest uiHtmlRequest = new MockHttpServletRequest("GET", "/swagger-ui.html");
            MockHttpServletResponse uiHtmlResponse = new MockHttpServletResponse();
            executeFilterChain(filterChain, uiHtmlRequest, uiHtmlResponse);
            assertThat(uiHtmlResponse.getStatus()).isNotEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
            assertThat(uiHtmlResponse.getStatus()).isNotEqualTo(HttpServletResponse.SC_FORBIDDEN);

            // 4. /api/v1/admin/products (hasRole('ADMIN') -> returns 401 when unauthenticated)
            MockHttpServletRequest adminRequest = new MockHttpServletRequest("GET", "/api/v1/admin/products");
            MockHttpServletResponse adminResponse = new MockHttpServletResponse();
            executeFilterChain(filterChain, adminRequest, adminResponse);
            assertThat(adminResponse.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
            assertThat(adminResponse.getContentAsString()).contains("Authentication required or token is invalid");
        }
    }

    private void executeFilterChain(
            SecurityFilterChain filterChain,
            MockHttpServletRequest request,
            MockHttpServletResponse response
    ) throws Exception {
        List<jakarta.servlet.Filter> filters = filterChain.getFilters();
        jakarta.servlet.FilterChain chain = new jakarta.servlet.FilterChain() {
            private int index = 0;

            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res)
                    throws java.io.IOException, jakarta.servlet.ServletException {
                if (index < filters.size()) {
                    filters.get(index++).doFilter(req, res, this);
                }
            }
        };
        chain.doFilter(request, response);
    }
}
