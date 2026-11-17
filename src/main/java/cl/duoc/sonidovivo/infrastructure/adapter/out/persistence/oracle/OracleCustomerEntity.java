package cl.duoc.sonidovivo.infrastructure.adapter.out.persistence.oracle;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;

/**
 * JPA entity mapping Oracle table {@code CLIENTE} (script {@code scripts/oracle/01_pkg_sonido_vivo.sql}).
 *
 * <p>The table also has a {@code TIPO_CLIENTE} column (ESTANDAR, FRECUENTE, PREMIUM) used by the PL/SQL
 * discount rules. It is intentionally not mapped: the domain {@code Customer} has no tier, so Hibernate
 * leaves it out of INSERT/UPDATE and Oracle keeps its default or current value.</p>
 */
@Entity
@Table(name = "CLIENTE")
public class OracleCustomerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_cliente_gen")
    @SequenceGenerator(name = "seq_cliente_gen", sequenceName = "SEQ_CLIENTE", allocationSize = 1)
    @Column(name = "ID_CLIENTE", nullable = false)
    private Long id;

    @Column(name = "RUT", length = 12, nullable = false, unique = true)
    private String rut;

    @Column(name = "NOMBRES", length = 100, nullable = false)
    private String firstName;

    @Column(name = "APELLIDOS", length = 100, nullable = false)
    private String lastName;

    @Column(name = "EMAIL", length = 254, nullable = false, unique = true)
    private String email;

    @Column(name = "TELEFONO", length = 25, nullable = false)
    private String phone;

    @Column(name = "COMUNA", length = 100, nullable = false)
    private String commune;

    @Column(name = "REGION", length = 100, nullable = false)
    private String region;

    public OracleCustomerEntity() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRut() {
        return rut;
    }

    public void setRut(String rut) {
        this.rut = rut;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getCommune() {
        return commune;
    }

    public void setCommune(String commune) {
        this.commune = commune;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }
}
