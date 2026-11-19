package cl.duoc.sonidovivo.infrastructure.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.duoc.sonidovivo.application.port.in.CustomerUseCase;
import cl.duoc.sonidovivo.application.port.in.DashboardUseCase;
import cl.duoc.sonidovivo.application.port.in.DashboardUseCase.BatchPriceAdjustmentCommand;
import cl.duoc.sonidovivo.application.port.in.DashboardUseCase.BatchPriceAdjustmentResult;
import cl.duoc.sonidovivo.application.port.in.OracleIntegrationUseCase;
import cl.duoc.sonidovivo.application.port.in.ProductUseCase;
import cl.duoc.sonidovivo.application.port.in.ProductUseCase.CreateProductCommand;
import cl.duoc.sonidovivo.domain.exception.CustomerNotFoundException;
import cl.duoc.sonidovivo.domain.exception.DuplicateProductCodeException;
import cl.duoc.sonidovivo.domain.exception.InsufficientStockException;
import cl.duoc.sonidovivo.domain.exception.ProductNotFoundException;
import cl.duoc.sonidovivo.domain.model.Category;
import cl.duoc.sonidovivo.domain.model.CategoryMetric;
import cl.duoc.sonidovivo.domain.model.Customer;
import cl.duoc.sonidovivo.domain.model.DashboardMetrics;
import cl.duoc.sonidovivo.domain.model.EmailAddress;
import cl.duoc.sonidovivo.domain.model.LiquidationResult;
import cl.duoc.sonidovivo.domain.model.MoneyClp;
import cl.duoc.sonidovivo.domain.model.Product;
import cl.duoc.sonidovivo.domain.model.ProductCode;
import cl.duoc.sonidovivo.domain.model.ProductStatus;
import cl.duoc.sonidovivo.domain.model.Review;
import cl.duoc.sonidovivo.domain.model.SaleCommand;
import cl.duoc.sonidovivo.domain.model.SaleResult;
import cl.duoc.sonidovivo.domain.model.StockQuantity;
import cl.duoc.sonidovivo.infrastructure.config.CorsConfig;
import cl.duoc.sonidovivo.infrastructure.config.JwtAuthenticationFilter;
import cl.duoc.sonidovivo.infrastructure.config.JwtService;
import cl.duoc.sonidovivo.infrastructure.config.SecurityConfig;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Web-layer tests for T06 (JWT security, ROLE_ADMIN, CORS) and T07 (REST controllers and global error mapping).
 * Use cases are mocked, so no MongoDB or Oracle instance is required.
 */
@WebMvcTest
@Import({SecurityConfig.class, JwtService.class, JwtAuthenticationFilter.class, CorsConfig.class,
        GlobalExceptionHandler.class})
@TestPropertySource(properties = {
        "app.security.admin-username=admin",
        "app.security.admin-password=S3cret-test-pass"
})
class AdminApiWebTest {

    private static final String ALLOWED_ORIGIN = "http://localhost:5173";
    private static final String VALID_CODE = "G-FND-STRAT-01";

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private ProductUseCase productUseCase;
    @MockitoBean
    private CustomerUseCase customerUseCase;
    @MockitoBean
    private DashboardUseCase dashboardUseCase;
    @MockitoBean
    private OracleIntegrationUseCase oracleIntegrationUseCase;

    // ---------------------------------------------------------------- helpers

