package cl.duoc.sonidovivo.infrastructure.adapter.in.rest;

import cl.duoc.sonidovivo.application.port.in.DashboardUseCase;
import cl.duoc.sonidovivo.application.port.in.DashboardUseCase.BatchPriceAdjustmentCommand;
import cl.duoc.sonidovivo.application.port.in.DashboardUseCase.BatchPriceAdjustmentResult;
import cl.duoc.sonidovivo.application.port.in.OracleIntegrationUseCase;
import cl.duoc.sonidovivo.domain.exception.InvalidDomainDataException;
import cl.duoc.sonidovivo.domain.model.Category;
import cl.duoc.sonidovivo.domain.model.DashboardMetrics;
import cl.duoc.sonidovivo.domain.model.LiquidationResult;
import cl.duoc.sonidovivo.domain.model.MoneyClp;
import cl.duoc.sonidovivo.domain.model.ProductCode;
import cl.duoc.sonidovivo.domain.model.SaleCommand;
import cl.duoc.sonidovivo.domain.model.SaleResult;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.BatchPriceAdjustmentResponseDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.DashboardMetricsExportDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.DashboardMetricsResponseDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.PriceAdjustmentDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.SaleRequestDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.SaleResponseDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.export.DashboardReportExporter;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Inbound REST controller serving dashboard KPIs, batch pricing operations, and Oracle PL/SQL endpoints.
 *
 * <p>Responsable asignado: <strong>Dylan Sandoval (@dysandoval)</strong></p>
 * <p>Documentación y contrato: {@code docs/contracts/CONTRACT_FULLSTACK_REST.md}</p>
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminDashboardController {

    private final DashboardUseCase dashboardUseCase;
    private final OracleIntegrationUseCase oracleIntegrationUseCase;

    public AdminDashboardController(
            DashboardUseCase dashboardUseCase,
            OracleIntegrationUseCase oracleIntegrationUseCase
    ) {
        this.dashboardUseCase = dashboardUseCase;
        this.oracleIntegrationUseCase = oracleIntegrationUseCase;
    }

    @GetMapping("/dashboard/metrics")
    public ResponseEntity<DashboardMetricsResponseDTO> getMetrics() {
        return ResponseEntity.ok(
                DashboardMetricsResponseDTO.fromDomain(dashboardUseCase.getInventoryMetrics())
        );
    }

    @GetMapping("/dashboard/export")
    public ResponseEntity<?> exportMetrics(@RequestParam(defaultValue = "csv") String format) {
        String normalizedFormat = (format == null) ? "csv" : format.trim().toLowerCase(Locale.ROOT);
        DashboardMetrics metrics = dashboardUseCase.getInventoryMetrics();
        Instant generatedAt = Instant.now();

        return switch (normalizedFormat) {
            case "csv" -> {
                byte[] csvBytes = DashboardReportExporter.toCsvBytes(metrics, generatedAt);
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
                headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sonidovivo-metrics.csv\"");
                yield new ResponseEntity<>(csvBytes, headers, HttpStatus.OK);
            }
            case "pdf" -> {
                byte[] pdfBytes = DashboardReportExporter.toPdfBytes(metrics, generatedAt);
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sonidovivo-metrics.pdf\"");
                yield new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
            }
            case "json" -> {
                DashboardMetricsExportDTO dto = DashboardMetricsExportDTO.fromDomain(metrics, normalizedFormat, generatedAt);
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sonidovivo-metrics.json\"");
                yield new ResponseEntity<>(dto, headers, HttpStatus.OK);
            }
            default -> throw new InvalidDomainDataException(
                    "Unsupported export format: " + format + ". Supported formats: csv, pdf, json"
            );
        };
    }

    @PostMapping("/operations/price-adjustment")
    public ResponseEntity<BatchPriceAdjustmentResponseDTO> applyPriceAdjustment(
            @Valid @RequestBody PriceAdjustmentDTO request
    ) {
        Category category = (request.categoria() == null || request.categoria().isBlank())
                ? null
                : Category.fromString(request.categoria());

        BatchPriceAdjustmentResult result = dashboardUseCase.applyBatchPriceAdjustment(
                new BatchPriceAdjustmentCommand(request.porcentaje(), category, request.motivo())
        );
        return ResponseEntity.ok(BatchPriceAdjustmentResponseDTO.fromResult(result));
    }

    @PostMapping("/operations/sales")
    public ResponseEntity<SaleResponseDTO> registerSale(@Valid @RequestBody SaleRequestDTO request) {
        SaleCommand command = new SaleCommand(
                request.customerId(),
                ProductCode.of(request.productCode()),
                request.quantity(),
                MoneyClp.of(request.unitPriceClp())
        );
        SaleResult result = oracleIntegrationUseCase.registerSale(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(SaleResponseDTO.fromDomain(result));
    }

    @PostMapping("/operations/liquidations")
    public ResponseEntity<LiquidationResult> runCustomerLiquidation(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate processDate
    ) {
        LocalDate effectiveDate = processDate != null ? processDate : LocalDate.now();
        return ResponseEntity.ok(oracleIntegrationUseCase.runCustomerLiquidation(effectiveDate));
    }

    @GetMapping("/operations/discount")
    public ResponseEntity<Map<String, Long>> calculateDiscount(
            @RequestParam String customerId,
            @RequestParam long grossAmountClp
    ) {
        long discountClp = oracleIntegrationUseCase.calculateDiscount(customerId, grossAmountClp);
        return ResponseEntity.ok(Map.of("discountClp", discountClp));
    }
}
