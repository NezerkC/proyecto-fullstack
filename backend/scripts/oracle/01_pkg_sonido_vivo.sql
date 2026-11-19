-- =============================================================================
-- Sonido Vivo - Oracle Database 23ai Free (PDB FREEPDB1)
-- Script : 01_pkg_sonido_vivo.sql
-- Tarea  : T11 (DDL relacional + paquete PL/SQL PKG_SONIDO_VIVO)
-- Consume: OraclePlSqlAdapter y OracleCustomerEntity (T05)
-- Origen : logica de la Evaluacion Parcial 2 del Taller de Base de Datos
--          (repo taller-base-de-datos-, parcial 2/ep2_sonido_vivo.sql), adaptada
--          al backend: el catalogo y el stock viven en MongoDB, por lo que aqui
--          no existen PRODUCTO, CATEGORIA ni TRG_DESCUENTA_STOCK.
-- Doc    : docs/ORACLE_PLSQL_INTEGRATION.md
--
-- Ejecucion: la imagen oficial container-registry.oracle.com/database/free corre
-- los .sql de /container-entrypoint-initdb.d como SYSDBA contra el CDB raiz, por
-- eso el script cambia primero al contenedor FREEPDB1. Solo se ejecuta la primera
-- vez que se crea el volumen de datos; tambien se puede volver a correr a mano:
-- las tablas usan IF NOT EXISTS, el resto CREATE OR REPLACE y los datos MERGE.
-- =============================================================================

WHENEVER SQLERROR EXIT SQL.SQLCODE
SET DEFINE OFF
SET SERVEROUTPUT ON

ALTER SESSION SET CONTAINER = FREEPDB1;

-- -----------------------------------------------------------------------------
-- 1. Usuario de aplicacion (usuario LOCAL del PDB, sin prefijo C##)
--    Los usuarios comunes C## solo se pueden crear en CDB$ROOT (ORA-65094).
--    El nombre y la clave por defecto coinciden con ORACLE_USER / ORACLE_PASS
--    de application.yaml y docker-compose.yml. Cambiar la clave fuera de dev.
-- -----------------------------------------------------------------------------
DECLARE
    v_existe NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_existe FROM dba_users WHERE username = 'SONIDO_VIVO';
    IF v_existe = 0 THEN
        EXECUTE IMMEDIATE 'CREATE USER sonido_vivo IDENTIFIED BY "secret" '
                       || 'DEFAULT TABLESPACE users QUOTA UNLIMITED ON users';
    END IF;
END;
/

GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE, CREATE TRIGGER TO sonido_vivo;

-- Los objetos siguientes quedan en el esquema SONIDO_VIVO sin necesidad de CONNECT.
ALTER SESSION SET CURRENT_SCHEMA = sonido_vivo;

-- -----------------------------------------------------------------------------
-- 2. Secuencias (mismos nombres que el taller; los ids de venta, boleta y
--    detalle arrancan en 1001, 5001 y 1 porque no se cargan ventas de prueba)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_cliente             START WITH 6    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_venta               START WITH 1001 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_boleta              START WITH 5001 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_detalle             START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_liquidacion_cliente START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_log_errores         START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_auditoria           START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;

-- -----------------------------------------------------------------------------
-- 3. Tablas relacionales (modelo de la EP1/EP2 sin el catalogo de productos)
-- -----------------------------------------------------------------------------

-- CLIENTE: columnas mapeadas por OracleCustomerEntity (ddl-auto = none).
-- Diferencias con el taller: REGION es nueva (el dominio Java la exige) y los
-- largos de nombres, email y telefono se ampliaron a los maximos que valida
-- Customer / EmailAddress. TIPO_CLIENTE no esta en la entidad JPA: toma el
-- valor por defecto al insertar y la usan las reglas de descuento.
CREATE TABLE IF NOT EXISTS cliente (
    id_cliente   NUMBER(6)     NOT NULL,
    rut          VARCHAR2(12)  NOT NULL,
    nombres      VARCHAR2(100) NOT NULL,
    apellidos    VARCHAR2(100) NOT NULL,
    email        VARCHAR2(254) NOT NULL,
    telefono     VARCHAR2(25)  NOT NULL,
    comuna       VARCHAR2(100) DEFAULT 'Viña del Mar' NOT NULL,
    region       VARCHAR2(100) DEFAULT 'Valparaíso' NOT NULL,
    tipo_cliente VARCHAR2(20)  DEFAULT 'ESTANDAR' NOT NULL,
    CONSTRAINT pk_cliente PRIMARY KEY (id_cliente),
    CONSTRAINT un_cli_rut UNIQUE (rut),
    CONSTRAINT un_cli_email UNIQUE (email),
    CONSTRAINT chk_cli_tipo CHECK (tipo_cliente IN ('ESTANDAR', 'FRECUENTE', 'PREMIUM'))
);

CREATE TABLE IF NOT EXISTS venta (
    id_venta     NUMBER(8)    NOT NULL,
    nro_boleta   NUMBER(8)    NOT NULL,
    fecha_venta  DATE         DEFAULT SYSDATE NOT NULL,
    id_cliente   NUMBER(6)    NOT NULL,
    subtotal     NUMBER(10)   DEFAULT 0 NOT NULL,
    descuento    NUMBER(10)   DEFAULT 0 NOT NULL,
    total        NUMBER(10)   DEFAULT 0 NOT NULL,
    estado_venta VARCHAR2(20) DEFAULT 'PENDIENTE' NOT NULL,
    CONSTRAINT pk_venta PRIMARY KEY (id_venta),
    CONSTRAINT un_venta_boleta UNIQUE (nro_boleta),
    CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente),
    CONSTRAINT chk_venta_totales CHECK (subtotal >= 0 AND descuento >= 0 AND total = (subtotal - descuento)),
    CONSTRAINT chk_venta_estado CHECK (estado_venta IN ('PENDIENTE', 'LIQUIDADA', 'ANULADA'))
);

