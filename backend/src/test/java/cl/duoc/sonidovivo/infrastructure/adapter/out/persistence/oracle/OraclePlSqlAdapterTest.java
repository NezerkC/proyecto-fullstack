package cl.duoc.sonidovivo.infrastructure.adapter.out.persistence.oracle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import cl.duoc.sonidovivo.domain.exception.CustomerNotFoundException;
import cl.duoc.sonidovivo.domain.exception.InvalidDomainDataException;
import cl.duoc.sonidovivo.domain.model.LiquidationResult;
import cl.duoc.sonidovivo.domain.model.MoneyClp;
import cl.duoc.sonidovivo.domain.model.ProductCode;
import cl.duoc.sonidovivo.domain.model.SaleCommand;
import cl.duoc.sonidovivo.domain.model.SaleResult;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Verifies the {@code SimpleJdbcCall} wiring (call text, parameter order and types, OUT mapping and error
 * translation) against a mocked JDBC driver. It does not execute PL/SQL: that needs a real Oracle instance
 * (see docs/ORACLE_PLSQL_INTEGRATION.md for the manual verification script).
 */
class OraclePlSqlAdapterTest {

    private DataSource dataSource;
    private CallableStatement callableStatement;
    private Connection connection;
    private OraclePlSqlAdapter adapter;

    @BeforeEach
    void setUp() throws SQLException {
        dataSource = mock(DataSource.class);
        connection = mock(Connection.class);
        DatabaseMetaData metaData = mock(DatabaseMetaData.class);
        callableStatement = mock(CallableStatement.class);

        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metaData);
        when(metaData.getDatabaseProductName()).thenReturn("Oracle");
        when(connection.prepareCall(anyString())).thenReturn(callableStatement);
        // A bare mock reports updateCount 0 forever, which makes Spring's result loop spin; -1 means "no more results".
        when(callableStatement.getUpdateCount()).thenReturn(-1);

