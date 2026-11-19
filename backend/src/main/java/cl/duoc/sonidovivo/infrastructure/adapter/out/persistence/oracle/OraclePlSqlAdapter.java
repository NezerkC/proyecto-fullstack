package cl.duoc.sonidovivo.infrastructure.adapter.out.persistence.oracle;

import cl.duoc.sonidovivo.domain.exception.CustomerNotFoundException;
import cl.duoc.sonidovivo.domain.exception.InvalidDomainDataException;
import cl.duoc.sonidovivo.domain.model.LiquidationResult;
import cl.duoc.sonidovivo.domain.model.SaleCommand;
import cl.duoc.sonidovivo.domain.model.SaleResult;
import cl.duoc.sonidovivo.domain.port.out.OracleSalesPort;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlOutParameter;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

/**
 * Oracle PL/SQL outbound adapter invoking {@code PKG_SONIDO_VIVO} routines via {@code SimpleJdbcCall}.
 *
 * <p>Parameters are declared explicitly (no database metadata lookup) and bound by position, so their
 * order and types must match the package specification in {@code scripts/oracle/01_pkg_sonido_vivo.sql}.
 * Customer ids are {@code NUMBER} in Oracle while the domain uses {@code String}.</p>
 *
 * <p>Application errors raised by the package are translated: ORA-20001 to
 * {@link CustomerNotFoundException}; ORA-20002 and ORA-20003 to {@link InvalidDomainDataException}.
 * Any other database failure propagates unchanged so that callers (for example the sale compensation in
 * {@code OracleIntegrationService}) still see a {@link RuntimeException}.</p>
 *
 * <p>Responsable asignado: <strong>Danilo Sepúlveda (@Daakhen)</strong></p>
 * <p>Documentación y contrato: {@code docs/ORACLE_PLSQL_INTEGRATION.md}</p>
 */
@Repository
public class OraclePlSqlAdapter implements OracleSalesPort {

    public static final String PACKAGE_NAME = "PKG_SONIDO_VIVO";
    public static final String PROC_REGISTER_SALE = "SP_REGISTRAR_VENTA";
    public static final String PROC_LIQUIDATE_CUSTOMERS = "SP_LIQUIDAR_CLIENTES";
    public static final String FUNC_CALCULATE_DISCOUNT = "FN_CALCULAR_DESCUENTO";

    private static final String P_CUSTOMER_ID = "P_CUSTOMER_ID";
    private static final String P_PRODUCT_CODE = "P_PRODUCT_CODE";
    private static final String P_QUANTITY = "P_QUANTITY";
    private static final String P_UNIT_PRICE = "P_UNIT_PRICE";
    private static final String P_SALE_REFERENCE = "P_SALE_REFERENCE";
    private static final String P_GROSS_TOTAL = "P_GROSS_TOTAL";
    private static final String P_DISCOUNT_CLP = "P_DISCOUNT_CLP";
    private static final String P_NET_TOTAL = "P_NET_TOTAL";
    private static final String P_PROCESS_DATE = "P_PROCESS_DATE";
    private static final String P_PROCESSED_CUSTOMERS = "P_PROCESSED_CUSTOMERS";
    private static final String P_TOTAL_LIQUIDATED = "P_TOTAL_LIQUIDATED";
    private static final String P_STATUS_MESSAGE = "P_STATUS_MESSAGE";
    private static final String P_GROSS_AMOUNT = "P_GROSS_AMOUNT";
    private static final String FUNCTION_RETURN = "RETURN_VALUE";

    private static final int ORA_CUSTOMER_NOT_FOUND = 20001;
    private static final int ORA_INVALID_INPUT = 20002;
    private static final int ORA_PROCESS_DATE_REQUIRED = 20003;

    private final SimpleJdbcCall registerSaleCall;
    private final SimpleJdbcCall liquidateCustomersCall;
    private final SimpleJdbcCall calculateDiscountCall;

    public OraclePlSqlAdapter(JdbcTemplate jdbcTemplate) {
        this.registerSaleCall = new SimpleJdbcCall(jdbcTemplate)
                .withCatalogName(PACKAGE_NAME)
                .withProcedureName(PROC_REGISTER_SALE)
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(P_CUSTOMER_ID, Types.NUMERIC),
                        new SqlParameter(P_PRODUCT_CODE, Types.VARCHAR),
                        new SqlParameter(P_QUANTITY, Types.NUMERIC),
                        new SqlParameter(P_UNIT_PRICE, Types.NUMERIC),
                        new SqlOutParameter(P_SALE_REFERENCE, Types.VARCHAR),
                        new SqlOutParameter(P_GROSS_TOTAL, Types.NUMERIC),
                        new SqlOutParameter(P_DISCOUNT_CLP, Types.NUMERIC),
                        new SqlOutParameter(P_NET_TOTAL, Types.NUMERIC)
                );

