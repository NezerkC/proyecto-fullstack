package cl.duoc.sonidovivo.infrastructure.adapter.out.persistence.oracle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import cl.duoc.sonidovivo.domain.exception.InvalidDomainDataException;
import cl.duoc.sonidovivo.domain.model.Customer;
import cl.duoc.sonidovivo.domain.model.EmailAddress;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class OracleCustomerRepositoryAdapterTest {

    @Mock
    private SpringDataOracleCustomerRepository jpaRepository;

    private OracleCustomerRepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new OracleCustomerRepositoryAdapter(jpaRepository);
    }

    private static Customer newCustomer() {
        return Customer.create(
                "15.482.913-4",
                "Carlos",
                "Valenzuela Pinto",
                EmailAddress.of("carlos.valenzuela@gmail.com"),
                "+56981234567",
                "Viña del Mar",
                "Valparaíso"
        );
    }

    private static OracleCustomerEntity entity(Long id) {
        OracleCustomerEntity entity = new OracleCustomerEntity();
        entity.setId(id);
        entity.setRut("15.482.913-4");
        entity.setFirstName("Carlos");
        entity.setLastName("Valenzuela Pinto");
        entity.setEmail("carlos.valenzuela@gmail.com");
        entity.setPhone("+56981234567");
        entity.setCommune("Viña del Mar");
        entity.setRegion("Valparaíso");
        return entity;
    }

    @Test
    @DisplayName("save maps a new domain customer without id and returns it with the sequence-generated id")
    void saveNewCustomerAssignsGeneratedId() {
        when(jpaRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(OracleCustomerEntity.class)))
                .thenReturn(entity(6L));

        Customer saved = adapter.save(newCustomer());

        ArgumentCaptor<OracleCustomerEntity> captor = ArgumentCaptor.forClass(OracleCustomerEntity.class);
        verify(jpaRepository).saveAndFlush(captor.capture());
        assertNull(captor.getValue().getId());
        assertEquals("15.482.913-4", captor.getValue().getRut());
        assertEquals("carlos.valenzuela@gmail.com", captor.getValue().getEmail());
        assertEquals("6", saved.getId());
        assertEquals("Carlos Valenzuela Pinto", saved.getFullName());
        assertEquals("Valparaíso", saved.getRegion());
    }

    @Test
    @DisplayName("save of an existing customer sends its numeric id so JPA updates the row")
    void saveExistingCustomerKeepsId() {
        Customer existing = newCustomer().withId("6");
        when(jpaRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(OracleCustomerEntity.class)))
                .thenReturn(entity(6L));

        adapter.save(existing);

        ArgumentCaptor<OracleCustomerEntity> captor = ArgumentCaptor.forClass(OracleCustomerEntity.class);
        verify(jpaRepository).saveAndFlush(captor.capture());
        assertEquals(6L, captor.getValue().getId());
    }

    @Test
    @DisplayName("save rejects a non numeric id and lets uniqueness violations reach the REST handler")
    void saveErrorCases() {
        Customer nonNumeric = newCustomer().withId("cust-1");
        assertThrows(InvalidDomainDataException.class, () -> adapter.save(nonNumeric));
        verifyNoInteractions(jpaRepository);

        when(jpaRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(OracleCustomerEntity.class)))
                .thenThrow(new DataIntegrityViolationException("ORA-00001: unique constraint UN_CLI_EMAIL"));
        assertThrows(DataIntegrityViolationException.class, () -> adapter.save(newCustomer()));
    }

    @Test
    @DisplayName("findById parses the numeric id and returns empty for ids Oracle cannot hold")
    void findById() {
        when(jpaRepository.findById(6L)).thenReturn(Optional.of(entity(6L)));
        when(jpaRepository.findById(99L)).thenReturn(Optional.empty());

        assertEquals("6", adapter.findById(" 6 ").orElseThrow().getId());
        assertTrue(adapter.findById("99").isEmpty());
        assertTrue(adapter.findById("cust-1").isEmpty());
        assertTrue(adapter.findById(null).isEmpty());
    }

    @Test
    @DisplayName("findByRut, existsByRut and findAll delegate to the JPA repository and map to the domain")
    void queriesDelegate() {
        when(jpaRepository.findByRut("15.482.913-4")).thenReturn(Optional.of(entity(1L)));
        when(jpaRepository.existsByRut("15.482.913-4")).thenReturn(true);
        when(jpaRepository.existsByRut("1.111.111-1")).thenReturn(false);
        when(jpaRepository.findAll()).thenReturn(List.of(entity(1L), entity(2L)));

        assertEquals("1", adapter.findByRut("15.482.913-4").orElseThrow().getId());
        assertTrue(adapter.existsByRut("15.482.913-4"));
        assertFalse(adapter.existsByRut("1.111.111-1"));
        assertEquals(List.of("1", "2"), adapter.findAll().stream().map(Customer::getId).toList());
    }
}
