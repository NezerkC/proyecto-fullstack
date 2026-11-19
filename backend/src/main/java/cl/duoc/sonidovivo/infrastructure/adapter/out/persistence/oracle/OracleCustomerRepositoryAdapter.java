package cl.duoc.sonidovivo.infrastructure.adapter.out.persistence.oracle;

import cl.duoc.sonidovivo.domain.exception.InvalidDomainDataException;
import cl.duoc.sonidovivo.domain.model.Customer;
import cl.duoc.sonidovivo.domain.model.EmailAddress;
import cl.duoc.sonidovivo.domain.port.out.CustomerRepositoryPort;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

/**
 * Oracle JPA outbound adapter implementing {@link CustomerRepositoryPort}.
 *
 * <p>Responsable asignado: <strong>Danilo Sepúlveda (@Daakhen)</strong></p>
 * <p>The domain identifies customers with a {@code String} id while {@code CLIENTE.ID_CLIENTE} is a
 * {@code NUMBER} filled from {@code SEQ_CLIENTE}; this adapter converts between both. An id that is not
 * numeric cannot exist in Oracle, so lookups by such an id return an empty result.</p>
 * <p>Documentación y contrato: {@code docs/ORACLE_PLSQL_INTEGRATION.md}</p>
 */
@Repository
public class OracleCustomerRepositoryAdapter implements CustomerRepositoryPort {

    private final SpringDataOracleCustomerRepository jpaRepository;

    public OracleCustomerRepositoryAdapter(SpringDataOracleCustomerRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Customer save(Customer customer) {
        // saveAndFlush surfaces UN_CLI_RUT / UN_CLI_EMAIL violations here as DataIntegrityViolationException,
        // which GlobalExceptionHandler already maps to HTTP 409.
        return toDomain(jpaRepository.saveAndFlush(toEntity(customer)));
    }

    @Override
    public Optional<Customer> findById(String id) {
        return parseId(id).flatMap(jpaRepository::findById).map(OracleCustomerRepositoryAdapter::toDomain);
    }

    @Override
    public Optional<Customer> findByRut(String rut) {
        return jpaRepository.findByRut(rut).map(OracleCustomerRepositoryAdapter::toDomain);
    }

    @Override
    public boolean existsByRut(String rut) {
        return jpaRepository.existsByRut(rut);
    }

    @Override
    public List<Customer> findAll() {
        return jpaRepository.findAll().stream().map(OracleCustomerRepositoryAdapter::toDomain).toList();
    }

    private static Optional<Long> parseId(String id) {
        if (id == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.valueOf(id.trim()));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }

    private static OracleCustomerEntity toEntity(Customer customer) {
        OracleCustomerEntity entity = new OracleCustomerEntity();
        if (customer.getId() != null) {
            entity.setId(parseId(customer.getId()).orElseThrow(() -> new InvalidDomainDataException(
                    "Oracle customer id must be numeric: " + customer.getId()
            )));
        }
        entity.setRut(customer.getRut());
        entity.setFirstName(customer.getFirstName());
        entity.setLastName(customer.getLastName());
        entity.setEmail(customer.getEmail().value());
        entity.setPhone(customer.getPhone());
        entity.setCommune(customer.getCommune());
        entity.setRegion(customer.getRegion());
        return entity;
    }

    private static Customer toDomain(OracleCustomerEntity entity) {
        return Customer.reconstitute(
                String.valueOf(entity.getId()),
                entity.getRut(),
                entity.getFirstName(),
                entity.getLastName(),
                EmailAddress.of(entity.getEmail()),
                entity.getPhone(),
                entity.getCommune(),
                entity.getRegion()
        );
    }
}