CREATE INDEX IF NOT EXISTS idx_venta_cliente_estado ON venta (id_cliente, estado_venta);

-- DETALLE_VENTA: sin FK a PRODUCTO; el producto se identifica por su codigo SKU
-- del catalogo MongoDB (ProductCode del dominio, hasta 50 caracteres).
CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle      NUMBER(10)   NOT NULL,
    id_venta        NUMBER(8)    NOT NULL,
    codigo_producto VARCHAR2(50) NOT NULL,
    cantidad        NUMBER(4)    NOT NULL,
    precio_unitario NUMBER(10)   NOT NULL,
    subtotal_linea  NUMBER(10)   NOT NULL,
    CONSTRAINT pk_detalle_venta PRIMARY KEY (id_detalle),
    CONSTRAINT fk_det_venta FOREIGN KEY (id_venta) REFERENCES venta (id_venta),
    CONSTRAINT chk_det_cant CHECK (cantidad > 0),
    CONSTRAINT chk_det_precio CHECK (precio_unitario > 0),
    CONSTRAINT chk_det_subtotal CHECK (subtotal_linea = cantidad * precio_unitario)
);

CREATE INDEX IF NOT EXISTS idx_detalle_venta ON detalle_venta (id_venta);

CREATE TABLE IF NOT EXISTS liquidacion_cliente (
    id_liquidacion     NUMBER(8)     NOT NULL,
    id_cliente         NUMBER(6)     NOT NULL,
    nombre_completo    VARCHAR2(210) NOT NULL,
    total_bruto        NUMBER(10)    NOT NULL,
    tasa_descuento_pct NUMBER(5,2)   NOT NULL,
    monto_descuento    NUMBER(10)    NOT NULL,
    total_neto         NUMBER(10)    NOT NULL,
    cantidad_compras   NUMBER(4)     NOT NULL,
    fecha_liquidacion  DATE          DEFAULT SYSDATE NOT NULL,
    observacion        VARCHAR2(200),
    CONSTRAINT pk_liq_cliente PRIMARY KEY (id_liquidacion),
    CONSTRAINT fk_liq_cli FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
);

