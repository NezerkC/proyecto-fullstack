# Integración Oracle PL/SQL: PKG_SONIDO_VIVO, clientes y adaptadores Java

**Tareas:** T05 (adaptador Oracle PL/SQL y clientes, issue #5) y T11 (script DDL y paquete, issue #11)
**Responsable:** Danilo Sepúlveda (@Daakhen)
**Motor:** Oracle Database 23ai Free, PDB `FREEPDB1`
**Archivos:**

| Archivo | Rol |
| :--- | :--- |
| `scripts/oracle/01_pkg_sonido_vivo.sql` | Usuario, secuencias, tablas, datos iniciales, paquete `PKG_SONIDO_VIVO` y trigger de auditoría |
| `.../persistence/oracle/OraclePlSqlAdapter.java` | Invoca el paquete con `SimpleJdbcCall` (puerto `OracleSalesPort`) |
| `.../persistence/oracle/OracleCustomerEntity.java` | Entidad JPA de la tabla `CLIENTE` |
| `.../persistence/oracle/SpringDataOracleCustomerRepository.java` | Repositorio Spring Data (clave `Long`) |
| `.../persistence/oracle/OracleCustomerRepositoryAdapter.java` | Implementa `CustomerRepositoryPort` |

---

## 1. Origen de la lógica

La lógica relacional no se inventó para el backend: viene del repositorio del Taller de Base de Datos (`taller-base-de-datos-`, archivo `parcial 2/ep2_sonido_vivo.sql`, Evaluación Parcial 2). Allí las rutinas `FN_CALCULAR_DESCUENTO`, `SP_LIQUIDAR_CLIENTES` y `SP_REGISTRAR_VENTA` son objetos sueltos, y el paquete `PKG_SONIDO_VIVO` contiene otras (`fn_stock_producto`, `sp_reponer_stock`, `sp_resumen_cliente`, `sp_mostrar_criticos`).

El issue #11 pide las tres rutinas **dentro** de `PKG_SONIDO_VIVO` y con la firma que consume el adaptador Java, así que se portaron al paquete adaptándolas a la arquitectura del backend, donde el catálogo y el stock están en MongoDB (T04). La tabla siguiente resume qué se conservó y qué cambió.

| Elemento del taller | En el backend | Motivo |
| :--- | :--- | :--- |
| Tramos de descuento (menos de 200.000: 0 %; hasta 700.000: 5 %; más: 10 %; PREMIUM suma 2 puntos) | Se conserva igual en `fn_tasa_descuento` | Es la regla de negocio evaluada en el taller |
| `FN_CALCULAR_DESCUENTO(total, tipo)` devuelve la tasa en % | `fn_tasa_descuento` conserva ese cálculo; `fn_calcular_descuento(cliente, monto)` devuelve el monto en CLP | El puerto Java `calculateDiscount(customerId, gross)` devuelve CLP y necesita el cliente |
| `SP_REGISTRAR_VENTA(cliente, codigo, cantidad)` toma el precio de `PRODUCTO` | Recibe el precio unitario como parámetro | El precio vive en MongoDB; no existe `PRODUCTO` en Oracle |
| `TRG_DESCUENTA_STOCK` descuenta el stock en Oracle | No se crea | El stock se descuenta de forma atómica en MongoDB (`$inc`) antes de llamar a Oracle, y `OracleIntegrationService` lo compensa si Oracle falla |
| `SP_REGISTRAR_VENTA` captura los errores, los deja en `LOG_ERRORES` y no los propaga | Registra el error y lo vuelve a lanzar (`RAISE`) | Java necesita la excepción para compensar el stock de MongoDB |
| `SP_LIQUIDAR_CLIENTES` sin parámetros: borra toda `LIQUIDACION_CLIENTE` y la regenera | Recibe `p_process_date`, no borra el historial, inserta una fila por cliente y marca sus ventas `LIQUIDADA` | El caso de uso Java liquida a una fecha y devuelve un resumen; borrar el historial en cada ejecución no es aceptable en un servicio |
| Salida por `DBMS_OUTPUT` | Parámetros `OUT` | Es lo que lee `SimpleJdbcCall` |
| Log con `PRAGMA AUTONOMOUS_TRANSACTION` | Se conserva como subprograma privado `sp_registrar_log` | El error queda registrado aunque la venta o liquidación haga rollback |
| `TRG_AUDITA_VENTA` (trigger de sentencia) | Se conserva | Auditoría de operaciones sobre `VENTA` |
| `sp_reponer_stock`, `fn_stock_producto`, `sp_mostrar_criticos`, `sp_resumen_cliente` | No se portan | Dependen de `PRODUCTO`, que está en MongoDB |

---

## 2. Modelo de datos

Se mantienen los nombres del taller (`CLIENTE`, `VENTA`, `DETALLE_VENTA`, `LIQUIDACION_CLIENTE`, `LOG_ERRORES`, `AUDITORIA_OPERACION`) y las mismas restricciones `CHECK`. Los issues hablan de `clientes`, `ventas` y `detalle_ventas`: son las mismas tablas con los nombres en singular del taller.

Diferencias respecto al taller:

- `CLIENTE.region` es nueva (`VARCHAR2(100)`, por defecto `Valparaíso`), porque el dominio `Customer` la exige.
- `CLIENTE.nombres`, `apellidos`, `email` y `telefono` se ampliaron (100, 100, 254 y 25) a los máximos que validan `Customer` y `EmailAddress`; con los largos originales (50) un nombre válido para el dominio podía fallar en Oracle.
- `CLIENTE.telefono` es `NOT NULL`, igual que en el dominio.
- `DETALLE_VENTA.codigo_producto` (`VARCHAR2(50)`) reemplaza a `id_producto`; no hay clave foránea porque el producto vive en MongoDB.
- Secuencias nuevas: `SEQ_CLIENTE` (parte en 6, porque se cargan los clientes 1 a 5). `SEQ_VENTA`, `SEQ_BOLETA` y `SEQ_DETALLE` parten en 1001, 5001 y 1, porque no se cargan ventas de prueba.
- Se cargan los 5 clientes del taller con `MERGE` por RUT, de modo que el script se puede volver a ejecutar.

`CLIENTE.tipo_cliente` (`ESTANDAR`, `FRECUENTE`, `PREMIUM`) alimenta las reglas de descuento. No está mapeada en la entidad JPA porque el dominio `Customer` no tiene tipo: Hibernate no la incluye en los `INSERT`/`UPDATE`, así que un cliente creado por la API queda `ESTANDAR` y el valor de uno existente no se pisa. Cambiar un cliente a `FRECUENTE` o `PREMIUM` hoy se hace directamente en la base de datos.

---

## 3. Contrato del paquete

Los parámetros se enlazan **por posición**: el orden y el tipo de la especificación del paquete y de las declaraciones en `OraclePlSqlAdapter` deben mantenerse iguales.

### 3.1 `SP_REGISTRAR_VENTA`

| # | Parámetro | Dirección | Tipo Oracle | Tipo JDBC | Observación |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | `P_CUSTOMER_ID` | IN | `NUMBER` (`CLIENTE.ID_CLIENTE`) | `NUMERIC` | El adaptador convierte el `String` del dominio a `Long` |
| 2 | `P_PRODUCT_CODE` | IN | `VARCHAR2` | `VARCHAR` | SKU de MongoDB, 1 a 50 caracteres |
| 3 | `P_QUANTITY` | IN | `NUMBER` | `NUMERIC` | Entero mayor o igual a 1 |
| 4 | `P_UNIT_PRICE` | IN | `NUMBER` | `NUMERIC` | Entero mayor o igual a 1 (CLP) |
| 5 | `P_SALE_REFERENCE` | OUT | `VARCHAR2` | `VARCHAR` | Boleta, por ejemplo `BOL-5001` |
| 6 | `P_GROSS_TOTAL` | OUT | `NUMBER` | `NUMERIC` | `cantidad * precio unitario` |
| 7 | `P_DISCOUNT_CLP` | OUT | `NUMBER` | `NUMERIC` | Siempre 0 al registrar (ver nota) |
| 8 | `P_NET_TOTAL` | OUT | `NUMBER` | `NUMERIC` | Igual al bruto al registrar |

**Nota sobre el descuento.** En el taller la venta se guarda con `descuento = 0` y el descuento se calcula al liquidar, sobre el acumulado de ventas `PENDIENTE` del cliente. Se respetó esa regla; por eso `P_DISCOUNT_CLP` vale 0 y el neto es igual al bruto al registrar. El parámetro se mantiene para no cambiar el contrato con `SaleResult` si la regla cambia. Para mostrar un descuento estimado antes de vender se usa `FN_CALCULAR_DESCUENTO`.

Crea una fila en `VENTA` (estado `PENDIENTE`) y una en `DETALLE_VENTA`. No hace `COMMIT`: si falla, Oracle deshace los efectos de toda la llamada.

### 3.2 `SP_LIQUIDAR_CLIENTES`

| # | Parámetro | Dirección | Tipo Oracle | Tipo JDBC | Observación |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | `P_PROCESS_DATE` | IN | `DATE` | `DATE` | Incluye todo el día indicado |
| 2 | `P_PROCESSED_CUSTOMERS` | OUT | `NUMBER` | `NUMERIC` | Clientes liquidados |
| 3 | `P_TOTAL_LIQUIDATED` | OUT | `NUMBER` | `NUMERIC` | Suma de los netos, después del descuento |
| 4 | `P_STATUS_MESSAGE` | OUT | `VARCHAR2` | `VARCHAR` | `OK: ...` o `SIN_MOVIMIENTOS: ...` |

Toma las ventas `PENDIENTE` con fecha menor al día siguiente a `P_PROCESS_DATE`, agrupa por cliente, calcula la tasa con `fn_tasa_descuento` sobre el acumulado, inserta una fila en `LIQUIDACION_CLIENTE` y pasa las ventas a `LIQUIDADA`. Una segunda ejecución con la misma fecha devuelve `SIN_MOVIMIENTOS`. Bloquea la tabla `VENTA` (`SHARE ROW EXCLUSIVE`) mientras corre para que lo sumado sea exactamente lo marcado como liquidado; las altas de venta esperan hasta que termina.

### 3.3 `FN_CALCULAR_DESCUENTO`

| # | Parámetro | Dirección | Tipo Oracle | Observación |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `P_CUSTOMER_ID` | IN | `NUMBER` | Debe existir (si no, ORA-20001) |
| 2 | `P_GROSS_AMOUNT` | IN | `NUMBER` | Monto bruto en CLP; si es nulo o menor o igual a 0 devuelve 0 |
| retorno | | | `NUMBER` | Descuento en CLP, redondeado al peso |

Ejemplo: cliente 1 (PREMIUM) con bruto 776.960 da tasa 10 + 2 = 12 %, descuento `ROUND(776.960 * 12 / 100)` = 93.235.

La función pública adicional `fn_tasa_descuento(p_total_bruto, p_tipo_cliente)` devuelve la tasa en % con la fórmula exacta del taller.

### 3.4 Errores de aplicación

| Código | Cuándo | Excepción Java que produce el adaptador |
| :--- | :--- | :--- |
| ORA-20001 | Cliente no encontrado | `CustomerNotFoundException` (HTTP 404) |
| ORA-20002 | Producto, cantidad o precio inválidos | `InvalidDomainDataException` (HTTP 400) |
| ORA-20003 | Fecha de proceso nula | `InvalidDomainDataException` (HTTP 400) |
| otros (por ejemplo ORA-01438) | Fallo de base de datos | Se propaga la `DataAccessException` original |

Los procedimientos registran el error en `LOG_ERRORES` mediante `sp_registrar_log` (transacción autónoma, privado al cuerpo del paquete) y lo relanzan.

---

## 4. Adaptadores Java

### 4.1 `OraclePlSqlAdapter`

- Un `SimpleJdbcCall` por rutina, con `withCatalogName("PKG_SONIDO_VIVO")` (en `SimpleJdbcCall`, el "catálogo" es el nombre del paquete) y `withoutProcedureColumnMetaDataAccess()`. Los parámetros se declaran a mano con `SqlParameter` / `SqlOutParameter`, así no se consulta el diccionario de Oracle y el orden queda explícito en el código.
- Texto de llamada que se genera: `{call PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA(?, ?, ?, ?, ?, ?, ?, ?)}` y `{? = call PKG_SONIDO_VIVO.FN_CALCULAR_DESCUENTO(?, ?)}`.
- Para la función, el primer `SqlOutParameter` declarado (`RETURN_VALUE`) actúa como valor de retorno y se lee con `executeFunction(BigDecimal.class, ...)`.
- Los `SimpleJdbcCall` se compilan de forma perezosa en la primera llamada, de modo que el arranque de la aplicación no requiere conexión a Oracle.
- Un id de cliente no numérico no puede existir en Oracle: se lanza `CustomerNotFoundException` sin tocar la base de datos.
- `registeredAt` del `SaleResult` es la hora del servidor de aplicación al recibir la respuesta (el paquete no devuelve la fecha).

### 4.2 `OracleCustomerEntity` y `OracleCustomerRepositoryAdapter`

- La entidad mapea la tabla `CLIENTE`; `ID_CLIENTE` se genera con `SEQ_CLIENTE` (`allocationSize = 1`, igual que el `INCREMENT BY 1` de la secuencia).
- El dominio usa `String` como id y Oracle `NUMBER`: el adaptador convierte en ambos sentidos. `findById` con un id no numérico devuelve vacío.
- `save` usa `saveAndFlush`, de modo que un RUT o email duplicado (`UN_CLI_RUT`, `UN_CLI_EMAIL`) se detecta en la misma llamada como `DataIntegrityViolationException`, que `GlobalExceptionHandler` ya traduce a HTTP 409. `CustomerService` solo verifica el RUT de antemano; el email duplicado se resuelve en la base de datos.

---

## 5. Decisiones que difieren de documentos anteriores

1. **Usuario `SONIDO_VIVO` en lugar de `C##SONIDO_VIVO`.** Un usuario común (`C##`) solo se puede crear en `CDB$ROOT`; dentro de `FREEPDB1` Oracle responde ORA-65094. El script crea un usuario local del PDB con permisos mínimos (`CREATE SESSION`, `TABLE`, `SEQUENCE`, `PROCEDURE`, `TRIGGER`) en vez de `DBA`. Su nombre y clave por defecto (`sonido_vivo` / `secret`) coinciden con `application.yaml` y `docker-compose.yml`. **Cambiar la clave** (línea `CREATE USER` del script y variable `ORACLE_PASS`) fuera de desarrollo.
2. **Firma del paquete.** `docs/DEPLOYMENT_ORACLE_MONGO_CT100.md` describía un paquete con parámetros por RUT. No coincidía con `OracleSalesPort` (id de cliente, fecha de proceso) ni con la lógica del taller, así que ese documento ahora remite a este.
3. **Sin `COMMIT` dentro del paquete.** El script anterior lo hacía dentro de `SP_REGISTRAR_VENTA`; se quitó para que una transacción de nivel superior pueda abarcar la llamada.

---

## 6. Ejecución y verificación

### 6.1 Carga del script

Con `docker compose up -d`, la imagen preconstruida de Oracle ejecuta `scripts/oracle/*.sql` (montado en `/opt/oracle/scripts/startup`) tras abrir `FREEPDB1`. En CT100, copiar el archivo a `/opt/oracle-hermes/scripts/oracle/` antes de levantar el stack. Para ejecutarlo a mano: `sqlplus / as sysdba @01_pkg_sonido_vivo.sql` dentro del contenedor. Al final imprime `PKG_SONIDO_VIVO y TRG_AUDITA_VENTA compilados sin errores`; si el paquete compila con errores el script falla con ORA-20999.

### 6.2 Prueba manual en SQL Developer o DBeaver (como `SONIDO_VIVO`)

```sql
SET SERVEROUTPUT ON;
DECLARE
    v_ref VARCHAR2(30); v_bruto NUMBER; v_desc NUMBER; v_neto NUMBER;
    v_clientes NUMBER; v_total NUMBER; v_msg VARCHAR2(200);
BEGIN
    PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA(1, 'G-FND-STRAT-01', 1, 749990, v_ref, v_bruto, v_desc, v_neto);
    DBMS_OUTPUT.PUT_LINE(v_ref || ' bruto=' || v_bruto || ' desc=' || v_desc || ' neto=' || v_neto);
    PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA(1, 'S-STR-REG-01', 3, 8990, v_ref, v_bruto, v_desc, v_neto);
    DBMS_OUTPUT.PUT_LINE('descuento estimado: ' || PKG_SONIDO_VIVO.FN_CALCULAR_DESCUENTO(1, 776960));
    PKG_SONIDO_VIVO.SP_LIQUIDAR_CLIENTES(TRUNC(SYSDATE), v_clientes, v_total, v_msg);
    DBMS_OUTPUT.PUT_LINE(v_clientes || ' cliente(s), neto=' || v_total || ' | ' || v_msg);
    COMMIT;
END;
/
```

Resultados esperados en una base recién creada:

| Salida | Valor |
| :--- | :--- |
| Primera venta | `BOL-5001 bruto=749990 desc=0 neto=749990` |
| Descuento estimado | `93235` (776.960 con tasa 12 % para PREMIUM) |
| Liquidación | `1 cliente(s), neto=683725 | OK: 1 cliente(s) y 2 venta(s) liquidados hasta <fecha>` |
| `SELECT * FROM liquidacion_cliente` | Una fila: bruto 776960, tasa 12, descuento 93235, neto 683725 |
| Repetir la liquidación | `SIN_MOVIMIENTOS` |
| `SP_REGISTRAR_VENTA(99, ...)` | ORA-20001 y una fila nueva en `LOG_ERRORES` |

### 6.3 Pruebas automatizadas

`mvn test` (87 pruebas en total, 12 nuevas):

- `OraclePlSqlAdapterTest` (7): con un driver JDBC simulado verifica el texto exacto de las tres llamadas, el orden y tipo de cada parámetro, la lectura de los `OUT`, la traducción de ORA-20001 y ORA-20002, la propagación de otros errores y el rechazo de ids no numéricos.
- `OracleCustomerRepositoryAdapterTest` (5): mapeo dominio a entidad y de vuelta, conversión de ids, consultas y propagación de violaciones de unicidad.
- `HexagonalArchitectureTest` (ArchUnit) sigue en verde: el dominio no depende de Spring ni de Oracle.

**Alcance de las pruebas.** Estas pruebas no ejecutan PL/SQL: confirman que Java invoca la firma esperada. El script SQL y el paquete **no se han ejecutado contra una instancia real de Oracle** en el desarrollo de estas tareas; falta correr el punto 6.2 en CT100 o en el contenedor local.

---

## 7. Pendientes y limitaciones conocidas

- El dominio `Customer` no tiene tipo de cliente; para que la API pueda crear clientes `FRECUENTE` o `PREMIUM` habría que agregarlo al dominio y al DTO (fuera del alcance de T05 y T11).
- `LOG_ERRORES` y `AUDITORIA_OPERACION` no tienen endpoint de consulta.
- Las fechas `DATE` de Oracle usan la zona horaria del contenedor (UTC por defecto), por lo que "hasta el día X" corta a medianoche UTC.
- El archivo del script contiene caracteres con tilde (`Viña del Mar`, `Matías`); si se ejecuta con un `NLS_LANG` que no sea UTF-8 pueden guardarse mal.
