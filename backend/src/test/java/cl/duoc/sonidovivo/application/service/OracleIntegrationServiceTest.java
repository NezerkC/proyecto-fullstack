package cl.duoc.sonidovivo.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import cl.duoc.sonidovivo.domain.exception.CustomerNotFoundException;
import cl.duoc.sonidovivo.domain.exception.InsufficientStockException;
import cl.duoc.sonidovivo.domain.exception.InvalidDomainDataException;
import cl.duoc.sonidovivo.domain.exception.ProductNotFoundException;
import cl.duoc.sonidovivo.domain.model.Category;
import cl.duoc.sonidovivo.domain.model.Customer;
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
import cl.duoc.sonidovivo.domain.port.out.CustomerRepositoryPort;
import cl.duoc.sonidovivo.domain.port.out.OracleSalesPort;
import cl.duoc.sonidovivo.domain.port.out.ProductRepositoryPort;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OracleIntegrationServiceTest {

    @Mock
    private OracleSalesPort oracleSalesPort;

    @Mock
    private ProductRepositoryPort productRepositoryPort;

    @Mock
    private CustomerRepositoryPort customerRepositoryPort;

    private OracleIntegrationService oracleIntegrationService;

    @BeforeEach
    void setUp() {
        oracleIntegrationService = new OracleIntegrationService(
                oracleSalesPort,
                productRepositoryPort,
                customerRepositoryPort
        );
    }

    private Customer sampleCustomer() {
        return Customer.reconstitute(
                "cust-1",
                "12.345.678-K",
                "Victor",
                "Martinez",
                EmailAddress.of("victor@sonidovivo.cl"),
                "+56912345678",
                "Santiago",
                "Metropolitana"
        );
    }

    private Product sampleProduct(int stock) {
        return Product.create(
                ProductCode.of("G-FND-STRAT-01"),
                "Fender Stratocaster Player",
                Category.CUERDAS,
                MoneyClp.of(800_000),
                StockQuantity.of(stock),
                Map.of("tipo", "guitarra"),
                List.of("fender")
        );
    }

    @Test
    @DisplayName("registerSale decrements MongoDB stock, transitions AGOTADO at zero, and registers sale in Oracle")
    void registerSaleHappyPathAndStatusSync() {
        ProductCode code = ProductCode.of("G-FND-STRAT-01");
        SaleCommand command = new SaleCommand("cust-1", code, 3, MoneyClp.of(800_000));
        SaleResult expected = new SaleResult(
                "VTA-2026-0001",
                "cust-1",
                code,
                3,
                2_400_000L,
                120_000L,
                2_280_000L,
                Instant.now()
        );

        when(customerRepositoryPort.findById("cust-1")).thenReturn(Optional.of(sampleCustomer()));
        when(productRepositoryPort.findByCode(code)).thenReturn(Optional.of(sampleProduct(3)));
        when(productRepositoryPort.decrementStockAtomic(code, 3)).thenReturn(true);
        when(oracleSalesPort.registerSale(command)).thenReturn(expected);

        SaleResult result = oracleIntegrationService.registerSale(command);

        assertEquals("VTA-2026-0001", result.saleReference());
        assertEquals(2_280_000L, result.netTotalClp());
        verify(productRepositoryPort).decrementStockAtomic(code, 3);
        verify(productRepositoryPort).updateStatus(code, ProductStatus.AGOTADO);
        verify(oracleSalesPort).registerSale(command);
    }

    @Test
    @DisplayName("registerSale compensates MongoDB stock and status if Oracle PL/SQL fails")
    void registerSaleCompensatesStockWhenOracleFails() {
        ProductCode code = ProductCode.of("G-FND-STRAT-01");
        SaleCommand command = new SaleCommand("cust-1", code, 2, MoneyClp.of(800_000));

        when(customerRepositoryPort.findById("cust-1")).thenReturn(Optional.of(sampleCustomer()));
        when(productRepositoryPort.findByCode(code)).thenReturn(Optional.of(sampleProduct(2)));
        when(productRepositoryPort.decrementStockAtomic(code, 2)).thenReturn(true);
        when(oracleSalesPort.registerSale(command)).thenThrow(new IllegalStateException("Oracle ORA-20001"));

        assertThrows(IllegalStateException.class, () -> oracleIntegrationService.registerSale(command));

        verify(productRepositoryPort).updateStatus(code, ProductStatus.AGOTADO);
        verify(productRepositoryPort).adjustStockAtomic(code, 2);
        verify(productRepositoryPort).updateStatus(code, ProductStatus.ACTIVO);
    }

    @Test
    @DisplayName("registerSale rejects unknown customer, unknown product, and insufficient stock before calling Oracle")
    void registerSaleRejectsInvalidPreconditions() {
        ProductCode code = ProductCode.of("G-FND-STRAT-01");
        SaleCommand command = new SaleCommand("cust-1", code, 5, MoneyClp.of(800_000));

        when(customerRepositoryPort.findById("cust-1")).thenReturn(Optional.empty());
        assertThrows(CustomerNotFoundException.class, () -> oracleIntegrationService.registerSale(command));
        verifyNoInteractions(productRepositoryPort, oracleSalesPort);

        when(customerRepositoryPort.findById("cust-1")).thenReturn(Optional.of(sampleCustomer()));
        when(productRepositoryPort.findByCode(code)).thenReturn(Optional.empty());
        assertThrows(ProductNotFoundException.class, () -> oracleIntegrationService.registerSale(command));
        verifyNoInteractions(oracleSalesPort);

        when(productRepositoryPort.findByCode(code)).thenReturn(Optional.of(sampleProduct(2)));
        assertThrows(InsufficientStockException.class, () -> oracleIntegrationService.registerSale(command));
        verify(productRepositoryPort, never()).decrementStockAtomic(any(), org.mockito.ArgumentMatchers.anyInt());
        verifyNoInteractions(oracleSalesPort);
    }

    @Test
    @DisplayName("runCustomerLiquidation validates date and delegates to OracleSalesPort")
    void runCustomerLiquidationBehavior() {
        LocalDate processDate = LocalDate.of(2026, 11, 11);
        LiquidationResult expected = new LiquidationResult(15, 4_500_000L, processDate, "OK");
        when(oracleSalesPort.liquidateCustomers(processDate)).thenReturn(expected);

        LiquidationResult result = oracleIntegrationService.runCustomerLiquidation(processDate);

        assertEquals(15, result.processedCustomers());
        assertEquals(4_500_000L, result.totalLiquidatedClp());
        assertThrows(InvalidDomainDataException.class, () -> oracleIntegrationService.runCustomerLiquidation(null));
    }

    @Test
    @DisplayName("calculateDiscount validates customer and gross amount before calling Oracle FN_CALCULAR_DESCUENTO")
    void calculateDiscountBehavior() {
        when(customerRepositoryPort.findById("cust-1")).thenReturn(Optional.of(sampleCustomer()));
        when(oracleSalesPort.calculateDiscount("cust-1", 500_000L)).thenReturn(50_000L);

        long discount = oracleIntegrationService.calculateDiscount(" cust-1 ", 500_000L);

        assertEquals(50_000L, discount);
        assertThrows(InvalidDomainDataException.class,
                () -> oracleIntegrationService.calculateDiscount(" ", 500_000L));
        assertThrows(InvalidDomainDataException.class,
                () -> oracleIntegrationService.calculateDiscount("cust-1", 0L));
    }

    private SaleResult sampleSaleResult(ProductCode code) {
        return new SaleResult(
                "VTA-TEST-0001",
                "cust-1",
                code,
                1,
                800_000L,
                40_000L,
                760_000L,
                Instant.now()
        );
    }

    @Test
    @DisplayName("registerSale prevents overselling under 20 concurrent threads with initial stock 5")
    void registerSaleMultiThreadedConcurrencyZeroOverselling() throws InterruptedException {
        ProductCode code = ProductCode.of("G-FND-STRAT-01");
        int initialStock = 5;
        int threadCount = 20;

        ConcurrentFakeProductRepository fakeRepo = new ConcurrentFakeProductRepository(code, initialStock);

        CustomerRepositoryPort customerRepo = new CustomerRepositoryPort() {
            @Override
            public Customer save(Customer customer) {
                return customer;
            }

            @Override
            public Optional<Customer> findById(String id) {
                return Optional.of(sampleCustomer());
            }

            @Override
            public Optional<Customer> findByRut(String rut) {
                return Optional.empty();
            }

            @Override
            public boolean existsByRut(String rut) {
                return false;
            }

            @Override
            public List<Customer> findAll() {
                return List.of();
            }
        };

        AtomicInteger oracleInvocations = new AtomicInteger(0);
        OracleSalesPort salesPort = new OracleSalesPort() {
            @Override
            public SaleResult registerSale(SaleCommand cmd) {
                oracleInvocations.incrementAndGet();
                return sampleSaleResult(cmd.productCode());
            }

            @Override
            public LiquidationResult liquidateCustomers(LocalDate date) {
                return null;
            }

            @Override
            public long calculateDiscount(String customerId, long grossAmountClp) {
                return 0;
            }
        };

        OracleIntegrationService service = new OracleIntegrationService(salesPort, fakeRepo, customerRepo);

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger insufficientStockCount = new AtomicInteger(0);
        AtomicInteger unexpectedExceptionCount = new AtomicInteger(0);

        SaleCommand command = new SaleCommand("cust-1", code, 1, MoneyClp.of(800_000));

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    service.registerSale(command);
                    successCount.incrementAndGet();
                } catch (InsufficientStockException ex) {
                    insufficientStockCount.incrementAndGet();
                } catch (Throwable ex) {
                    unexpectedExceptionCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        assertTrue(readyLatch.await(5, TimeUnit.SECONDS), "Threads must be ready");
        startLatch.countDown();
        assertTrue(doneLatch.await(10, TimeUnit.SECONDS), "All threads must finish");
        executor.shutdownNow();

        assertEquals(5, successCount.get(), "Exactly 5 sales must succeed");
        assertEquals(15, insufficientStockCount.get(), "Exactly 15 threads must throw InsufficientStockException");
        assertEquals(0, unexpectedExceptionCount.get(), "Zero unexpected exceptions");
        assertEquals(5, oracleInvocations.get(), "Oracle registerSale must be invoked exactly 5 times");
        assertEquals(0, fakeRepo.getCurrentStock(), "Final stock must strictly be 0");
    }

    @Test
    @DisplayName("registerSale rolls back stock atomically when concurrent payments fail alternately")
    void registerSaleConcurrentPaymentFailureAtomicRollback() throws InterruptedException {
        ProductCode code = ProductCode.of("G-FND-STRAT-01");
        int initialStock = 10;
        int threadCount = 10;

        ConcurrentFakeProductRepository fakeRepo = new ConcurrentFakeProductRepository(code, initialStock);

        CustomerRepositoryPort customerRepo = new CustomerRepositoryPort() {
            @Override
            public Customer save(Customer customer) {
                return customer;
            }

            @Override
            public Optional<Customer> findById(String id) {
                return Optional.of(sampleCustomer());
            }

            @Override
            public Optional<Customer> findByRut(String rut) {
                return Optional.empty();
            }

            @Override
            public boolean existsByRut(String rut) {
                return false;
            }

            @Override
            public List<Customer> findAll() {
                return List.of();
            }
        };

        AtomicInteger callSequence = new AtomicInteger(0);
        OracleSalesPort salesPort = new OracleSalesPort() {
            @Override
            public SaleResult registerSale(SaleCommand cmd) {
                int call = callSequence.incrementAndGet();
                if (call % 2 == 1) { // odd calls: 1, 3, 5, 7, 9 succeed
                    return sampleSaleResult(cmd.productCode());
                } else { // even calls: 2, 4, 6, 8, 10 fail
                    throw new IllegalStateException("Payment gateway / Oracle PL/SQL failure");
                }
            }

            @Override
            public LiquidationResult liquidateCustomers(LocalDate date) {
                return null;
            }

            @Override
            public long calculateDiscount(String customerId, long grossAmountClp) {
                return 0;
            }
        };

        OracleIntegrationService service = new OracleIntegrationService(salesPort, fakeRepo, customerRepo);

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        AtomicInteger unexpectedExceptionCount = new AtomicInteger(0);

        SaleCommand command = new SaleCommand("cust-1", code, 1, MoneyClp.of(800_000));

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    service.registerSale(command);
                    successCount.incrementAndGet();
                } catch (IllegalStateException ex) {
                    if ("Payment gateway / Oracle PL/SQL failure".equals(ex.getMessage())) {
                        failureCount.incrementAndGet();
                    } else {
                        unexpectedExceptionCount.incrementAndGet();
                    }
                } catch (Throwable ex) {
                    unexpectedExceptionCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        assertTrue(readyLatch.await(5, TimeUnit.SECONDS), "Threads must be ready");
        startLatch.countDown();
        assertTrue(doneLatch.await(10, TimeUnit.SECONDS), "All threads must finish");
        executor.shutdownNow();

        assertEquals(5, successCount.get(), "Exactly 5 sales must succeed");
        assertEquals(5, failureCount.get(), "Exactly 5 sales must fail with Payment gateway / Oracle PL/SQL failure");
        assertEquals(0, unexpectedExceptionCount.get(), "Zero unexpected exceptions");
        assertEquals(10, callSequence.get(), "Oracle registerSale must be called 10 times in total");
        assertEquals(5, fakeRepo.getCurrentStock(), "Final stock must strictly be 5 after atomic rollbacks");
    }

    @Test
    @DisplayName("registerSale rethrows original Oracle exception with compensation failure attached as suppressed")
    void registerSaleAttachesSuppressedCompensationException() {
        ProductCode code = ProductCode.of("G-FND-STRAT-01");
        SaleCommand command = new SaleCommand("cust-1", code, 1, MoneyClp.of(800_000));

        when(customerRepositoryPort.findById("cust-1")).thenReturn(Optional.of(sampleCustomer()));
        when(productRepositoryPort.findByCode(code)).thenReturn(Optional.of(sampleProduct(5)));
        when(productRepositoryPort.decrementStockAtomic(code, 1)).thenReturn(true);

        IllegalStateException oracleFailure = new IllegalStateException("Payment gateway / Oracle PL/SQL failure");
        when(oracleSalesPort.registerSale(command)).thenThrow(oracleFailure);

        IllegalStateException compensationFailure = new IllegalStateException("MongoDB compensation atomic adjust failure");
        when(productRepositoryPort.adjustStockAtomic(code, 1)).thenThrow(compensationFailure);

        IllegalStateException thrown = assertThrows(
                IllegalStateException.class,
                () -> oracleIntegrationService.registerSale(command)
        );

        assertSame(oracleFailure, thrown, "Original Oracle exception must be rethrown");
        assertEquals("Payment gateway / Oracle PL/SQL failure", thrown.getMessage());
        Throwable[] suppressed = thrown.getSuppressed();
        assertEquals(1, suppressed.length, "Exactly one suppressed exception must be attached");
        assertSame(compensationFailure, suppressed[0], "Suppressed exception must be the compensation failure");
        assertEquals("MongoDB compensation atomic adjust failure", suppressed[0].getMessage());
    }

    static class ConcurrentFakeProductRepository implements ProductRepositoryPort {
        private final AtomicInteger currentStock;
        private final ProductCode productCode;
        private volatile ProductStatus status = ProductStatus.ACTIVO;

        ConcurrentFakeProductRepository(ProductCode productCode, int initialStock) {
            this.productCode = productCode;
            this.currentStock = new AtomicInteger(initialStock);
        }

        @Override
        public Optional<Product> findByCode(ProductCode code) {
            if (!productCode.equals(code)) {
                return Optional.empty();
            }
            int stockVal = currentStock.get();
            Product product = Product.create(
                    productCode,
                    "Fender Stratocaster Player",
                    Category.CUERDAS,
                    MoneyClp.of(800_000),
                    StockQuantity.of(Math.max(0, stockVal)),
                    Map.of("tipo", "guitarra"),
                    List.of("fender")
            );
            return Optional.of(product);
        }

        @Override
        public boolean adjustStockAtomic(ProductCode code, int delta) {
            if (!productCode.equals(code)) {
                return false;
            }
            while (true) {
                int current = currentStock.get();
                int next = current + delta;
                if (next < 0) {
                    return false;
                }
                if (currentStock.compareAndSet(current, next)) {
                    if (next == 0) {
                        status = ProductStatus.AGOTADO;
                    } else {
                        status = ProductStatus.ACTIVO;
                    }
                    return true;
                }
            }
        }

        @Override
        public void updateStatus(ProductCode code, ProductStatus status) {
            this.status = status;
        }

        public int getCurrentStock() {
            return currentStock.get();
        }

        public ProductStatus getStatus() {
            return status;
        }

        @Override
        public Product save(Product product) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean existsByCode(ProductCode code) {
            return productCode.equals(code);
        }

        @Override
        public List<Product> findAllPaged(int page, int size, Category category, ProductStatus status) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<Product> search(String query, Category category, Map<String, Object> specificationFilters) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void addReview(ProductCode code, Review review) {
            throw new UnsupportedOperationException();
        }

        @Override
        public int applyBatchPriceAdjustment(double percentage, Category category) {
            throw new UnsupportedOperationException();
        }
    }
}