CREATE TABLE IF NOT EXISTS log_errores (
    id_log         NUMBER(8)     NOT NULL,
    codigo_error   VARCHAR2(50)  NOT NULL,
    mensaje_error  VARCHAR2(400) NOT NULL,
    modulo_origen  VARCHAR2(100) NOT NULL,
    usuario_bd     VARCHAR2(50)  DEFAULT USER NOT NULL,
    fecha_registro DATE          DEFAULT SYSDATE NOT NULL,
    CONSTRAINT pk_log_errores PRIMARY KEY (id_log)
);

CREATE TABLE IF NOT EXISTS auditoria_operacion (
    id_auditoria    NUMBER(8)    NOT NULL,
    tabla_afectada  VARCHAR2(30) NOT NULL,
    operacion       VARCHAR2(10) NOT NULL,
    usuario_bd      VARCHAR2(50) DEFAULT USER NOT NULL,
    fecha_operacion DATE         DEFAULT SYSDATE NOT NULL,
    CONSTRAINT pk_auditoria_op PRIMARY KEY (id_auditoria)
);

-- -----------------------------------------------------------------------------
-- 4. Clientes iniciales (los 5 del taller, ids 1 a 5). Idempotente por RUT.
-- -----------------------------------------------------------------------------
MERGE INTO cliente c
USING (
    SELECT 1 id_cliente, '15.482.913-4' rut, 'Carlos' nombres, 'Valenzuela Pinto' apellidos,
           'carlos.valenzuela@gmail.com' email, '+56981234567' telefono, 'Viña del Mar' comuna, 'PREMIUM' tipo_cliente FROM dual
    UNION ALL
    SELECT 2, '18.324.571-K', 'Valentina', 'Morales Soto', 'vale.morales@outlook.com', '+56972345678', 'Valparaíso', 'FRECUENTE' FROM dual
    UNION ALL
    SELECT 3, '19.874.120-2', 'Matías', 'Lagos Herrera', 'matias.lagos@gmail.com', '+56963456789', 'Concón', 'ESTANDAR' FROM dual
    UNION ALL
    SELECT 4, '14.102.345-8', 'Camila', 'Rojas Benítez', 'camila.rojas@vtr.net', '+56954567890', 'Quilpué', 'PREMIUM' FROM dual
    UNION ALL
    SELECT 5, '20.145.892-1', 'Ignacio', 'Garrido Ruiz', 'ignacio.garrido@gmail.com', '+56945678901', 'Viña del Mar', 'ESTANDAR' FROM dual
) s ON (c.rut = s.rut)
WHEN NOT MATCHED THEN
    INSERT (id_cliente, rut, nombres, apellidos, email, telefono, comuna, tipo_cliente)
    VALUES (s.id_cliente, s.rut, s.nombres, s.apellidos, s.email, s.telefono, s.comuna, s.tipo_cliente);

COMMIT;

