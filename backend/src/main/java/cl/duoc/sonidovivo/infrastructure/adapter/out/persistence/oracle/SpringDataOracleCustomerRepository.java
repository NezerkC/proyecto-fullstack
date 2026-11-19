package cl.duoc.sonidovivo.infrastructure.adapter.out.persistence.oracle;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data JPA repository for {@link OracleCustomerEntity} (primary key: {@code ID_CLIENTE}).
 */
public interface SpringDataOracleCustomerRepository extends JpaRepository<OracleCustomerEntity, Long> {

    Optional<OracleCustomerEntity> findByRut(String rut);

    boolean existsByRut(String rut);
}
