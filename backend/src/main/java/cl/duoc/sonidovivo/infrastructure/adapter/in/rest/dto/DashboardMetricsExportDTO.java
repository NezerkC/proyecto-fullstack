package cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto;

import cl.duoc.sonidovivo.domain.model.DashboardMetrics;
import java.time.Instant;
import java.util.List;

/**
 * Data transfer object representing exported dashboard inventory metrics in JSON format.
 */
public record DashboardMetricsExportDTO(
        Instant generatedAt,
        String format,
        DashboardMetricsResponseDTO.KpisDTO kpis,
        List<DashboardMetricsResponseDTO.CategoriaMetricaDTO> desglosePorCategoria
) {

    public static DashboardMetricsExportDTO fromDomain(
            DashboardMetrics metrics,
            String format,
            Instant generatedAt
    ) {
        DashboardMetricsResponseDTO dto = DashboardMetricsResponseDTO.fromDomain(metrics);
        return new DashboardMetricsExportDTO(
                generatedAt,
                format,
                dto.kpis(),
                dto.desglosePorCategoria()
        );
    }
}