-- -----------------------------------------------------------------------------
-- 5. Paquete PKG_SONIDO_VIVO - especificacion
--    El orden y el tipo de los parametros son el contrato con OraclePlSqlAdapter:
--    SimpleJdbcCall invoca por posicion.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_sonido_vivo IS
    c_nombre_tienda CONSTANT VARCHAR2(30) := 'Sonido Vivo';

    -- Tasa de descuento (%) segun el total bruto y el tipo de cliente.
    -- Regla del taller: < 200.000 -> 0 ; 200.000 a 700.000 -> 5 ; > 700.000 -> 10;
    -- los clientes PREMIUM suman 2 puntos.
    FUNCTION fn_tasa_descuento (
        p_total_bruto  IN NUMBER,
        p_tipo_cliente IN cliente.tipo_cliente%TYPE
    ) RETURN NUMBER;

    -- Monto de descuento en CLP para un cliente y un monto bruto (aplica
    -- fn_tasa_descuento con el tipo del cliente). Error -20001 si no existe.
    FUNCTION fn_calcular_descuento (
        p_customer_id  IN cliente.id_cliente%TYPE,
        p_gross_amount IN NUMBER
    ) RETURN NUMBER;

    -- Registra una venta PENDIENTE (cabecera + detalle) y devuelve la referencia
    -- (boleta) y los montos. El descuento NO se aplica aqui: igual que en el
    -- taller, se calcula al liquidar sobre el acumulado pendiente, asi que
    -- p_discount_clp es 0 y p_net_total = p_gross_total.
    -- Errores: -20001 cliente inexistente, -20002 producto, cantidad o precio invalidos.
    PROCEDURE sp_registrar_venta (
        p_customer_id    IN  cliente.id_cliente%TYPE,
        p_product_code   IN  VARCHAR2,
        p_quantity       IN  NUMBER,
        p_unit_price     IN  NUMBER,
        p_sale_reference OUT VARCHAR2,
        p_gross_total    OUT NUMBER,
        p_discount_clp   OUT NUMBER,
        p_net_total      OUT NUMBER
    );

    -- Liquida las ventas PENDIENTE con fecha hasta p_process_date inclusive:
    -- una fila de LIQUIDACION_CLIENTE por cliente (con su tasa de descuento) y las
    -- ventas pasan a LIQUIDADA, por lo que una segunda ejecucion no las repite.
    -- p_total_liquidated es la suma de los netos (despues del descuento).
    -- Error -20003 si la fecha es nula.
    PROCEDURE sp_liquidar_clientes (
        p_process_date        IN  DATE,
        p_processed_customers OUT NUMBER,
        p_total_liquidated    OUT NUMBER,
        p_status_message      OUT VARCHAR2
    );
END pkg_sonido_vivo;
/

