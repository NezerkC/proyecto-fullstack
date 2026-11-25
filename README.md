# Sonido Vivo — Ecosistema Omnicanal (Proyecto Fullstack)

Plataforma e-commerce y gestión operativa para la tienda de instrumentos musicales y audio profesional **Sonido Vivo**, consolidando persistencia políglota (**Oracle Database 23ai PL/SQL + MongoDB 7.0**), backend **Spring Boot (Java 21, Arquitectura Hexagonal)** y frontend **React + Vite**.

Este repositorio unifica mediante `git subtree` (preservando sus historiales completos) los tres repositorios originales desarrollados para las asignaturas de **Taller de Base de Datos (BDY1103)** y **Desarrollo Fullstack II (DSY1104)** en Duoc UC.

---

## Repositorios de Origen en GitHub

Para inspeccionar el desarrollo independiente, las ramas académicas, los entregables por evaluación parcial o el historial original de cada módulo, puedes ir directamente a los tres repositorios fuente:

| Módulo | Carpeta en este monorepo | Repositorio en GitHub | Alcance principal |
| :--- | :--- | :--- | :--- |
| **Base de Datos (BDY1103)** | `database/` | [NezerkC/taller-base-de-datos-](https://github.com/NezerkC/taller-base-de-datos-) | Scripts SQL/PL-SQL (EP1 y EP2: `PKG_SONIDO_VIVO`, triggers, liquidaciones) y NoSQL MongoDB (EP3 en rama `feat/ep3-mongodb-consolidada`). |
| **Backend Hexagonal** | `backend/` | [NezerkC/sonido-vivo-backend](https://github.com/NezerkC/sonido-vivo-backend) | API REST Spring Boot (Java 21), JWT stateless, adaptadores JDBC/`SimpleJdbcCall` (Oracle) y `MongoTemplate` (MongoDB), y suite de 165 pruebas JUnit/ArchUnit. |
| **Frontend Fullstack II** | `frontend/` | [NezerkC/fullstack_2](https://github.com/NezerkC/fullstack_2) | Tienda pública React + Vite (`frontend/sonido-vivo-react/`), carrito, checkout y paneles de Administrador y Vendedor. |

---

## Estructura del Repositorio

```text
proyecto-fullstack/
├── docker-compose.yml                 # Orquestación local completa (Oracle + MongoDB + Backend + Frontend)
├── .env.example                       # Variables de entorno por defecto para Docker Compose
├── .github/workflows/ci.yml           # Pipeline CI (pruebas Maven + lint/build Frontend)
├── contracts/                         # Contratos compartidos (OpenAPI/REST y JSON Schema MongoDB)
├── docs/                              # Guías de integración Backend-BD y Backend-Fullstack
├── deploy/proxmox/                    # Manifiestos alternativos para servidor Proxmox / Dokploy / Swarm
├── database/                          # Historial completo e informes de Taller de Base de Datos (EP1, EP2, EP3)
├── backend/                           # Código Java 21 / Spring Boot y scripts de inicialización Docker
│   ├── scripts/oracle/01_pkg_sonido_vivo.sql   # DDL + datos + PKG_SONIDO_VIVO + TRG_AUDITA_VENTA
│   └── scripts/mongo/                          # Validador $jsonSchema, índices y carga de 50 productos
└── frontend/                          # Historial académico y aplicación SPA en React + Vite
    └── sonido-vivo-react/
```

---

## Arquitectura de Persistencia Políglota

El backend separa la responsabilidad de almacenamiento según la naturaleza de los datos:

1. **Oracle Database 23ai Free (`FREEPDB1`, esquema `SONIDO_VIVO`) — Núcleo Transaccional:**
   - Inicializado automáticamente por Docker con `backend/scripts/oracle/01_pkg_sonido_vivo.sql` (adaptación productiva de `database/parcial 2/ep2_sonido_vivo.sql`).
   - **Tablas y secuencias:** `CLIENTE`, `VENTA`, `DETALLE_VENTA`, `LIQUIDACION_CLIENTE`, `LOG_ERRORES`, `AUDITORIA_OPERACION` y `SEQ_*`, con 5 clientes iniciales cargados vía `MERGE`.
   - **Paquete PL/SQL `PKG_SONIDO_VIVO`:**
     - `fn_tasa_descuento` y `fn_calcular_descuento` (tramos por monto y bonificación `+2%` para clientes `PREMIUM`).
     - `sp_registrar_venta` (genera boleta `BOL-*`, cabecera `VENTA` en estado `PENDIENTE` y `DETALLE_VENTA` sin `COMMIT` interno para permitir rollback coordinado).
     - `sp_liquidar_clientes` (bloqueo `SHARE ROW EXCLUSIVE`, cálculo de descuentos acumulados, inserción en `LIQUIDACION_CLIENTE` y transición a `LIQUIDADA`).
     - `sp_registrar_log` (privado con `PRAGMA AUTONOMOUS_TRANSACTION` para persistir trazas en `LOG_ERRORES` incluso ante `ROLLBACK`).
   - **Trigger de sentencia:** `TRG_AUDITA_VENTA` (`AFTER INSERT OR UPDATE OR DELETE ON venta`), registrando operaciones en `AUDITORIA_OPERACION`.

2. **MongoDB 7.0 (`sonido_vivo_nosql`, colección `productos`) — Catálogo Polimórfico y Analítica:**
   - Inicializado automáticamente por Docker con `init-sonido-vivo.js` y `seed-50-productos.js`.
   - **Validación en motor:** `$jsonSchema` estricto (`validationLevel: strict`, `validationAction: error`) para patrón SKU, rango de precios en CLP, stock no negativo, estados (`ACTIVO`, `AGOTADO`, `DESCONTINUADO`) y reseñas embebidas.
   - **Índices:** `idx_codigo_unique` (único), `idx_cat_precio` (compuesto), `idx_tags` (multikey) e `idx_espec_tipo` (polimórfico).
   - **Consistencia de inventario:** las ventas ejecutan primero decremento atómico (`$inc` con guarda `stock_disponible >= cantidad`) en MongoDB y luego `PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA` en Oracle; si Oracle falla, el backend compensa el stock en MongoDB.
   - **Analítica:** el dashboard administrativo delega KPIs y valorización al pipeline `$aggregate` (`$match` -> `$group` -> `$sort`).

---

## Puesta en Marcha con Docker

### Requisitos previos
- **Docker Desktop** (o Docker Engine + Compose v2) con al menos **5 GB de RAM** asignados a contenedores (`sonidovivo-oracle` tiene configurado `mem_limit: 3584m`).
- Puertos libres en el host: `5173`, `8080`, `1521` y `27017`.

### Levantar todo el ecosistema

```bash
git clone https://github.com/NezerkC/proyecto-fullstack.git
cd proyecto-fullstack
# Opcional: cp .env.example .env (docker-compose.yml ya incluye valores por defecto listos para prueba local)
docker compose up -d --build
```

> **Nota sobre el primer arranque:** Oracle Database 23ai Free tarda aproximadamente **1 a 3 minutos** la primera vez en crear la PDB `FREEPDB1` y compilar `01_pkg_sonido_vivo.sql`. El servicio `sonidovivo-backend` esperará automáticamente a que `sonidovivo-oracle` y `sonidovivo-mongodb` reporten estado `healthy`.

Para seguir el avance del arranque:

```bash
docker compose ps
docker logs -f sonidovivo-oracle   # Esperar hasta ver "DATABASE IS READY TO USE!"
```

Para detener y limpiar contenedores (agrega `-v` si deseas reiniciar las bases de datos desde cero):

```bash
docker compose down
```

---

## Accesos y Credenciales de Prueba

| Servicio / Interfaz | URL / Cadena de conexión | Credenciales por defecto |
| :--- | :--- | :--- |
| **Frontend Web (React + Nginx)** | `http://localhost:5173` | Ver usuarios de aplicación abajo |
| **API Backend (Health)** | `http://localhost:8080/actuator/health` | Público |
| **Swagger UI (OpenAPI 3)** | `http://localhost:8080/swagger-ui.html` | Autenticar con Bearer JWT (`/api/v1/auth/login`) |
| **Oracle Database 23ai (`FREEPDB1`)** | `localhost:1521/FREEPDB1` | Usuario `sonido_vivo` / Clave `secret` (`SYS` clave `secret`) |
| **MongoDB 7.0** | `mongodb://localhost:27017/sonido_vivo_nosql` | Sin autenticación en modo local |

**Usuarios de la aplicación:**

| Rol | Usuario | Contraseña | Vistas y operaciones habilitadas |
| :--- | :--- | :--- | :--- |
| `ROLE_ADMIN` | `admin` | `admin123` | Panel completo (`/admin`), métricas MongoDB, liquidaciones Oracle, ajuste masivo de precios, CRUD productos/clientes |
| `ROLE_VENDEDOR` | `vendedor` | `vendedor123` | Panel POS (`/vendedor`), ventas directas, ajuste de stock y alta de clientes |
| `ROLE_CLIENTE` | `usuario` | `usuario123` | Tienda pública (`/productos`), carrito (`/carrito`) y checkout (`/checkout`) |

---

## Guía de Verificación para Evaluación de Base de Datos

Con el stack en ejecución (`docker compose ps` mostrando los 4 contenedores arriba y `healthy`), puedes verificar directamente ambos motores:

### 1. Verificar Oracle 23ai (`PKG_SONIDO_VIVO`, Trigger y `LOG_ERRORES`)

Abrir consola SQL*Plus dentro del contenedor como esquema `SONIDO_VIVO`:

```bash
docker exec -it sonidovivo-oracle sqlplus sonido_vivo/secret@//localhost:1521/FREEPDB1
```

Dentro de SQL*Plus, comprobar objetos, datos iniciales y ejecutar una venta + liquidación + error controlado:

```sql
SET SERVEROUTPUT ON SIZE UNLIMITED;

-- 1. Verificar clientes semilla (5 registros)
SELECT id_cliente, rut, nombres, apellidos, tipo_cliente FROM cliente ORDER BY id_cliente;

-- 2. Probar paquete PKG_SONIDO_VIVO (venta, descuento y liquidacion)
DECLARE
    v_ref      VARCHAR2(30);
    v_bruto    NUMBER;
    v_desc     NUMBER;
    v_neto     NUMBER;
    v_clientes NUMBER;
    v_total    NUMBER;
    v_msg      VARCHAR2(200);
BEGIN
    PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA(1, 'G-FND-STRAT-01', 1, 849990, v_ref, v_bruto, v_desc, v_neto);
    DBMS_OUTPUT.PUT_LINE('Venta creada: ' || v_ref || ' | Bruto=' || v_bruto);

    DBMS_OUTPUT.PUT_LINE('Descuento estimado cliente 1: ' || PKG_SONIDO_VIVO.FN_CALCULAR_DESCUENTO(1, v_bruto));

    PKG_SONIDO_VIVO.SP_LIQUIDAR_CLIENTES(TRUNC(SYSDATE), v_clientes, v_total, v_msg);
    DBMS_OUTPUT.PUT_LINE(v_msg || ' | Total neto=' || v_total);
    COMMIT;
END;
/

-- 3. Verificar liquidacion y auditoria del trigger TRG_AUDITA_VENTA
SELECT id_liquidacion, id_cliente, total_bruto, tasa_descuento_pct, monto_descuento, total_neto FROM liquidacion_cliente;
SELECT id_auditoria, tabla_afectada, operacion, TO_CHAR(fecha_operacion, 'YYYY-MM-DD HH24:MI:SS') AS fecha FROM auditoria_operacion;

-- 4. Probar PRAGMA AUTONOMOUS_TRANSACTION provocando ORA-20001 (cliente inexistente)
DECLARE
    v_ref VARCHAR2(30); v_bruto NUMBER; v_desc NUMBER; v_neto NUMBER;
BEGIN
    PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA(999, 'G-FND-STRAT-01', 1, 849990, v_ref, v_bruto, v_desc, v_neto);
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error esperado: ' || SQLERRM);
END;
/
SELECT id_log, codigo_error, modulo_origen, mensaje_error FROM log_errores;
```

### 2. Verificar MongoDB (`sonido_vivo_nosql`)

```bash
docker exec -i sonidovivo-mongodb mongosh --quiet sonido_vivo_nosql --eval "
print('Total productos:', db.productos.countDocuments());
printjson(db.productos.getIndexes().map(i => i.name));
printjson(db.productos.aggregate([
  { \$match: { estado: 'ACTIVO' } },
  { \$group: {
      _id: '\$categoria',
      unidades: { \$sum: '\$stock_disponible' },
      valor_clp: { \$sum: { \$multiply: ['\$precio_clp', '\$stock_disponible'] } }
  }},
  { \$sort: { valor_clp: -1 } }
]).toArray());
"
```

### 3. Probar la Integración Completa desde la Web o API

- Ingresar a `http://localhost:5173/login` con `admin` / `admin123` para ver el Dashboard conectado al pipeline `$aggregate` de MongoDB, ajustar stock en tiempo real y gestionar clientes almacenados en Oracle.
- Realizar una compra en `http://localhost:5173/checkout` (descuenta stock atómicamente en MongoDB y registra `VENTA` + `DETALLE_VENTA` vía `PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA` en Oracle).
- Ejecutar liquidación vía Swagger (`http://localhost:8080/swagger-ui.html`) en `POST /api/v1/admin/operations/liquidations`.

---

## Ejecución de Pruebas Sin Docker

- **Backend (165 pruebas unitarias, integración web y arquitectura hexagonal ArchUnit):**
  ```bash
  cd backend
  ./mvnw test -B        # En Windows PowerShell: .\mvnw.cmd test -B
  ```
- **Frontend (lint y compilación de producción):**
  ```bash
  cd frontend/sonido-vivo-react
  npm ci
  npm run lint
  npm run build
  ```

---

## Documentación Adicional

- [Contrato de Persistencia MongoDB](contracts/CONTRACT_DATABASE_MONGODB.md)
- [Contrato REST y OpenAPI](contracts/CONTRACT_FULLSTACK_REST.md)
- [Integración Backend y Base de Datos](docs/BACKEND_DATABASE_INTEGRATION.md)
- [Integración Backend y Fullstack](docs/BACKEND_FULLSTACK_INTEGRATION.md)
- [Detalle de Integración Oracle PL/SQL](backend/docs/ORACLE_PLSQL_INTEGRATION.md)
- [Despliegue Proxmox / Dokploy](deploy/proxmox/)