        this.liquidateCustomersCall = new SimpleJdbcCall(jdbcTemplate)
                .withCatalogName(PACKAGE_NAME)
                .withProcedureName(PROC_LIQUIDATE_CUSTOMERS)
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(P_PROCESS_DATE, Types.DATE),
                        new SqlOutParameter(P_PROCESSED_CUSTOMERS, Types.NUMERIC),
                        new SqlOutParameter(P_TOTAL_LIQUIDATED, Types.NUMERIC),
                        new SqlOutParameter(P_STATUS_MESSAGE, Types.VARCHAR)
                );

        // Without metadata, the first declared OUT parameter of a function is its return value.
        this.calculateDiscountCall = new SimpleJdbcCall(jdbcTemplate)
                .withCatalogName(PACKAGE_NAME)
                .withFunctionName(FUNC_CALCULATE_DISCOUNT)
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlOutParameter(FUNCTION_RETURN, Types.NUMERIC),
                        new SqlParameter(P_CUSTOMER_ID, Types.NUMERIC),
                        new SqlParameter(P_GROSS_AMOUNT, Types.NUMERIC)
                );
    }

    @Override
    public SaleResult registerSale(SaleCommand command) {
        MapSqlParameterSource in = new MapSqlParameterSource()
                .addValue(P_CUSTOMER_ID, toOracleCustomerId(command.customerId()), Types.NUMERIC)
                .addValue(P_PRODUCT_CODE, command.productCode().value(), Types.VARCHAR)
                .addValue(P_QUANTITY, command.quantity(), Types.NUMERIC)
                .addValue(P_UNIT_PRICE, command.unitPrice().amount(), Types.NUMERIC);

        Map<String, Object> out;
        try {
            out = registerSaleCall.execute(in);
        } catch (DataAccessException ex) {
            throw translate(ex);
        }

        return new SaleResult(
                (String) out.get(P_SALE_REFERENCE),
                command.customerId(),
                command.productCode(),
                command.quantity(),
                asLong(out.get(P_GROSS_TOTAL)),
                asLong(out.get(P_DISCOUNT_CLP)),
                asLong(out.get(P_NET_TOTAL)),
                Instant.now()
        );
    }

    @Override
    public LiquidationResult liquidateCustomers(LocalDate processDate) {
        MapSqlParameterSource in = new MapSqlParameterSource()
                .addValue(P_PROCESS_DATE, java.sql.Date.valueOf(processDate), Types.DATE);

        Map<String, Object> out;
        try {
            out = liquidateCustomersCall.execute(in);
        } catch (DataAccessException ex) {
            throw translate(ex);
        }

        return new LiquidationResult(
                Math.toIntExact(asLong(out.get(P_PROCESSED_CUSTOMERS))),
                asLong(out.get(P_TOTAL_LIQUIDATED)),
                processDate,
                (String) out.get(P_STATUS_MESSAGE)
        );
    }

    @Override
    public long calculateDiscount(String customerId, long grossAmountClp) {
        MapSqlParameterSource in = new MapSqlParameterSource()
                .addValue(P_CUSTOMER_ID, toOracleCustomerId(customerId), Types.NUMERIC)
                .addValue(P_GROSS_AMOUNT, grossAmountClp, Types.NUMERIC);

        try {
            BigDecimal discount = calculateDiscountCall.executeFunction(BigDecimal.class, in);
            return asLong(discount);
        } catch (DataAccessException ex) {
            throw translate(ex);
        }
    }

    private static Long toOracleCustomerId(String customerId) {
        try {
            return Long.valueOf(customerId.trim());
        } catch (NumberFormatException ex) {
            throw new CustomerNotFoundException("Customer not found with id: " + customerId);
        }
    }

    private static long asLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.longValueExact();
        }
        return ((Number) value).longValue();
    }

    private static RuntimeException translate(DataAccessException ex) {
        Throwable root = ex.getMostSpecificCause();
        if (root instanceof SQLException sql) {
            String message = applicationMessage(sql);
            switch (sql.getErrorCode()) {
                case ORA_CUSTOMER_NOT_FOUND:
                    return new CustomerNotFoundException(message);
                case ORA_INVALID_INPUT:
                case ORA_PROCESS_DATE_REQUIRED:
                    return new InvalidDomainDataException(message);
                default:
                    break;
            }
        }
        return ex;
    }

    /** Oracle reports "ORA-20001: text" followed by stack lines ("ORA-06512: ..."); keep only the text. */
    private static String applicationMessage(SQLException sql) {
        String raw = sql.getMessage() == null ? "" : sql.getMessage();
        String firstLine = raw.lines().findFirst().orElse(raw);
        return firstLine.replaceFirst("^ORA-\\d{5}:\\s*", "").trim();
    }
}