-- -----------------------------------------------------------------------------
-- 6. Paquete PKG_SONIDO_VIVO - cuerpo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE BODY pkg_sonido_vivo IS

    -- PRIVADO: registra errores en LOG_ERRORES en una transaccion autonoma, asi la
    -- traza sobrevive al rollback de la venta o liquidacion que fallo.
    PROCEDURE sp_registrar_log (
        p_modulo  IN VARCHAR2,
        p_codigo  IN VARCHAR2,
        p_mensaje IN VARCHAR2
    ) IS
        PRAGMA AUTONOMOUS_TRANSACTION;
    BEGIN
        INSERT INTO log_errores (id_log, codigo_error, mensaje_error, modulo_origen)
        VALUES (seq_log_errores.NEXTVAL, SUBSTR(p_codigo, 1, 50), SUBSTR(p_mensaje, 1, 400), p_modulo);
        COMMIT;
    END sp_registrar_log;

    -- PUBLICO
    FUNCTION fn_tasa_descuento (
        p_total_bruto  IN NUMBER,
        p_tipo_cliente IN cliente.tipo_cliente%TYPE
    ) RETURN NUMBER IS
        v_tasa NUMBER(5,2);
    BEGIN
        IF p_total_bruto < 200000 THEN
            v_tasa := 0;
        ELSIF p_total_bruto <= 700000 THEN
            v_tasa := 5;
        ELSE
            v_tasa := 10;
        END IF;

        IF p_tipo_cliente = 'PREMIUM' THEN
            v_tasa := v_tasa + 2;
        END IF;

        RETURN v_tasa;
    END fn_tasa_descuento;

    -- PUBLICO
    FUNCTION fn_calcular_descuento (
        p_customer_id  IN cliente.id_cliente%TYPE,
        p_gross_amount IN NUMBER
    ) RETURN NUMBER IS
        v_tipo cliente.tipo_cliente%TYPE;
    BEGIN
        IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
            RETURN 0;
        END IF;

        SELECT tipo_cliente INTO v_tipo FROM cliente WHERE id_cliente = p_customer_id;

        RETURN ROUND(p_gross_amount * fn_tasa_descuento(p_gross_amount, v_tipo) / 100);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20001, 'Cliente no encontrado: ' || p_customer_id);
    END fn_calcular_descuento;

    -- PUBLICO
    PROCEDURE sp_registrar_venta (
        p_customer_id    IN  cliente.id_cliente%TYPE,
        p_product_code   IN  VARCHAR2,
        p_quantity       IN  NUMBER,
        p_unit_price     IN  NUMBER,
        p_sale_reference OUT VARCHAR2,
        p_gross_total    OUT NUMBER,
        p_discount_clp   OUT NUMBER,
        p_net_total      OUT NUMBER
    ) IS
        v_id_cliente cliente.id_cliente%TYPE;
        v_id_venta   venta.id_venta%TYPE;
        v_boleta     venta.nro_boleta%TYPE;
    BEGIN
        BEGIN
            SELECT id_cliente INTO v_id_cliente FROM cliente WHERE id_cliente = p_customer_id;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20001, 'Cliente no encontrado: ' || p_customer_id);
        END;

        IF p_product_code IS NULL OR LENGTH(TRIM(p_product_code)) = 0 OR LENGTH(p_product_code) > 50
           OR p_quantity IS NULL OR p_quantity < 1 OR p_quantity <> TRUNC(p_quantity)
           OR p_unit_price IS NULL OR p_unit_price < 1 OR p_unit_price <> TRUNC(p_unit_price) THEN
            RAISE_APPLICATION_ERROR(-20002,
                'Producto (1 a 50 caracteres), cantidad (entero >= 1) o precio unitario (entero >= 1) invalidos');
        END IF;

        p_gross_total  := p_quantity * p_unit_price;
        p_discount_clp := 0;
        p_net_total    := p_gross_total;

        v_id_venta := seq_venta.NEXTVAL;
        v_boleta   := seq_boleta.NEXTVAL;

        INSERT INTO venta (id_venta, nro_boleta, fecha_venta, id_cliente, subtotal, descuento, total, estado_venta)
        VALUES (v_id_venta, v_boleta, SYSDATE, v_id_cliente, p_gross_total, 0, p_gross_total, 'PENDIENTE');

        INSERT INTO detalle_venta (id_detalle, id_venta, codigo_producto, cantidad, precio_unitario, subtotal_linea)
        VALUES (seq_detalle.NEXTVAL, v_id_venta, p_product_code, p_quantity, p_unit_price, p_gross_total);

        p_sale_reference := 'BOL-' || v_boleta;
        -- Sin COMMIT: la transaccion la controla el llamador. Si el procedimiento
        -- falla, Oracle deshace los efectos de esta llamada completa.
    EXCEPTION
        WHEN OTHERS THEN
            sp_registrar_log('PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA', 'ERROR_' || SQLCODE, SQLERRM);
            RAISE;
    END sp_registrar_venta;

    -- PUBLICO
    PROCEDURE sp_liquidar_clientes (
        p_process_date        IN  DATE,
        p_processed_customers OUT NUMBER,
        p_total_liquidated    OUT NUMBER,
        p_status_message      OUT VARCHAR2
    ) IS
        v_limite    DATE;
        v_tasa      NUMBER(5,2);
        v_descuento NUMBER(10);
        v_ventas    NUMBER := 0;
    BEGIN
        IF p_process_date IS NULL THEN
            RAISE_APPLICATION_ERROR(-20003, 'La fecha de proceso es obligatoria');
        END IF;

        p_processed_customers := 0;
        p_total_liquidated    := 0;
        v_limite              := TRUNC(p_process_date) + 1;

        -- Bloquea las altas de venta mientras dura la liquidacion: asi lo que se
        -- suma en el cursor es exactamente lo que se marca como LIQUIDADA.
        LOCK TABLE venta IN SHARE ROW EXCLUSIVE MODE;

        FOR reg IN (
            SELECT c.id_cliente,
                   c.nombres || ' ' || c.apellidos AS nombre_completo,
                   c.tipo_cliente,
                   COUNT(v.id_venta) AS cant_compras,
                   SUM(v.total)      AS monto_acumulado
            FROM cliente c
            JOIN venta v ON c.id_cliente = v.id_cliente
            WHERE v.estado_venta = 'PENDIENTE'
              AND v.fecha_venta < v_limite
            GROUP BY c.id_cliente, c.nombres, c.apellidos, c.tipo_cliente
            ORDER BY c.id_cliente
        ) LOOP
            v_tasa      := fn_tasa_descuento(reg.monto_acumulado, reg.tipo_cliente);
            v_descuento := ROUND(reg.monto_acumulado * (v_tasa / 100));

            INSERT INTO liquidacion_cliente (
                id_liquidacion, id_cliente, nombre_completo, total_bruto,
                tasa_descuento_pct, monto_descuento, total_neto,
                cantidad_compras, fecha_liquidacion, observacion
            ) VALUES (
                seq_liquidacion_cliente.NEXTVAL, reg.id_cliente, reg.nombre_completo, reg.monto_acumulado,
                v_tasa, v_descuento, reg.monto_acumulado - v_descuento,
                reg.cant_compras, SYSDATE, 'Generada por SP_LIQUIDAR_CLIENTES'
            );

            UPDATE venta
               SET estado_venta = 'LIQUIDADA'
             WHERE id_cliente = reg.id_cliente
               AND estado_venta = 'PENDIENTE'
               AND fecha_venta < v_limite;

            p_processed_customers := p_processed_customers + 1;
            p_total_liquidated    := p_total_liquidated + (reg.monto_acumulado - v_descuento);
            v_ventas              := v_ventas + reg.cant_compras;
        END LOOP;

        IF p_processed_customers = 0 THEN
            p_status_message := 'SIN_MOVIMIENTOS: no hay ventas PENDIENTE hasta '
                                || TO_CHAR(TRUNC(p_process_date), 'YYYY-MM-DD');
        ELSE
            p_status_message := 'OK: ' || p_processed_customers || ' cliente(s) y ' || v_ventas
                                || ' venta(s) liquidados hasta ' || TO_CHAR(TRUNC(p_process_date), 'YYYY-MM-DD');
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            sp_registrar_log('PKG_SONIDO_VIVO.SP_LIQUIDAR_CLIENTES', 'ERROR_' || SQLCODE, SQLERRM);
            RAISE;
    END sp_liquidar_clientes;