    private String adminToken() {
        return jwtService.generateToken("admin", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private String bearer() {
        return "Bearer " + adminToken();
    }

    private static Product sampleProduct() {
        return Product.create(
                ProductCode.of(VALID_CODE),
                "Fender Stratocaster",
                Category.CUERDAS,
                MoneyClp.of(899_990),
                StockQuantity.of(5),
                Map.of("marca", "Fender"),
                List.of("guitarra")
        );
    }

    private static Customer sampleCustomer() {
        return Customer.reconstitute(
                "7", "12.345.678-5", "Ana", "Perez",
                EmailAddress.of("ana@correo.cl"), "+56911112222", "Santiago", "Metropolitana"
        );
    }

    private static final String CUSTOMER_JSON = """
            {"rut":"12.345.678-5","firstName":"Ana","lastName":"Perez","email":"ana@correo.cl",
             "phone":"+56911112222","commune":"Santiago","region":"Metropolitana"}""";

    private static final String PRODUCT_JSON = """
            {"codigo":"G-FND-STRAT-01","nombre":"Fender Stratocaster","categoria":"Cuerdas",
             "precioClp":899990,"stockDisponible":5,"especificaciones":{"marca":"Fender"},"tags":["guitarra"]}""";

    // ============================================================ T06: login

    @Test
    void loginWithValidCredentialsReturnsBearerToken() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"S3cret-test-pass\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.expiresInMs").value(3_600_000));
    }

    @Test
    void loginWithWrongPasswordReturns401WithStandardError() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.path").value("/api/v1/auth/login"));
    }

    @Test
    void loginWithBlankFieldsReturns400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.username").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    // ============================================================ T06: JWT filter and ROLE_ADMIN

    @Test
    void adminRouteWithoutTokenReturns401() throws Exception {
        mvc.perform(get("/api/v1/admin/customers"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void adminRouteWithGarbageTokenReturns401() throws Exception {
        mvc.perform(get("/api/v1/admin/customers").header(HttpHeaders.AUTHORIZATION, "Bearer not.a.jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminRouteWithTokenSignedByAnotherKeyReturns401() throws Exception {
        String forged = new JwtService("another-hmac-sha256-secret-key-minimum-32-bytes!!", 60_000)
                .generateToken("admin", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        mvc.perform(get("/api/v1/admin/customers").header(HttpHeaders.AUTHORIZATION, "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminRouteWithTokenOfUnknownUserReturns401() throws Exception {
        String token = jwtService.generateToken("ghost", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        mvc.perform(get("/api/v1/admin/customers").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminRouteWithValidTokenIsAllowed() throws Exception {
        when(customerUseCase.listCustomers()).thenReturn(List.of());

        mvc.perform(get("/api/v1/admin/customers").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk());
    }

    @Test
    void tokenInQueryStringIsNotAccepted() throws Exception {
        mvc.perform(get("/api/v1/admin/customers").queryParam("token", adminToken()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anyNonPublicRouteRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/v1/something-else")).andExpect(status().isUnauthorized());
    }

    // ============================================================ T06: CORS

    @Test
    void preflightFromAllowedOriginIsAccepted() throws Exception {
        mvc.perform(options("/api/v1/admin/products")
                        .header(HttpHeaders.ORIGIN, ALLOWED_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ALLOWED_ORIGIN))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    void preflightFromUnknownOriginIsRejected() throws Exception {
        mvc.perform(options("/api/v1/admin/products")
                        .header(HttpHeaders.ORIGIN, "http://evil.example.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    // ============================================================ T07: products

    @Test
    void listProductsMapsFiltersAndContractFieldNames() throws Exception {
        when(productUseCase.listProductsPaged(1, 5, Category.CUERDAS, ProductStatus.ACTIVO))
                .thenReturn(List.of(sampleProduct()));

        mvc.perform(get("/api/v1/admin/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("page", "1").param("size", "5")
                        .param("categoria", "Cuerdas").param("estado", "activo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].codigo").value(VALID_CODE))
                .andExpect(jsonPath("$[0].categoria").value("Cuerdas"))
                .andExpect(jsonPath("$[0].precio_clp").value(899_990))
                .andExpect(jsonPath("$[0].stock_disponible").value(5))
                .andExpect(jsonPath("$[0].estado").value("ACTIVO"));
    }

    @Test
    void listProductsUsesContractDefaults() throws Exception {
        when(productUseCase.listProductsPaged(0, 10, null, null)).thenReturn(List.of());

        mvc.perform(get("/api/v1/admin/products").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        verify(productUseCase).listProductsPaged(0, 10, null, null);
    }

    @Test
    void listProductsWithUnknownCategoryReturns400() throws Exception {
        mvc.perform(get("/api/v1/admin/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer()).param("categoria", "Muebles"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void searchPassesTextCategoryAndDynamicSpecFilters() throws Exception {
        when(productUseCase.searchProducts(any(), any(), any())).thenReturn(List.of(sampleProduct()));

        mvc.perform(get("/api/v1/admin/products/search")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("q", "strat").param("categoria", "Cuerdas").param("marca", "Fender"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].codigo").value(VALID_CODE));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> filters = ArgumentCaptor.forClass(Map.class);
        verify(productUseCase).searchProducts(eq("strat"), eq(Category.CUERDAS), filters.capture());
        assertThat(filters.getValue()).containsExactly(Map.entry("marca", "Fender"));
    }

    @Test
    void getProductReturnsItAndUnknownCodeReturns404() throws Exception {
        when(productUseCase.getProductByCode(ProductCode.of(VALID_CODE))).thenReturn(sampleProduct());
        when(productUseCase.getProductByCode(ProductCode.of("G-XXX-NONE-99")))
                .thenThrow(new ProductNotFoundException("Product not found with code: G-XXX-NONE-99"));

        mvc.perform(get("/api/v1/admin/products/" + VALID_CODE).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Fender Stratocaster"));
        mvc.perform(get("/api/v1/admin/products/G-XXX-NONE-99").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found with code: G-XXX-NONE-99"));
    }

    @Test
    void getProductWithMalformedCodeReturns400() throws Exception {
        mvc.perform(get("/api/v1/admin/products/not-a-code").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createProductReturns201WithLocationAndBuildsDomainCommand() throws Exception {
        when(productUseCase.createProduct(any())).thenReturn(sampleProduct());

        mvc.perform(post("/api/v1/admin/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(PRODUCT_JSON))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, "/api/v1/admin/products/" + VALID_CODE))
                .andExpect(jsonPath("$.codigo").value(VALID_CODE));

        ArgumentCaptor<CreateProductCommand> captor = ArgumentCaptor.forClass(CreateProductCommand.class);
        verify(productUseCase).createProduct(captor.capture());
        CreateProductCommand command = captor.getValue();
        assertThat(command.code().value()).isEqualTo(VALID_CODE);
        assertThat(command.category()).isEqualTo(Category.CUERDAS);
        assertThat(command.price().amount()).isEqualTo(899_990);
        assertThat(command.stock().value()).isEqualTo(5);
    }

    @Test
    void createProductAcceptsSnakeCaseAliasesFromTheContract() throws Exception {
        when(productUseCase.createProduct(any())).thenReturn(sampleProduct());

        mvc.perform(post("/api/v1/admin/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"codigo":"G-FND-STRAT-01","nombre":"Fender Stratocaster","categoria":"Cuerdas",
                                 "precio_clp":899990,"stock_disponible":5}"""))
                .andExpect(status().isCreated());
    }

    @Test
    void createProductWithInvalidBodyReturns400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/admin/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"codigo":"bad","nombre":"x","categoria":"Muebles","precioClp":10,"stockDisponible":-1}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.codigo").exists())
                .andExpect(jsonPath("$.fieldErrors.nombre").exists())
                .andExpect(jsonPath("$.fieldErrors.categoria").exists())
                .andExpect(jsonPath("$.fieldErrors.precioClp").exists())
                .andExpect(jsonPath("$.fieldErrors.stockDisponible").exists());
    }

    @Test
    void createProductWithDuplicateCodeReturns409() throws Exception {
        when(productUseCase.createProduct(any()))
                .thenThrow(new DuplicateProductCodeException("Product code already exists: " + VALID_CODE));

        mvc.perform(post("/api/v1/admin/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(PRODUCT_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void updateProductReturnsUpdatedResource() throws Exception {
        when(productUseCase.updateProduct(eq(ProductCode.of(VALID_CODE)), any())).thenReturn(sampleProduct());

        mvc.perform(put("/api/v1/admin/products/" + VALID_CODE)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Fender Stratocaster","categoria":"Cuerdas","precioClp":899990,
                                 "stockDisponible":5}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigo").value(VALID_CODE));
    }

    @Test
    void updateStatusAcceptsOnlyKnownStatuses() throws Exception {
        when(productUseCase.changeStatus(ProductCode.of(VALID_CODE), ProductStatus.AGOTADO))
                .thenReturn(sampleProduct());

        mvc.perform(patch("/api/v1/admin/products/" + VALID_CODE + "/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"AGOTADO\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/v1/admin/products/" + VALID_CODE + "/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"ROTO\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.estado").exists());
    }

    @Test
    void adjustStockWithPatchFollowsTheContract() throws Exception {
        when(productUseCase.adjustStockAtomic(ProductCode.of(VALID_CODE), -2, "MERMA_AVERIA"))
                .thenReturn(sampleProduct());

        mvc.perform(patch("/api/v1/admin/products/" + VALID_CODE + "/stock")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"delta\":-2,\"motivo\":\"MERMA_AVERIA\"}"))
                .andExpect(status().isOk());
        verify(productUseCase).adjustStockAtomic(ProductCode.of(VALID_CODE), -2, "MERMA_AVERIA");
    }

    @Test
    void adjustStockKeepsPostAliasFromTheOriginalScaffold() throws Exception {
        when(productUseCase.adjustStockAtomic(ProductCode.of(VALID_CODE), 3, "INGRESO_PROVEEDOR"))
                .thenReturn(sampleProduct());

        mvc.perform(post("/api/v1/admin/products/" + VALID_CODE + "/stock")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"delta\":3,\"motivo\":\"INGRESO_PROVEEDOR\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void adjustStockBeyondAvailableReturns409AndInvalidReasonReturns400() throws Exception {
        when(productUseCase.adjustStockAtomic(any(), eq(-99), any()))
                .thenThrow(new InsufficientStockException("Insufficient stock"));

        mvc.perform(patch("/api/v1/admin/products/" + VALID_CODE + "/stock")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"delta\":-99,\"motivo\":\"MERMA_AVERIA\"}"))
                .andExpect(status().isConflict());
        mvc.perform(patch("/api/v1/admin/products/" + VALID_CODE + "/stock")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"delta\":1,\"motivo\":\"PORQUE_SI\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.motivo").exists());
    }

    @Test
    void addReviewBuildsDomainReview() throws Exception {
        when(productUseCase.addReview(eq(ProductCode.of(VALID_CODE)), any())).thenReturn(sampleProduct());

        mvc.perform(post("/api/v1/admin/products/" + VALID_CODE + "/reviews")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cliente\":\"Ana\",\"calificacion\":5,\"comentario\":\"Excelente\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<Review> review = ArgumentCaptor.forClass(Review.class);
        verify(productUseCase).addReview(eq(ProductCode.of(VALID_CODE)), review.capture());
        assertThat(review.getValue().rating()).isEqualTo(5);
        assertThat(review.getValue().customer()).isEqualTo("Ana");
    }

    @Test
    void addReviewWithRatingOutOfRangeReturns400() throws Exception {
        mvc.perform(post("/api/v1/admin/products/" + VALID_CODE + "/reviews")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cliente\":\"Ana\",\"calificacion\":9}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.calificacion").exists());
    }

    @Test
    void deleteProductIsALogicalDiscontinuation() throws Exception {
        when(productUseCase.changeStatus(any(), any())).thenReturn(sampleProduct());

        mvc.perform(delete("/api/v1/admin/products/" + VALID_CODE).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isNoContent());
        verify(productUseCase).changeStatus(ProductCode.of(VALID_CODE), ProductStatus.DESCONTINUADO);
    }

    // ============================================================ T07: customers

    @Test
    void listAndGetCustomers() throws Exception {
        when(customerUseCase.listCustomers()).thenReturn(List.of(sampleCustomer()));
        when(customerUseCase.getCustomerById("7")).thenReturn(sampleCustomer());
        when(customerUseCase.getCustomerById("99"))
                .thenThrow(new CustomerNotFoundException("Customer not found with id: 99"));

        mvc.perform(get("/api/v1/admin/customers").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fullName").value("Ana Perez"))
                .andExpect(jsonPath("$[0].email").value("ana@correo.cl"));
        mvc.perform(get("/api/v1/admin/customers/7").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("7"));
        mvc.perform(get("/api/v1/admin/customers/99").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isNotFound());
    }

    @Test
    void registerCustomerReturns201WithLocation() throws Exception {
        when(customerUseCase.registerCustomer(any())).thenReturn(sampleCustomer());

        mvc.perform(post("/api/v1/admin/customers")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(CUSTOMER_JSON))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, "/api/v1/admin/customers/7"))
                .andExpect(jsonPath("$.rut").value("12.345.678-5"));
    }

    @Test
    void registerCustomerWithInvalidRutAndEmailReturns400() throws Exception {
        mvc.perform(post("/api/v1/admin/customers")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"rut":"123","firstName":"Ana","lastName":"Perez","email":"no-es-email",
                                 "phone":"+56911112222","commune":"Santiago","region":"Metropolitana"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.rut").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists());
    }

    @Test
    void updateCustomerReturnsUpdatedProfile() throws Exception {
        when(customerUseCase.updateCustomer(eq("7"), any())).thenReturn(sampleCustomer());

        mvc.perform(put("/api/v1/admin/customers/7")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(CUSTOMER_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Ana"));
    }

    // ============================================================ T07: dashboard and operations

    @Test
    void metricsMatchTheContractShape() throws Exception {
        when(dashboardUseCase.getInventoryMetrics()).thenReturn(
                DashboardMetrics.fromCategories(List.of(new CategoryMetric("Cuerdas", 10, 5_000_000L, 500_000.0))));

        mvc.perform(get("/api/v1/admin/dashboard/metrics").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kpis.capitalTotalEnBodega").value(5_000_000))
                .andExpect(jsonPath("$.kpis.unidadesTotales").value(10))
                .andExpect(jsonPath("$.kpis.categoriasActivas").value(1))
                .andExpect(jsonPath("$.desglosePorCategoria[0].total_unidades").value(10))
                .andExpect(jsonPath("$.desglosePorCategoria[0].valor_total_inventario").value(5_000_000))
                .andExpect(jsonPath("$.desglosePorCategoria[0].precio_promedio").value(500_000.0));
    }

    @Test
    void priceAdjustmentWithoutCategoryAppliesToWholeInventory() throws Exception {
        when(dashboardUseCase.applyBatchPriceAdjustment(any()))
                .thenReturn(new BatchPriceAdjustmentResult(12, 10.0, null, "Alza proveedor"));

        mvc.perform(post("/api/v1/admin/operations/price-adjustment")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"porcentaje\":10,\"motivo\":\"Alza proveedor\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedCount").value(12))
                .andExpect(jsonPath("$.targetCategory").isEmpty());

        ArgumentCaptor<BatchPriceAdjustmentCommand> captor =
                ArgumentCaptor.forClass(BatchPriceAdjustmentCommand.class);
        verify(dashboardUseCase).applyBatchPriceAdjustment(captor.capture());
        assertThat(captor.getValue().category()).isNull();
        assertThat(captor.getValue().percentage()).isEqualTo(10.0);
    }

    @Test
    void priceAdjustmentWithCategoryAndOutOfRangePercentage() throws Exception {
        when(dashboardUseCase.applyBatchPriceAdjustment(any()))
                .thenReturn(new BatchPriceAdjustmentResult(3, -5.0, Category.AUDIO_PRO, "Liquidación"));

        mvc.perform(post("/api/v1/admin/operations/price-adjustment")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"porcentaje\":-5,\"categoria\":\"Audio Pro\",\"motivo\":\"Liquidación\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetCategory").value("Audio Pro"));
        mvc.perform(post("/api/v1/admin/operations/price-adjustment")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"porcentaje\":-80,\"motivo\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.porcentaje").exists());
    }

    @Test
    void registerSaleReturns201WithFlatResponse() throws Exception {
        when(oracleIntegrationUseCase.registerSale(any())).thenReturn(new SaleResult(
                "BOL-5001", "1", ProductCode.of(VALID_CODE), 2, 1_000_000L, 0L, 1_000_000L, Instant.now()));

        mvc.perform(post("/api/v1/admin/operations/sales")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":"1","productCode":"G-FND-STRAT-01","quantity":2,"unitPriceClp":500000}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.saleReference").value("BOL-5001"))
                .andExpect(jsonPath("$.productCode").value(VALID_CODE))
                .andExpect(jsonPath("$.netTotalClp").value(1_000_000));

        ArgumentCaptor<SaleCommand> captor = ArgumentCaptor.forClass(SaleCommand.class);
        verify(oracleIntegrationUseCase).registerSale(captor.capture());
        assertThat(captor.getValue().grossTotalClp()).isEqualTo(1_000_000L);
    }

    @Test
    void registerSaleWithInvalidBodyReturns400() throws Exception {
        mvc.perform(post("/api/v1/admin/operations/sales")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\":\"\",\"productCode\":\"x\",\"quantity\":0,\"unitPriceClp\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.customerId").exists())
                .andExpect(jsonPath("$.fieldErrors.quantity").exists());
    }

    @Test
    void liquidationParsesIsoDateAndDefaultsToToday() throws Exception {
        when(oracleIntegrationUseCase.runCustomerLiquidation(any())).thenAnswer(inv ->
                new LiquidationResult(5, 683_725L, inv.getArgument(0), "OK"));

        mvc.perform(post("/api/v1/admin/operations/liquidations")
                        .header(HttpHeaders.AUTHORIZATION, bearer()).param("processDate", "2026-01-05"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processDate").value("2026-01-05"))
                .andExpect(jsonPath("$.processedCustomers").value(5));
        verify(oracleIntegrationUseCase).runCustomerLiquidation(LocalDate.of(2026, 1, 5));

        mvc.perform(post("/api/v1/admin/operations/liquidations").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk());
        verify(oracleIntegrationUseCase).runCustomerLiquidation(LocalDate.now());
    }

    @Test
    void liquidationWithInvalidDateReturns400() throws Exception {
        mvc.perform(post("/api/v1/admin/operations/liquidations")
                        .header(HttpHeaders.AUTHORIZATION, bearer()).param("processDate", "18/11/2026"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid value for parameter 'processDate'"));
    }

    @Test
    void discountReturnsAmountAndRequiresParameters() throws Exception {
        when(oracleIntegrationUseCase.calculateDiscount("1", 700_000L)).thenReturn(35_000L);

        mvc.perform(get("/api/v1/admin/operations/discount")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("customerId", "1").param("grossAmountClp", "700000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.discountClp").value(35_000));
        mvc.perform(get("/api/v1/admin/operations/discount")
                        .header(HttpHeaders.AUTHORIZATION, bearer()).param("customerId", "1"))
                .andExpect(status().isBadRequest());
    }

    // ============================================================ T07: global error mapping

    @Test
    void malformedJsonReturns400WithoutLeakingParserDetails() throws Exception {
        mvc.perform(post("/api/v1/admin/customers")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{ this is not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed or unreadable request body"));
    }

    @Test
    void unsupportedHttpMethodReturns405() throws Exception {
        mvc.perform(delete("/api/v1/admin/customers/7").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
    }

    @Test
    void unsupportedMediaTypeReturns415() throws Exception {
        mvc.perform(post("/api/v1/admin/customers")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.TEXT_PLAIN).content("hola"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415));
    }

    @Test
    void unknownRouteUnderAdminReturns404NotA500() throws Exception {
        mvc.perform(get("/api/v1/admin/does-not-exist").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void unexpectedFailureReturnsGeneric500WithoutInternalDetails() throws Exception {
        when(customerUseCase.listCustomers()).thenThrow(new IllegalStateException("db password is hunter2"));

        mvc.perform(get("/api/v1/admin/customers").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("An unexpected internal error occurred"));
    }

    @Test
    void errorPayloadAlwaysCarriesTheStandardFields() throws Exception {
        when(productUseCase.getProductByCode(ProductCode.of("G-XXX-NONE-99")))
                .thenThrow(new ProductNotFoundException("Product not found with code: G-XXX-NONE-99"));

        mvc.perform(get("/api/v1/admin/products/G-XXX-NONE-99").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.path").value("/api/v1/admin/products/G-XXX-NONE-99"));
    }
}
