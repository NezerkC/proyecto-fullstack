package cl.duoc.sonidovivo.infrastructure.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

class JwtServiceTest {

    private static final String SECRET = "unit-test-hmac-sha256-secret-key-minimum-32-bytes-ok";
    private static final List<SimpleGrantedAuthority> ADMIN = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));

    private final JwtService jwtService = new JwtService(SECRET, 60_000);

    private static UserDetails user(String username) {
        return User.builder().username(username).password("x").roles("ADMIN").build();
    }

    @Test
    void generatedTokenCarriesSubjectAndRoles() {
        String token = jwtService.generateToken("admin", ADMIN);

        assertThat(jwtService.extractUsername(token)).isEqualTo("admin");
        assertThat(jwtService.extractRoles(token)).containsExactly("ROLE_ADMIN");
        assertThat(jwtService.isTokenValid(token, user("admin"))).isTrue();
    }

    @Test
    void tokenIsNotValidForADifferentUser() {
        String token = jwtService.generateToken("admin", ADMIN);

        assertThat(jwtService.isTokenValid(token, user("someone-else"))).isFalse();
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() {
        JwtService other = new JwtService("another-hmac-sha256-secret-key-minimum-32-bytes!!", 60_000);
        String forged = other.generateToken("admin", ADMIN);

        assertThatThrownBy(() -> jwtService.extractUsername(forged)).isInstanceOf(JwtException.class);
    }

    @Test
    void expiredTokenIsRejected() throws InterruptedException {
        JwtService shortLived = new JwtService(SECRET, 1);
        String token = shortLived.generateToken("admin", ADMIN);
        Thread.sleep(20);

        assertThatThrownBy(() -> shortLived.extractUsername(token)).isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void malformedTokenIsRejected() {
        assertThatThrownBy(() -> jwtService.extractUsername("not.a.jwt")).isInstanceOf(JwtException.class);
    }

    @Test
    void missingOrShortSecretFailsFast() {
        assertThatThrownBy(() -> new JwtService("", 60_000)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new JwtService("too-short", 60_000)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void nonPositiveExpirationFailsFast() {
        assertThatThrownBy(() -> new JwtService(SECRET, 0)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void exposesConfiguredExpiration() {
        assertThat(jwtService.getExpirationMs()).isEqualTo(60_000);
    }
}