END pkg_sonido_vivo;
/

-- -----------------------------------------------------------------------------
-- 7. Trigger de sentencia (del taller): una fila de auditoria por cada INSERT,
--    UPDATE o DELETE sobre VENTA, sin importar cuantas filas afecte.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_audita_venta
AFTER INSERT OR UPDATE OR DELETE ON venta
DECLARE
    v_operacion VARCHAR2(10);
BEGIN
    IF INSERTING THEN
        v_operacion := 'INSERT';
    ELSIF UPDATING THEN
        v_operacion := 'UPDATE';
    ELSE
        v_operacion := 'DELETE';
    END IF;

    INSERT INTO auditoria_operacion (id_auditoria, tabla_afectada, operacion)
    VALUES (seq_auditoria.NEXTVAL, 'VENTA', v_operacion);
END trg_audita_venta;
/

-- -----------------------------------------------------------------------------
-- 8. Verificacion de compilacion: SQL*Plus no aborta ante un objeto con errores.
-- -----------------------------------------------------------------------------
DECLARE
    v_errores NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_errores
      FROM dba_errors
     WHERE owner = 'SONIDO_VIVO'
       AND name IN ('PKG_SONIDO_VIVO', 'TRG_AUDITA_VENTA');
    IF v_errores > 0 THEN
        RAISE_APPLICATION_ERROR(-20999,
            'Objetos de SONIDO_VIVO compilaron con errores; revisar DBA_ERRORS');
    END IF;
    DBMS_OUTPUT.PUT_LINE('PKG_SONIDO_VIVO y TRG_AUDITA_VENTA compilados sin errores');
END;
/

EXIT
