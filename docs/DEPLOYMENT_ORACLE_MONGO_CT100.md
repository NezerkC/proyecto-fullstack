# Despliegue e Inicialización: Oracle 23ai y MongoDB en Proxmox CT100

**Proyecto:** Sonido Vivo Backend (`sonido-vivo-backend`)  
**Infraestructura:** Host Proxmox `192.168.3.3` (pvehplaptop) | Contenedor Docker Engine `192.168.3.150` (CT100)  
**Objetivo:** Resolver el error OOM 137 del contenedor de Oracle Database 23ai Free, desplegar la base NoSQL MongoDB (`sonido_vivo_nosql`), compilar el paquete PL/SQL `PKG_SONIDO_VIVO` y parametrizar la conectividad del backend hexagonal.

---

## 1. Diagnóstico de Capacidad y Causa Raíz OOM 137

### 1.1 Presupuesto de Memoria RAM
* **Host Hipervisor (Proxmox VE 8):** 7.7 GiB físicos totales (~3.8 GiB utilizados por servicios base y reserva del host).
* **Contenedor Principal (CT100):** Límite configurado de **6.5 GiB RAM**.
  * Consumo actual base: ~1.9 GiB (Dokploy, Traefik, `reactsonidovivo-sekgas`).
  * Memoria libre disponible en CT100: **~4.6 GiB**.

### 1.2 Causa Raíz de `OOMKilled=true` (Exit Code 137)
El archivo `/opt/oracle-hermes/docker-compose.yml` en CT100 tenía configurado un límite estricto de memoria de `2048M` (`mem_limit: 2g`).  
El motor **Oracle Database 23ai Free** requiere un mínimo de **2.5 GiB a 3.2 GiB** durante la fase de inicialización de la instancia (SGA + PGA compartida) y el montaje del PDB (`FREEPDB1`). Al alcanzar los 2048 MB, el OOM-killer de Linux envió la señal `SIGKILL` (código de salida `137`).

---

## 2. Configuración de Servicios en CT100 (`docker-compose.yml`)

Ubicación en el servidor: `/opt/oracle-hermes/docker-compose.yml`

```yaml
version: '3.8'

services:
  oracle-23ai-sonidovivo:
    image: container-registry.oracle.com/database/free:latest
    container_name: oracle-23ai-sonidovivo
    restart: unless-stopped
    environment:
      - ORACLE_PWD=${ORACLE_PWD:-SonidoVivo2026#Secure}
      - ORACLE_CHARACTERSET=AL32UTF8
    ports:
      - "1521:1521"
    volumes:
      - /opt/oracle-hermes/oradata:/opt/oracle/oradata
      - /opt/oracle-hermes/scripts/oracle:/container-entrypoint-initdb.d
    deploy:
      resources:
        limits:
          memory: 3584M # 3.5 GiB: suficiente para SGA/PGA sin exceder los 6.5G de CT100
        reservations:
          memory: 2048M

  mongodb-sonidovivo:
    image: mongo:7.0
    container_name: mongodb-sonidovivo
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER:-admin}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASS:-SonidoVivoMongo2026#}
      - MONGO_INITDB_DATABASE=sonido_vivo_nosql
    ports:
      - "27017:27017"
    volumes:
      - /opt/oracle-hermes/mongodata:/data/db
      - /opt/oracle-hermes/scripts/mongo:/docker-entrypoint-initdb.d
    deploy:
      resources:
        limits:
          memory: 1024M # 1 GiB suficiente para catálogo y agregaciones
        reservations:
          memory: 512M

  cloudbeaver-sonidovivo:
    image: dbeaver/cloudbeaver:latest
    container_name: cloudbeaver-sonidovivo
    restart: unless-stopped
    ports:
      - "8978:8978"
    volumes:
      - /opt/oracle-hermes/cloudbeaver:/opt/cloudbeaver/workspace
    deploy:
      resources:
        limits:
          memory: 512M

networks:
  default:
    name: sonidovivo-net
```

---

## 3. Inicialización Relacional: `PKG_SONIDO_VIVO` (Oracle PL/SQL)

Ruta del script en CT100: `/opt/oracle-hermes/scripts/oracle/01_pkg_sonido_vivo.sql`

La fuente de verdad del script es `scripts/oracle/01_pkg_sonido_vivo.sql` de este repositorio; no se duplica aquí para evitar que ambos se desalineen. Para copiarlo a CT100:

```bash
scp scripts/oracle/01_pkg_sonido_vivo.sql root@192.168.3.150:/opt/oracle-hermes/scripts/oracle/
```

El script:

* Cambia al PDB `FREEPDB1` y crea el usuario local `SONIDO_VIVO` (los usuarios comunes `C##` no se pueden crear dentro de un PDB, ORA-65094). Clave por defecto `secret`, igual que `ORACLE_PASS` en `application.yaml`; cambiarla en la línea `CREATE USER` y en la variable `ORACLE_PASS` del backend.
* Crea las tablas `CLIENTE`, `VENTA`, `DETALLE_VENTA`, `LIQUIDACION_CLIENTE`, `LOG_ERRORES` y `AUDITORIA_OPERACION`, sus secuencias y 5 clientes iniciales.
* Compila el paquete `PKG_SONIDO_VIVO` (`SP_REGISTRAR_VENTA`, `SP_LIQUIDAR_CLIENTES`, `FN_CALCULAR_DESCUENTO`) y el trigger `TRG_AUDITA_VENTA`.

Firmas, reglas de negocio, decisiones y verificación: ver [ORACLE_PLSQL_INTEGRATION.md](ORACLE_PLSQL_INTEGRATION.md).

---

## 4. Inicialización NoSQL: MongoDB (`init-sonido-vivo.js`)

