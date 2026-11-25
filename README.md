# Sonido Vivo — Guía de Ejecución y Evaluación (Proyecto Fullstack)

Sistema e-commerce y gestión operativa para la tienda de instrumentos musicales y audio profesional **Sonido Vivo**, con persistencia políglota (**Oracle Database 23ai PL/SQL + MongoDB 7.0**), backend **Spring Boot (Java 21, Arquitectura Hexagonal)** y frontend **React + Vite**.

Esta guía está pensada para clonar, levantar y evaluar todo el ecosistema paso a paso de forma local usando **Docker Compose**, además de enlazar directamente a los repositorios y entregables originales de **Taller de Base de Datos (BDY1103)** y **Desarrollo Fullstack II (DSY1104)**.

---

## Índice de la Guía

1. [Paso 1: Ubicarse en el repositorio y repos fuente en GitHub](#paso-1-ubicarse-en-el-repositorio-y-repos-fuente-en-github)
2. [Paso 2: Requisitos previos y puesta en marcha con Docker](#paso-2-requisitos-previos-y-puesta-en-marcha-con-docker)
3. [Paso 3: Probar la aplicación web y la API (flujo completo)](#paso-3-probar-la-aplicación-web-y-la-api-flujo-completo)
4. [Paso 4: Verificar directamente Oracle PL/SQL y MongoDB](#paso-4-verificar-directamente-oracle-plsql-y-mongodb)
5. [Paso 5: Ejecutar pruebas automatizadas (opcional, fuera de Docker)](#paso-5-ejecutar-pruebas-automatizadas-opcional-fuera-de-docker)
6. [Paso 6: Apagado, reinicio limpio y solución de problemas](#paso-6-apagado-reinicio-limpio-y-solución-de-problemas)
7. [Arquitectura resumida y documentación técnica](#arquitectura-resumida-y-documentación-técnica)

---

## Paso 1: Ubicarse en el repositorio y repos fuente en GitHub

### Repositorios originales que componen este monorepo

Si deseas revisar el desarrollo independiente de cada asignatura, sus ramas históricas o los commits por módulo, puedes ir directamente a los tres repositorios de origen:

| Módulo | Carpeta aquí | Repositorio en GitHub | Qué contiene |
| :--- | :--- | :--- | :--- |
| **Base de Datos (BDY1103)** | `database/` | [NezerkC/taller-base-de-datos-](https://github.com/NezerkC/taller-base-de-datos-) | Entregables EP1 y EP2 (PL/SQL: `PKG_SONIDO_VIVO`, triggers, liquidaciones) y EP3 (MongoDB en rama `feat/ep3-mongodb-consolidada`). |
| **Backend Hexagonal** | `backend/` | [NezerkC/sonido-vivo-backend](https://github.com/NezerkC/sonido-vivo-backend) | API REST Spring Boot (Java 21), JWT stateless, adaptadores Oracle (`SimpleJdbcCall`) y MongoDB (`MongoTemplate`), más 165 pruebas JUnit/ArchUnit. |
| **Frontend Fullstack II** | `frontend/` | [NezerkC/fullstack_2](https://github.com/NezerkC/fullstack_2) | Aplicación React + Vite (`frontend/sonido-vivo-react/`), carrito, checkout y paneles POS/Admin. |

### Qué carpeta revisar según lo que quieras evaluar

```text
proyecto-fullstack/
├── docker-compose.yml                 # Orquestación única (MongoDB + Oracle + Backend + Frontend)
├── .env.example                       # Variables por defecto (docker-compose.yml ya trae fallbacks)
├── .github/workflows/ci.yml           # CI automático en cada push (Maven + oxlint/vite build)
├── contracts/                         # Contratos compartidos (OpenAPI/REST y JSON Schema MongoDB)
├── docs/                              # Guías de integración Backend-BD y Backend-Fullstack
├── database/                          # Historial académico BDY1103 (EP1, EP2, EP3, informes y scripts)
│   ├── parcial 1/                     # Scripts DDL/DML y bloques anónimos EP1
│   ├── parcial 2/ep2_sonido_vivo.sql  # Paquete y triggers originales EP2
│   └── parcial 3/ep3_sonido_vivo.js   # Modelo NoSQL, CRUD y agregaciones EP3
├── backend/                           # API Java 21 / Spring Boot y scripts Docker de bases de datos
│   ├── scripts/oracle/01_pkg_sonido_vivo.sql   # DDL + datos semilla + PKG_SONIDO_VIVO + TRG_AUDITA_VENTA
│   └── scripts/mongo/                          # Validador $jsonSchema, índices y catálogo semilla
└── frontend/
    └── sonido-vivo-react/             # SPA React + Vite servida con Nginx en Docker
```

> **Nota para evaluación de Base de Datos:** los scripts que se ejecutan automáticamente al levantar Docker están en [`backend/scripts/oracle/01_pkg_sonido_vivo.sql`](backend/scripts/oracle/01_pkg_sonido_vivo.sql) (adaptación productiva de [`database/parcial 2/ep2_sonido_vivo.sql`](database/parcial%202/ep2_sonido_vivo.sql) donde el catálogo y el stock pasan a MongoDB) y en [`backend/scripts/mongo/`](backend/scripts/mongo).

---

## Paso 2: Requisitos previos y puesta en marcha con Docker

### 2.1. Requisitos previos
- **Docker Desktop** (Windows/macOS) o **Docker Engine + Compose v2** (Linux).
- Al menos **5 GB de RAM** asignados a contenedores (`sonidovivo-oracle` usa `mem_limit: 3584m`).
- Puertos disponibles en el equipo host: `5173`, `8080`, `1521` y `27017`.

### 2.2. Clonar y levantar los 4 servicios

```bash
git clone https://github.com/NezerkC/proyecto-fullstack.git
cd proyecto-fullstack
docker compose up -d --build
```

> No es obligatorio crear un archivo `.env`: `docker-compose.yml` ya trae configurados los valores por defecto. Si quieres personalizar puertos o claves, copia antes `.env.example` a `.env`.

### 2.3. Esperar a que las bases de datos queden listas

En el **primer arranque**, la imagen oficial de Oracle Database Free (`container-registry.oracle.com/database/free`) descomprime ~4 GB y ejecuta `01_pkg_sonido_vivo.sql` desde `/opt/oracle/scripts/startup`. Esto suele demorar entre **3 y 25+ minutos** en Windows/Docker Desktop según CPU y disco (en arranques posteriores demora entre **1 y 3 minutos**).

`sonidovivo-backend` y `sonidovivo-frontend` esperan automáticamente a que `sonidovivo-mongodb` y `sonidovivo-oracle` pasen su `healthcheck`.

Para monitorear cuándo termina el arranque:

```bash
# Ver el progreso de Oracle hasta leer "DATABASE IS READY TO USE!" (Ctrl+C para salir del log)
docker logs -f sonidovivo-oracle

# Confirmar que los 4 contenedores están activos y saludables (healthy)
docker compose ps
```

El sistema estará listo cuando `docker compose ps` muestre:
- `sonidovivo-mongodb` -> `Up ... (healthy)`
- `sonidovivo-oracle` -> `Up ... (healthy)`
- `sonidovivo-backend` -> `Up ... (healthy)`
- `sonidovivo-frontend` -> `Up ...` en el puerto `5173`

---

## Paso 3: Probar la aplicación web y la API (flujo completo)

### 3.1. URLs y credenciales disponibles

| Servicio / Interfaz | Dirección / Conexión | Credenciales por defecto |
| :--- | :--- | :--- |
| **Aplicación Web (React)** | `http://localhost:5173` | Ver usuarios abajo |
| **Swagger UI (API REST)** | `http://localhost:8080/swagger-ui.html` | Bearer JWT desde `POST /api/v1/auth/login` |
| **Healthcheck Backend** | `http://localhost:8080/actuator/health` | Público |
| **Oracle Database 23ai** | `localhost:1521/FREEPDB1` | Usuario `sonido_vivo` / Clave `secret` (`SYS` clave `secret`) |
| **MongoDB 7.0** | `mongodb://localhost:27017/sonido_vivo_nosql` | Sin autenticación en modo local |

| Rol de aplicación | Usuario | Contraseña | Vistas habilitadas |
| :--- | :--- | :--- | :--- |
| `ROLE_CLIENTE` | `usuario` | `usuario123` | Catálogo (`/productos`), carrito (`/carrito`) y compra (`/checkout`) |
| `ROLE_VENDEDOR` | `vendedor` | `vendedor123` | Panel POS (`/vendedor`), ventas directas, ajuste de stock y alta de clientes |
| `ROLE_ADMIN` | `admin` | `admin123` | Panel completo (`/admin`), KPIs MongoDB, liquidaciones Oracle, exportación y CRUD |

### 3.2. Recorrido guiado sugerido

1. **Compra de cliente (integración MongoDB + Oracle en tiempo real):**
   - Entra a `http://localhost:5173/login` e inicia sesión con `usuario` / `usuario123` (o compra desde `/productos` -> `/carrito` -> `/checkout`).
   - Al confirmar la compra: el backend descuenta el stock atómicamente en MongoDB (`$inc` con guarda `stock_disponible >= cantidad`) y registra cabecera + detalle en Oracle llamando a `PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA`. Si Oracle falla, el backend compensa el stock en MongoDB.
2. **Operación de caja / POS (`/vendedor`):**
   - Inicia sesión con `vendedor` / `vendedor123` y navega a `http://localhost:5173/vendedor` para registrar ventas directas sobre clientes de Oracle, ajustar stock en MongoDB o crear clientes nuevos.
3. **Panel Administrativo y Liquidaciones Oracle (`/admin`):**
   - Inicia sesión con `admin` / `admin123` en `http://localhost:5173/admin`.
   - Revisa las métricas calculadas por el pipeline `$aggregate` de MongoDB, prueba `Exportar CSV / PDF / JSON` (`GET /api/v1/admin/dashboard/export`), ejecuta ajustes masivos de precios/stock y abre la pestaña de **Liquidaciones Oracle** para invocar `PKG_SONIDO_VIVO.SP_LIQUIDAR_CLIENTES`.
4. **Probar endpoints en Swagger (`http://localhost:8080/swagger-ui.html`):**
   - Ejecuta `POST /api/v1/auth/login` con `admin` / `admin123`, copia el `token` JWT y pulsa **Authorize** (`Bearer <token>`).
   - Prueba por ejemplo `POST /api/v1/admin/operations/liquidations` o `GET /api/v1/admin/dashboard/metrics`.

---

## Paso 4: Verificar directamente Oracle PL/SQL y MongoDB

Con los contenedores levantados, puedes entrar directo a ambos motores para inspeccionar tablas, paquetes, triggers, validadores, índices y agregaciones.

### 4.1. Verificar Oracle 23ai (`PKG_SONIDO_VIVO`, `TRG_AUDITA_VENTA` y `LOG_ERRORES`)

Abre SQL*Plus dentro del contenedor como esquema `SONIDO_VIVO`:

```bash
docker exec -it sonidovivo-oracle sqlplus sonido_vivo/secret@//localhost:1521/FREEPDB1
```

Dentro de SQL*Plus, pega el siguiente bloque paso a paso para comprobar los 5 clientes semilla, registrar una venta, ejecutar una liquidación, ver la auditoría del trigger y provocar un error controlado (`ORA-20001`) registrado por `PRAGMA AUTONOMOUS_TRANSACTION`:

```sql
SET SERVEROUTPUT ON SIZE UNLIMITED;

-- 1. Clientes iniciales cargados via MERGE (5 registros)
SELECT id_cliente, rut, nombres, apellidos, tipo_cliente
  FROM cliente
 ORDER BY id_cliente;

-- 2. Venta + calculo de descuento + liquidacion mediante PKG_SONIDO_VIVO
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

-- 3. Comprobar liquidacion generada y auditoria de TRG_AUDITA_VENTA
SELECT id_liquidacion, id_cliente, total_bruto, tasa_descuento_pct, monto_descuento, total_neto
  FROM liquidacion_cliente;

SELECT id_auditoria, tabla_afectada, operacion, TO_CHAR(fecha_operacion, 'YYYY-MM-DD HH24:MI:SS') AS fecha
  FROM auditoria_operacion;

-- 4. Provocar ORA-20001 (cliente inexistente) para verificar PRAGMA AUTONOMOUS_TRANSACTION
DECLARE
    v_ref VARCHAR2(30); v_bruto NUMBER; v_desc NUMBER; v_neto NUMBER;
BEGIN
    PKG_SONIDO_VIVO.SP_REGISTRAR_VENTA(999, 'G-FND-STRAT-01', 1, 849990, v_ref, v_bruto, v_desc, v_neto);
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error esperado: ' || SQLERRM);
END;
/

SELECT id_log, codigo_error, modulo_origen, mensaje_error
  FROM log_errores;
```

Para salir de SQL*Plus escribe `EXIT`.

### 4.2. Verificar MongoDB (`sonido_vivo_nosql`)

Abre la consola `mongosh` dentro del contenedor (funciona igual en Windows PowerShell, macOS y Linux sin problemas de escape de `$`):

```bash
docker exec -it sonidovivo-mongodb mongosh sonido_vivo_nosql
```

Dentro de `mongosh`, ejecuta estas consultas para verificar conteo de catálogo, los 4 índices (`idx_codigo_unique`, `idx_cat_precio`, `idx_tags`, `idx_espec_tipo`), el validador `$jsonSchema` y el pipeline `$aggregate`:

```javascript
// 1. Conteo de productos cargados (seed de 50 productos + base)
db.productos.countDocuments()

// 2. Indices configurados
db.productos.getIndexes().map(i => i.name)

// 3. Regla de validacion $jsonSchema vigente
db.getCollectionInfos({ name: 'productos' })[0].options.validator

// 4. Valorizacion de inventario por categoria ($aggregate)
db.productos.aggregate([
  { $match: { estado: 'ACTIVO' } },
  { $group: {
      _id: '$categoria',
      unidades: { $sum: '$stock_disponible' },
      valor_clp: { $sum: { $multiply: ['$precio_clp', '$stock_disponible'] } }
  }},
  { $sort: { valor_clp: -1 } }
]).toArray()
```

Para salir de `mongosh` escribe `exit`.

---

## Paso 5: Ejecutar pruebas automatizadas (opcional, fuera de Docker)

- **Backend (165 pruebas unitarias, de integración web y de arquitectura hexagonal ArchUnit):**
  ```bash
  cd backend
  ./mvnw test -B        # En Windows PowerShell: .\mvnw.cmd test -B
  ```
- **Frontend (lint con `oxlint` y compilación de producción con `vite build`):**
  ```bash
  cd frontend/sonido-vivo-react
  npm ci
  npm run lint
  npm run build
  ```
- **Frontend E2E con Playwright (requiere el stack levantado en `http://localhost:5173`):**
  ```bash
  cd frontend/sonido-vivo-react
  BASE_URL="http://localhost:5173" npm run test:ui
  # En Windows PowerShell:
  $env:BASE_URL="http://localhost:5173"; npm run test:ui
  ```

---

## Paso 6: Apagado, reinicio limpio y solución de problemas

- **Detener los contenedores conservando los datos en volúmenes:**
  ```bash
  docker compose down
  ```
- **Reiniciar el proyecto desde cero (borra `oracle_data` y `mongo_data` para reejecutar seeds e init SQL):**
  ```bash
  docker compose down -v
  docker compose up -d --build
  ```

### Problemas frecuentes

| Síntoma | Causa probable | Cómo resolverlo |
| :--- | :--- | :--- |
| `sonidovivo-oracle` tarda varios minutos o queda en `health: starting` | Primer inicio descomprimiendo ~4 GB de Oracle Free en Docker Desktop | Revisar `docker logs -f sonidovivo-oracle`; el `healthcheck` tolera hasta 30 min (`start_period: 1800s`). |
| `sonidovivo-oracle` muere o marca `unhealthy` enseguida | Docker tiene menos de 5 GB de RAM asignados | Subir memoria de Docker Desktop a >= 6 GB y ejecutar `docker compose up -d`. |
| Error de puerto en uso al iniciar (`5173`, `8080`, `1521`, `27017`) | Otro servicio local (Oracle, Mongo o Vite previo) ocupa el puerto | Detener el servicio en conflicto o ajustar `BACKEND_HOST_PORT` en `.env`. |
| Quiero repetir la evaluación con bases limpias | Hay ventas/liquidaciones previas guardadas en volúmenes | Ejecutar `docker compose down -v` y luego `docker compose up -d --build`. |

---

## Arquitectura resumida y documentación técnica

- **Oracle Database 23ai (`FREEPDB1`, esquema `SONIDO_VIVO`):** tablas `CLIENTE`, `VENTA`, `DETALLE_VENTA`, `LIQUIDACION_CLIENTE`, `LOG_ERRORES`, `AUDITORIA_OPERACION` y `SEQ_*`; paquete `PKG_SONIDO_VIVO` (`fn_tasa_descuento`, `fn_calcular_descuento`, `sp_registrar_venta`, `sp_liquidar_clientes` con bloqueo `SHARE ROW EXCLUSIVE`, `sp_registrar_log` con `PRAGMA AUTONOMOUS_TRANSACTION`) y trigger `TRG_AUDITA_VENTA`.
- **MongoDB 7.0 (`sonido_vivo_nosql`, colección `productos`):** validación estricta `$jsonSchema` (`validationLevel: strict`, `validationAction: error`), índices `idx_codigo_unique`, `idx_cat_precio`, `idx_tags` e `idx_espec_tipo`, decremento atómico de stock con `$inc` y analítica con `$aggregate`.

### Enlaces a contratos y manuales internos

- [Contrato de Persistencia MongoDB](contracts/CONTRACT_DATABASE_MONGODB.md)
- [Contrato REST y OpenAPI](contracts/CONTRACT_FULLSTACK_REST.md)
- [Integración Backend y Base de Datos](docs/BACKEND_DATABASE_INTEGRATION.md)
- [Integración Backend y Fullstack](docs/BACKEND_FULLSTACK_INTEGRATION.md)
- [Detalle de Integración Oracle PL/SQL](backend/docs/ORACLE_PLSQL_INTEGRATION.md)
- [Documentación del Taller de Base de Datos (BDY1103)](database/README.md)
