package cl.duoc.sonidovivo.infrastructure.adapter.in.rest;

import cl.duoc.sonidovivo.application.port.in.OracleIntegrationUseCase;
import cl.duoc.sonidovivo.application.port.in.ProductUseCase;
import cl.duoc.sonidovivo.domain.model.Category;
import cl.duoc.sonidovivo.domain.model.MoneyClp;
import cl.duoc.sonidovivo.domain.model.Product;
import cl.duoc.sonidovivo.domain.model.ProductCode;
import cl.duoc.sonidovivo.domain.model.ProductStatus;
import cl.duoc.sonidovivo.domain.model.Review;
import cl.duoc.sonidovivo.domain.model.SaleCommand;
import cl.duoc.sonidovivo.domain.model.SaleResult;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.ProductResponseDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.ReviewCreateDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.SaleRequestDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.SaleResponseDTO;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Inbound REST controller exposing public product catalog access and store customer/sales operations.
 */
@RestController
public class PublicStoreController {

    private final ProductUseCase productUseCase;
    private final OracleIntegrationUseCase oracleIntegrationUseCase;

    public PublicStoreController(
            ProductUseCase productUseCase,
            OracleIntegrationUseCase oracleIntegrationUseCase
    ) {
        this.productUseCase = productUseCase;
        this.oracleIntegrationUseCase = oracleIntegrationUseCase;
    }

    @GetMapping("/api/v1/public/products")
    public ResponseEntity<List<ProductResponseDTO>> listPublicProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String estado
    ) {
        Category category = (categoria != null && !categoria.isBlank()) ? Category.fromString(categoria) : null;
        ProductStatus status = (estado != null && !estado.isBlank()) ? ProductStatus.fromString(estado) : null;

        List<ProductResponseDTO> products = productUseCase
                .listProductsPaged(page, size, category, status)
                .stream()
                .map(ProductResponseDTO::fromDomain)
                .toList();

        return ResponseEntity.ok(products);
    }

    @GetMapping("/api/v1/public/products/{codigo}")
    public ResponseEntity<ProductResponseDTO> getPublicProduct(@PathVariable String codigo) {
        Product product = productUseCase.getProductByCode(ProductCode.of(codigo));
        return ResponseEntity.ok(ProductResponseDTO.fromDomain(product));
    }

    @PostMapping("/api/v1/store/sales")
    public ResponseEntity<SaleResponseDTO> registerStoreSale(@Valid @RequestBody SaleRequestDTO request) {
        SaleCommand command = new SaleCommand(
                request.customerId(),
                ProductCode.of(request.productCode()),
                request.quantity(),
                MoneyClp.of(request.unitPriceClp())
        );
        SaleResult result = oracleIntegrationUseCase.registerSale(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(SaleResponseDTO.fromDomain(result));
    }

    @PostMapping("/api/v1/store/reviews/{codigo}")
    public ResponseEntity<ProductResponseDTO> addStoreReview(
            @PathVariable String codigo,
            @Valid @RequestBody ReviewCreateDTO request
    ) {
        Review review = Review.create(request.cliente(), request.calificacion(), request.comentario());
        Product product = productUseCase.addReview(ProductCode.of(codigo), review);
        return ResponseEntity.ok(ProductResponseDTO.fromDomain(product));
    }
}