Ruta del script en CT100: `/opt/oracle-hermes/scripts/mongo/01_init_sonido_vivo.js`

```javascript
db = db.getSiblingDB('sonido_vivo_nosql');

// Creación de colección con validación estricta $jsonSchema
db.createCollection('productos', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['codigo', 'nombre', 'categoria', 'precio_clp', 'stock_disponible', 'estado'],
      properties: {
        codigo: {
          bsonType: 'string',
          pattern: '^[A-Z0-9_-]{3,50}$',
          description: 'Código SKU único obligatorio'
        },
        nombre: {
          bsonType: 'string',
          minLength: 3,
          description: 'Nombre comercial del producto'
        },
        categoria: {
          bsonType: 'string',
          description: 'Categoría (Guitarras, Audio Profesional, Micrófonos, etc.)'
        },
        precio_clp: {
          bsonType: 'int',
          minimum: 0,
          description: 'Precio en Pesos Chilenos mayor o igual a 0'
        },
        stock_disponible: {
          bsonType: 'int',
          minimum: 0,
          description: 'Cantidad física en bodega'
        },
        estado: {
          enum: ['ACTIVO', 'AGOTADO', 'DESCONTINUADO'],
          description: 'Estado de comercialización'
        },
        especificaciones: {
          bsonType: 'object',
          description: 'Atributos técnicos polimórficos'
        },
        tags: {
          bsonType: 'array',
          items: { bsonType: 'string' }
        },
        resenas: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['cliente_id', 'calificacion', 'fecha'],
            properties: {
              cliente_id: { bsonType: 'string' },
              calificacion: { bsonType: 'int', minimum: 1, maximum: 5 },
              comentario: { bsonType: 'string' },
              fecha: { bsonType: 'date' }
            }
          }
        }
      }
    }
  }
});

// Creación de los 4 Índices Requeridos por Contrato
db.productos.createIndex({ codigo: 1 }, { unique: true, name: 'idx_codigo_unique' });
db.productos.createIndex({ categoria: 1, precio_clp: 1 }, { name: 'idx_cat_precio' });
db.productos.createIndex({ tags: 1 }, { name: 'idx_tags' });
db.productos.createIndex({ "especificaciones.tipo": 1 }, { name: 'idx_espec_tipo' });

// Datos Semilla Iniciales
db.productos.insertMany([
  {
    codigo: 'MIC-SHURE-SM58',
    nombre: 'Micrófono Dinámico Cardioide Shure SM58',
    categoria: 'Micrófonos',
    precio_clp: NumberInt(129990),
    stock_disponible: NumberInt(25),
    estado: 'ACTIVO',
    especificaciones: { tipo: 'Dinámico', patron: 'Cardioide', respuesta: '50Hz - 15kHz' },
    tags: ['estudio', 'en-vivo', 'vocal', 'shure'],
    resenas: []
  },
  {
    codigo: 'INT-FOCUSRITE-2I2',
    nombre: 'Interfaz de Audio Focusrite Scarlett 2i2 4ta Gen',
    categoria: 'Audio Profesional',
    precio_clp: NumberInt(189990),
    stock_disponible: NumberInt(12),
    estado: 'ACTIVO',
    especificaciones: { tipo: 'USB-C', entradas: 2, salidas: 2, resolucion: '24-bit/192kHz' },
    tags: ['interfaz', 'home-studio', 'usb-c'],
    resenas: []
  }
]);
```

---

## 5. Conexión del Backend (`application.yaml`)

El backend hexagonal en Spring Boot 3/4 se conecta desde la estación local o desplegado en contenedor hacia CT100 (`192.168.3.150`):

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://${MONGO_USER:admin}:${MONGO_PASS:SonidoVivoMongo2026%23}@${MONGO_HOST:192.168.3.150}:${MONGO_PORT:27017}/${MONGO_DB:sonido_vivo_nosql}?authSource=admin

  datasource:
    url: jdbc:oracle:thin:@//${ORACLE_HOST:192.168.3.150}:${ORACLE_PORT:1521}/${ORACLE_SERVICE:FREEPDB1}
    username: ${ORACLE_USER:sonido_vivo}
    password: ${ORACLE_PASS:secret}
    driver-class-name: oracle.jdbc.OracleDriver
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      idle-timeout: 30000

server:
  port: ${SERVER_PORT:8081} # Usar 8081 si :8080 está ocupado por Adminer en CT100

app:
  jwt:
    secret: ${JWT_SECRET:8Zz5tw0Ionm3XPZZfN0NOml3z9FMfmpgXwovR9fp6ryDIoPbdGFGjp92ssK+}
    expiration-ms: ${JWT_EXPIRATION_MS:86400000}

cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://192.168.3.150:80,http://192.168.3.150:5173}
```

---

## 6. Procedimiento de Ejecución en CT100

1. **Conectar por SSH a CT100:**
   ```bash
   ssh root@192.168.3.150
   ```
2. **Crear directorios de scripts y datos:**
   ```bash
   mkdir -p /opt/oracle-hermes/scripts/oracle /opt/oracle-hermes/scripts/mongo
   mkdir -p /opt/oracle-hermes/oradata /opt/oracle-hermes/mongodata
   ```
3. **Copiar los scripts de inicialización y levantar el stack:**
   ```bash
   cd /opt/oracle-hermes
   docker compose down
   docker compose up -d
   ```
4. **Verificar estado de salud y logs sin OOM:**
   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   docker stats --no-stream
   ```
5. **Verificar inicialización de Oracle:**
   ```bash
   docker logs -f oracle-23ai-sonidovivo
   # Esperar mensaje: "DATABASE IS READY TO USE!"
   ```
6. **Verificar `/actuator/health` en el Backend:**
   ```bash
   curl -s http://localhost:8081/actuator/health | jq .
   ```
