package cl.duoc.sonidovivo.infrastructure.adapter.in.rest;

import cl.duoc.sonidovivo.application.port.in.ProductUseCase;
import cl.duoc.sonidovivo.application.port.in.ProductUseCase.CreateProductCommand;
import cl.duoc.sonidovivo.application.port.in.ProductUseCase.UpdateProductCommand;
import cl.duoc.sonidovivo.domain.model.Category;
import cl.duoc.sonidovivo.domain.model.MoneyClp;
import cl.duoc.sonidovivo.domain.model.Product;
import cl.duoc.sonidovivo.domain.model.ProductCode;
import cl.duoc.sonidovivo.domain.model.ProductStatus;
import cl.duoc.sonidovivo.domain.model.Review;
import cl.duoc.sonidovivo.domain.model.StockQuantity;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.ProductCreateRequestDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.ProductResponseDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.ProductStatusUpdateDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.ProductUpdateRequestDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.ReviewCreateDTO;
import cl.duoc.sonidovivo.infrastructure.adapter.in.rest.dto.StockAdjustmentDTO;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Inbound REST controller managing administrative product catalog, stock, status, and review operations.
 *
 * <p>Responsable asignado: <strong>Dylan Sandoval (@dysandoval)</strong></p>
 * <p>Documentación y contrato: {@code docs/contracts/CONTRACT_FULLSTACK_REST.md}</p>
 */
@RestController
@RequestMapping("/api/v1/admin/products")
public class AdminProductController {

    private static final String BASE_PATH = "/api/v1/admin/products/";

    /** Query parameters with their own meaning; every other parameter is a dynamic specification filter. */
    private static final Set<String> RESERVED_SEARCH_PARAMS = Set.of("q", "query", "categoria", "page", "size");

    private final ProductUseCase productUseCase;

    public AdminProductController(ProductUseCase productUseCase) {
        this.productUseCase = productUseCase;
    }

    @GetMapping
    public ResponseEntity<List<ProductResponseDTO>> listProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String estado
    ) {
        List<ProductResponseDTO> products = productUseCase
                .listProductsPaged(page, size, parseCategory(categoria), parseStatus(estado))
                .stream()
                .map(ProductResponseDTO::fromDomain)
                .toList();
        return ResponseEntity.ok(products);
    }

    @GetMapping("/search")
    public ResponseEntity<List<ProductResponseDTO>> searchProducts(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String categoria,
            @RequestParam Map<String, String> allQueryParams
    ) {
        String text = (q != null && !q.isBlank()) ? q : query;

        Map<String, Object> specFilters = new LinkedHashMap<>();
        allQueryParams.forEach((key, value) -> {
            if (!RESERVED_SEARCH_PARAMS.contains(key) && value != null && !value.isBlank()) {
                specFilters.put(key, value);
            }
        });

        List<ProductResponseDTO> products = productUseCase
                .searchProducts(text, parseCategory(categoria), specFilters)
                .stream()
                .map(ProductResponseDTO::fromDomain)
                .toList();
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{codigo}")
    public ResponseEntity<ProductResponseDTO> getProduct(@PathVariable String codigo) {
        Product product = productUseCase.getProductByCode(ProductCode.of(codigo));
        return ResponseEntity.ok(ProductResponseDTO.fromDomain(product));
    }

    @PostMapping
    public ResponseEntity<ProductResponseDTO> createProduct(@Valid @RequestBody ProductCreateRequestDTO request) {
        CreateProductCommand command = new CreateProductCommand(
                ProductCode.of(request.codigo()),
                request.nombre(),
                Category.fromString(request.categoria()),
                MoneyClp.of(request.precioClp()),
                StockQuantity.of(request.stockDisponible()),
                request.especificaciones(),
                request.tags()
        );
        Product created = productUseCase.createProduct(command);
        return ResponseEntity
                .created(URI.create(BASE_PATH + created.getCode().value()))
                .body(ProductResponseDTO.fromDomain(created));
    }

    @PutMapping("/{codigo}")
    public ResponseEntity<ProductResponseDTO> updateProduct(
            @PathVariable String codigo,
            @Valid @RequestBody ProductUpdateRequestDTO request
    ) {
        UpdateProductCommand command = new UpdateProductCommand(
                request.nombre(),
                Category.fromString(request.categoria()),
                MoneyClp.of(request.precioClp()),
                StockQuantity.of(request.stockDisponible()),
                request.especificaciones(),
                request.tags()
        );
        Product updated = productUseCase.updateProduct(ProductCode.of(codigo), command);
        return ResponseEntity.ok(ProductResponseDTO.fromDomain(updated));
    }

    @PatchMapping("/{codigo}/status")
    public ResponseEntity<ProductResponseDTO> updateStatus(
            @PathVariable String codigo,
            @Valid @RequestBody ProductStatusUpdateDTO request
    ) {
        Product product = productUseCase.changeStatus(
                ProductCode.of(codigo),
                ProductStatus.fromString(request.estado())
        );
        return ResponseEntity.ok(ProductResponseDTO.fromDomain(product));
    }

    /**
     * Atomic stock adjustment. The contract and the React client use {@code PATCH}; {@code POST} is kept as an
     * alias because the original scaffold exposed it.
     */
    @RequestMapping(
            value = "/{codigo}/stock",
            method = {RequestMethod.PATCH, RequestMethod.POST}
    )
    public ResponseEntity<ProductResponseDTO> adjustStock(
            @PathVariable String codigo,
            @Valid @RequestBody StockAdjustmentDTO request
    ) {
        Product product = productUseCase.adjustStockAtomic(
                ProductCode.of(codigo),
                request.delta(),
                request.motivo()
        );
        return ResponseEntity.ok(ProductResponseDTO.fromDomain(product));
    }

    @PostMapping("/{codigo}/reviews")
    public ResponseEntity<ProductResponseDTO> addReview(
            @PathVariable String codigo,
            @Valid @RequestBody ReviewCreateDTO request
    ) {
        Review review = Review.create(request.cliente(), request.calificacion(), request.comentario());
        Product product = productUseCase.addReview(ProductCode.of(codigo), review);
        return ResponseEntity.ok(ProductResponseDTO.fromDomain(product));
    }

    /**
     * Logical delete: the use-case port has no physical delete, so the product is moved to
     * {@link ProductStatus#DESCONTINUADO} (soft discontinuation, as described in the contract).
     */
    @DeleteMapping("/{codigo}")
    public ResponseEntity<Void> deleteProduct(@PathVariable String codigo) {
        productUseCase.changeStatus(ProductCode.of(codigo), ProductStatus.DESCONTINUADO);
        return ResponseEntity.noContent().build();
    }

    private static Category parseCategory(String value) {
        return (value == null || value.isBlank()) ? null : Category.fromString(value);
    }

    private static ProductStatus parseStatus(String value) {
        return (value == null || value.isBlank()) ? null : ProductStatus.fromString(value);
    }
}
