package cl.duoc.sonidovivo.infrastructure.adapter.in.rest.export;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cl.duoc.sonidovivo.domain.model.CategoryMetric;
import cl.duoc.sonidovivo.domain.model.DashboardMetrics;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DashboardReportExporterTest {

    private final DashboardReportExporter exporter = new DashboardReportExporter();

    @Test
    @DisplayName("CSV export contains UTF-8 BOM, report title, KPIs, header, and RFC 4180 escaped rows")
    void csvExportContainsBomHeadersAndEscapedRows() {
        CategoryMetric cat1 = new CategoryMetric("Cuerdas", 10, 5_000_000L, 500_000.0);
        CategoryMetric cat2 = new CategoryMetric("Audio, Pro & \"Studio\"", 5, 2_500_000L, 500_000.0);
        DashboardMetrics metrics = new DashboardMetrics(7_500_000L, 15, 2, List.of(cat1, cat2));
        Instant generatedAt = Instant.parse("2026-11-22T20:00:00Z");

        byte[] csvBytes = DashboardReportExporter.toCsvBytes(metrics, generatedAt);
        assertThat(csvBytes).isNotNull();

        // Check UTF-8 BOM (0xEF, 0xBB, 0xBF)
        assertThat(csvBytes.length).isGreaterThanOrEqualTo(3);
        assertThat(csvBytes[0]).isEqualTo((byte) 0xEF);
        assertThat(csvBytes[1]).isEqualTo((byte) 0xBB);
        assertThat(csvBytes[2]).isEqualTo((byte) 0xBF);

        String csvText = new String(csvBytes, StandardCharsets.UTF_8);
        assertThat(csvText).startsWith("\uFEFF# Sonido Vivo - Inventory & Sales Metrics Report");
        assertThat(csvText).contains("# Generated At: 2026-11-22T20:00:00Z");
        assertThat(csvText).contains("# Capital Total en Bodega (CLP): 7500000");
        assertThat(csvText).contains("# Unidades Totales: 15");
        assertThat(csvText).contains("# Categorias Activas: 2");
        assertThat(csvText).contains("category,total_units,total_value_clp,average_price_clp");
        assertThat(csvText).contains("Cuerdas,10,5000000,500000.0");
        // Check RFC 4180 escaping: double quotes doubled and whole field wrapped in quotes
        assertThat(csvText).contains("\"Audio, Pro & \"\"Studio\"\"\",5,2500000,500000.0");
    }

    @Test
    @DisplayName("CSV export handles empty category list without failing")
    void csvExportHandlesEmptyCategories() {
        DashboardMetrics metrics = new DashboardMetrics(0L, 0, 0, List.of());
        Instant generatedAt = Instant.parse("2026-11-22T20:00:00Z");

        byte[] csvBytes = exporter.exportToCsv(metrics, generatedAt);
        String csvText = new String(csvBytes, StandardCharsets.UTF_8);

        assertThat(csvText).contains("# Capital Total en Bodega (CLP): 0");
        assertThat(csvText).contains("# Unidades Totales: 0");
        assertThat(csvText).contains("category,total_units,total_value_clp,average_price_clp");
    }

    @Test
    @DisplayName("PDF export creates a valid PDF 1.4 binary document with required structure and metric text")
    void pdfExportCreatesValidPdfBinaryWithMetricText() {
        CategoryMetric cat1 = new CategoryMetric("Cuerdas", 10, 5_000_000L, 500_000.0);
        DashboardMetrics metrics = new DashboardMetrics(5_000_000L, 10, 1, List.of(cat1));
        Instant generatedAt = Instant.parse("2026-11-22T20:00:00Z");

        byte[] pdfBytes = DashboardReportExporter.toPdfBytes(metrics, generatedAt);
        assertThat(pdfBytes).isNotNull();

        String pdfString = new String(pdfBytes, StandardCharsets.US_ASCII);

        // Header check
        assertThat(pdfString).startsWith("%PDF-1.4");

        // EOF marker check
        assertThat(pdfString.trim()).endsWith("%%EOF");

        // Structure check: xref table, trailer, font, and catalog
        assertThat(pdfString).contains("xref\n0 6");
        assertThat(pdfString).contains("trailer\n<< /Size 6 /Root 1 0 R >>");
        assertThat(pdfString).contains("startxref");
        assertThat(pdfString).contains("/BaseFont /Helvetica");

        // Text content check
        assertThat(pdfString).contains("Sonido Vivo - Inventory & Sales Metrics Report");
        assertThat(pdfString).contains("2026-11-22T20:00:00Z");
        assertThat(pdfString).contains("Capital Total en Bodega (CLP): 5000000");
        assertThat(pdfString).contains("Unidades Totales: 10");
        assertThat(pdfString).contains("Categorias Activas: 1");
        assertThat(pdfString).contains("Cuerdas");
    }

    @Test
    @DisplayName("PDF export handles empty categories and instance method call")
    void pdfExportHandlesEmptyCategories() {
        DashboardMetrics metrics = new DashboardMetrics(0L, 0, 0, List.of());
        Instant generatedAt = Instant.parse("2026-11-22T20:00:00Z");

        byte[] pdfBytes = exporter.exportToPdf(metrics, generatedAt);
        String pdfString = new String(pdfBytes, StandardCharsets.US_ASCII);

        assertThat(pdfString).startsWith("%PDF-1.4");
        assertThat(pdfString.trim()).endsWith("%%EOF");
        assertThat(pdfString).contains("Capital Total en Bodega (CLP): 0");
    }

    @Test
    @DisplayName("Exporter methods reject null metrics with IllegalArgumentException")
    void exporterRejectsNullMetrics() {
        assertThatThrownBy(() -> DashboardReportExporter.toCsvBytes(null, Instant.now()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DashboardReportExporter.toPdfBytes(null, Instant.now()))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