        adapter = new OraclePlSqlAdapter(new JdbcTemplate(dataSource));
    }

    private String capturedCallText() throws SQLException {
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(connection).prepareCall(sql.capture());
        return sql.getValue();
    }

    @Test
    @DisplayName("registerSale calls SP_REGISTRAR_VENTA positionally and maps the four OUT parameters")
    void registerSaleCallsProcedureAndMapsOutParameters() throws SQLException {
        ProductCode code = ProductCode.of("G-FND-STRAT-01");
        SaleCommand command = new SaleCommand("3", code, 2, MoneyClp.of(800_000));
        when(callableStatement.getObject(5)).thenReturn("BOL-5001");
        when(callableStatement.getObject(6)).thenReturn(new BigDecimal("1600000"));
        when(callableStatement.getObject(7)).thenReturn(BigDecimal.ZERO);
        when(callableStatement.getObject(8)).thenReturn(new BigDecimal("1600000"));

        SaleResult result = adapter.registerSale(command);

        assertEquals("{call PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA(?, ?, ?, ?, ?, ?, ?, ?)}", capturedCallText());
        verify(callableStatement).setObject(1, 3L, Types.NUMERIC);
        verify(callableStatement).setString(2, "G-FND-STRAT-01");
        verify(callableStatement).setObject(3, 2, Types.NUMERIC);
        verify(callableStatement).setObject(4, 800_000, Types.NUMERIC);
        verify(callableStatement).registerOutParameter(5, Types.VARCHAR);
        verify(callableStatement).registerOutParameter(6, Types.NUMERIC);
        verify(callableStatement).registerOutParameter(7, Types.NUMERIC);
        verify(callableStatement).registerOutParameter(8, Types.NUMERIC);

        assertEquals("BOL-5001", result.saleReference());
        assertEquals("3", result.customerId());
        assertEquals(code, result.productCode());
        assertEquals(2, result.quantity());
        assertEquals(1_600_000L, result.grossTotalClp());
        assertEquals(0L, result.discountClp());
        assertEquals(1_600_000L, result.netTotalClp());
        assertNotNull(result.registeredAt());
    }

    @Test
    @DisplayName("liquidateCustomers calls SP_LIQUIDAR_CLIENTES with a DATE and maps the summary")
    void liquidateCustomersCallsProcedureAndMapsSummary() throws SQLException {
        LocalDate processDate = LocalDate.of(2026, 11, 17);
        when(callableStatement.getObject(2)).thenReturn(new BigDecimal("4"));
        when(callableStatement.getObject(3)).thenReturn(new BigDecimal("2204582"));
        when(callableStatement.getObject(4)).thenReturn("OK: 4 cliente(s) y 5 venta(s) liquidados hasta 2026-11-17");

        LiquidationResult result = adapter.liquidateCustomers(processDate);

        assertEquals("{call PKG_SONIDO_VIVO.SP_LIQUIDAR_CLIENTES(?, ?, ?, ?)}", capturedCallText());
        verify(callableStatement).setDate(1, java.sql.Date.valueOf(processDate));
        verify(callableStatement).registerOutParameter(2, Types.NUMERIC);
        verify(callableStatement).registerOutParameter(3, Types.NUMERIC);
        verify(callableStatement).registerOutParameter(4, Types.VARCHAR);

        assertEquals(4, result.processedCustomers());
        assertEquals(2_204_582L, result.totalLiquidatedClp());
        assertEquals(processDate, result.processDate());
        assertEquals("OK: 4 cliente(s) y 5 venta(s) liquidados hasta 2026-11-17", result.statusMessage());
    }

    @Test
    @DisplayName("calculateDiscount calls FN_CALCULAR_DESCUENTO as a function and returns its value")
    void calculateDiscountCallsFunction() throws SQLException {
        when(callableStatement.getObject(1)).thenReturn(new BigDecimal("84000"));

        long discount = adapter.calculateDiscount("1", 700_000L);

        assertEquals("{? = call PKG_SONIDO_VIVO.FN_CALCULAR_DESCUENTO(?, ?)}", capturedCallText());
        verify(callableStatement).registerOutParameter(1, Types.NUMERIC);
        verify(callableStatement).setObject(2, 1L, Types.NUMERIC);
        verify(callableStatement).setObject(3, 700_000L, Types.NUMERIC);
        assertEquals(84_000L, discount);
    }

    @Test
    @DisplayName("ORA-20001 becomes CustomerNotFoundException and ORA-20002 becomes InvalidDomainDataException")
    void applicationErrorsAreTranslated() throws SQLException {
        SaleCommand command = new SaleCommand("99", ProductCode.of("G-FND-STRAT-01"), 1, MoneyClp.of(800_000));
        when(callableStatement.execute()).thenThrow(new SQLException(
                "ORA-20001: Cliente no encontrado: 99\nORA-06512: at \"SONIDO_VIVO.PKG_SONIDO_VIVO\", line 120",
                "72000",
                20001
        ));

        CustomerNotFoundException notFound =
                assertThrows(CustomerNotFoundException.class, () -> adapter.registerSale(command));
        assertEquals("Cliente no encontrado: 99", notFound.getMessage());
    }

    @Test
    @DisplayName("invalid input error ORA-20002 is reported as InvalidDomainDataException")
    void invalidInputErrorIsTranslated() throws SQLException {
        when(callableStatement.execute()).thenThrow(new SQLException(
                "ORA-20002: Producto, cantidad o precio unitario invalidos\nORA-06512: at line 40",
                "72000",
                20002
        ));

        SaleCommand command = new SaleCommand("1", ProductCode.of("G-FND-STRAT-01"), 1, MoneyClp.of(800_000));

        assertThrows(InvalidDomainDataException.class, () -> adapter.registerSale(command));
    }

    @Test
    @DisplayName("other database failures propagate as the original DataAccessException")
    void otherFailuresPropagate() throws SQLException {
        SaleCommand command = new SaleCommand("1", ProductCode.of("G-FND-STRAT-01"), 1, MoneyClp.of(800_000));
        when(callableStatement.execute()).thenThrow(new SQLException("ORA-01438: value too large", "22003", 1438));

        DataAccessException ex = assertThrows(DataAccessException.class, () -> adapter.registerSale(command));
        assertNotNull(ex.getMostSpecificCause());
        assertSame(SQLException.class, ex.getMostSpecificCause().getClass());
    }

    @Test
    @DisplayName("a non numeric customer id cannot exist in Oracle and fails before any JDBC call")
    void nonNumericCustomerIdFailsFast() {
        SaleCommand command = new SaleCommand("cust-1", ProductCode.of("G-FND-STRAT-01"), 1, MoneyClp.of(800_000));

        assertThrows(CustomerNotFoundException.class, () -> adapter.registerSale(command));
        assertThrows(CustomerNotFoundException.class, () -> adapter.calculateDiscount("cust-1", 500_000L));
        verifyNoInteractions(dataSource);
    }
}
