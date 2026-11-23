package cl.duoc.sonidovivo.infrastructure.adapter.in.rest.export;

import cl.duoc.sonidovivo.domain.model.CategoryMetric;
import cl.duoc.sonidovivo.domain.model.DashboardMetrics;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Pure Java, low-memory exporter generating CSV and minimal valid PDF 1.4 binary documents
 * for dashboard inventory metrics.
 */
public class DashboardReportExporter {

    private static final String CSV_BOM = "\uFEFF";
    private static final String REPORT_TITLE = "Sonido Vivo - Inventory & Sales Metrics Report";

    public DashboardReportExporter() {
    }

    /**
     * Exports dashboard metrics to CSV format encoded in UTF-8 with BOM for Excel compatibility.
     * Includes KPI summary lines and RFC 4180 escaped category breakdown.
     */
    public static byte[] toCsvBytes(DashboardMetrics metrics, Instant generatedAt) {
        if (metrics == null) {
            throw new IllegalArgumentException("Dashboard metrics must not be null");
        }
        Instant effectiveGeneratedAt = generatedAt != null ? generatedAt : Instant.now();

        StringBuilder sb = new StringBuilder();
        sb.append(CSV_BOM);
        sb.append("# ").append(REPORT_TITLE).append("\r\n");
        sb.append("# Generated At: ").append(effectiveGeneratedAt).append("\r\n");
        sb.append("# Capital Total en Bodega (CLP): ").append(metrics.totalWarehouseValueClp()).append("\r\n");
        sb.append("# Unidades Totales: ").append(metrics.totalUnits()).append("\r\n");
        sb.append("# Categorias Activas: ").append(metrics.activeCategories()).append("\r\n");
        sb.append("category,total_units,total_value_clp,average_price_clp\r\n");

        for (CategoryMetric category : metrics.categories()) {
            sb.append(escapeCsv(category.category())).append(",")
                    .append(category.totalUnits()).append(",")
                    .append(category.totalValueClp()).append(",")
                    .append(category.averagePrice()).append("\r\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Exports dashboard metrics to a valid standalone PDF 1.4 binary document with Helvetica font,
     * cross-reference table offsets, trailer, and %%EOF marker.
     */
    public static byte[] toPdfBytes(DashboardMetrics metrics, Instant generatedAt) {
        if (metrics == null) {
            throw new IllegalArgumentException("Dashboard metrics must not be null");
        }
        Instant effectiveGeneratedAt = generatedAt != null ? generatedAt : Instant.now();

        String streamText = buildPdfContentStream(metrics, effectiveGeneratedAt);
        byte[] contentBytes = streamText.getBytes(StandardCharsets.US_ASCII);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            List<Long> offsets = new ArrayList<>();
            offsets.add(0L); // Object 0 is always the free head in xref

            // PDF 1.4 Header with binary comment marker
            writeAscii(out, "%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n");

            // Object 1: Catalog
            offsets.add((long) out.size());
            writeAscii(out, "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

            // Object 2: Pages tree
            offsets.add((long) out.size());
            writeAscii(out, "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

            // Object 3: Page (Letter size: 612 x 792 pt)
            offsets.add((long) out.size());
            writeAscii(out, "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R "
                    + "/Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n");

            // Object 4: Standard Helvetica font dictionary
            offsets.add((long) out.size());
            writeAscii(out, "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

            // Object 5: Page content stream
            offsets.add((long) out.size());
            writeAscii(out, "5 0 obj\n<< /Length " + contentBytes.length + " >>\nstream\n");
            out.write(contentBytes);
            writeAscii(out, "\nendstream\nendobj\n");

            // Cross-reference table (each entry exactly 20 bytes: 10 + 1 + 5 + 1 + 1 + 1 + 1)
            long startXref = out.size();
            writeAscii(out, "xref\n0 6\n");
            writeAscii(out, "0000000000 65535 f \n");
            for (int i = 1; i <= 5; i++) {
                writeAscii(out, String.format(Locale.ROOT, "%010d 00000 n \n", offsets.get(i)));
            }

            // Trailer & EOF marker
            writeAscii(out, "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + startXref + "\n%%EOF\n");
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate PDF document", e);
        }

        return out.toByteArray();
    }

    public byte[] exportToCsv(DashboardMetrics metrics, Instant generatedAt) {
        return toCsvBytes(metrics, generatedAt);
    }

    public byte[] exportToPdf(DashboardMetrics metrics, Instant generatedAt) {
        return toPdfBytes(metrics, generatedAt);
    }

    private static String buildPdfContentStream(DashboardMetrics metrics, Instant generatedAt) {
        StringBuilder sb = new StringBuilder();
        sb.append("BT\n");
        sb.append("/F1 15 Tf\n");
        sb.append("50 740 Td\n");
        sb.append("(").append(sanitizePdfText(REPORT_TITLE)).append(") Tj\n");

        sb.append("/F1 10 Tf\n");
        sb.append("0 -22 Td\n");
        sb.append("(Generated At: ").append(sanitizePdfText(generatedAt.toString())).append(") Tj\n");

        sb.append("0 -16 Td\n");
        sb.append("(Capital Total en Bodega (CLP): ").append(metrics.totalWarehouseValueClp()).append(") Tj\n");

        sb.append("0 -14 Td\n");
        sb.append("(Unidades Totales: ").append(metrics.totalUnits()).append(") Tj\n");

        sb.append("0 -14 Td\n");
        sb.append("(Categorias Activas: ").append(metrics.activeCategories()).append(") Tj\n");

        sb.append("0 -24 Td\n");
        String tableHeader = String.format(Locale.ROOT, "%-24s %-12s %-18s %-14s",
                "Category", "Units", "Total Value (CLP)", "Avg Price");
        sb.append("(").append(sanitizePdfText(tableHeader)).append(") Tj\n");

        sb.append("0 -10 Td\n");
        sb.append("(----------------------------------------------------------------------) Tj\n");

        for (CategoryMetric category : metrics.categories()) {
            sb.append("0 -14 Td\n");
            String catName = category.category();
            if (catName.length() > 22) {
                catName = catName.substring(0, 19) + "...";
            }
            String row = String.format(Locale.ROOT, "%-24s %-12d %-18d %-14.2f",
                    catName, category.totalUnits(), category.totalValueClp(), category.averagePrice());
            sb.append("(").append(sanitizePdfText(row)).append(") Tj\n");
        }

        sb.append("ET");
        return sb.toString();
    }

    private static String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private static String sanitizePdfText(String text) {
        if (text == null) {
            return "";
        }
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        StringBuilder sb = new StringBuilder();
        for (char c : normalized.toCharArray()) {
            if (c == '\\' || c == '(' || c == ')') {
                sb.append('\\').append(c);
            } else if (c >= 32 && c <= 126) {
                sb.append(c);
            } else {
                sb.append('?');
            }
        }
        return sb.toString();
    }

    private static void writeAscii(ByteArrayOutputStream out, String text) throws IOException {
        out.write(text.getBytes(StandardCharsets.US_ASCII));
    }
}
