package cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto;

import cl.duoc.sonidovivo.domain.model.SaleResult;
import java.time.Instant;

/**
 * Response DTO for a registered sale; flattens domain value objects into plain JSON values.
 */
public record SaleResponseDTO(
        String saleReference,
        String customerId,
        String productCode,
        int quantity,
        long grossTotalClp,
        long discountClp,
        long netTotalClp,
        Instant registeredAt
) {

    public static SaleResponseDTO fromDomain(SaleResult result) {
        return new SaleResponseDTO(
                result.saleReference(),
                result.customerId(),
                result.productCode().value(),
                result.quantity(),
                result.grossTotalClp(),
                result.discountClp(),
                result.netTotalClp(),
                result.registeredAt()
        );
    }
}
