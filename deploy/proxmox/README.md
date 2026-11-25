# Despliegue en Proxmox CT100 (Hermes y Dokploy)

Este directorio contiene los manifiestos de despliegue y configuración para ejecutar los servicios del ecosistema Sonido Vivo en el contenedor Proxmox CT100 (Docker Engine / Dokploy / Swarm).

La arquitectura optimiza el uso de memoria en CT100 (presupuesto estricto de RAM) conectando el backend y frontend a instancias de base de datos compartidas (Oracle 23ai y MongoDB 7.0) mediante redes Docker dedicadas (`hermes_net` o `dokploy_dokploy-network`), evitando la duplicación de motores de persistencia.

---

## Archivos de Despliegue

### 1. `.env.proxmox.example`
Plantilla de variables de entorno para parametrizar el contenedor o stack en CT100:
- **Puertos e imagen:** Configura `BACKEND_HOST_PORT` (por defecto `8085`), `BACKEND_IMAGE` y opciones de memoria JVM (`JAVA_OPTS=-XX:+UseContainerSupport -Xmx320m -Xms128m`).
- **Usuarios semilla:** Credenciales administrativas y operativas (`ADMIN_USERNAME`, `VENDEDOR_USERNAME`, `CLIENTE_USERNAME`).
- **Cadenas de conexión:**
  - *Modo A (Compose Standalone / Hermes):* Conexión por nombre de servicio en la red puente externa `hermes_net` (`oracle-23ai-sonidovivo:1521/FREEPDB1`, `mongodb-sonidovivo:27017`).
  - *Modo B (Docker Swarm / Dokploy):* Conexión mediante IP del host CT100 (`192.168.3.150:1521/FREEPDB1`, `192.168.3.150:27017`).
- **Resiliencia HikariCP:** Parámetros ajustados para restricción de memoria de 512 MB (`HIKARI_MAX_POOL_SIZE=5`, `HIKARI_MIN_IDLE=1`).
- **Seguridad y CORS:** Definición de clave JWT (`JWT_SECRET`) y orígenes web autorizados (`CORS_ALLOWED_ORIGINS`).

### 2. `docker-compose.proxmox.yml`
Manifiesto Docker Compose standalone para la arquitectura Hermes:
- Levanta exclusivamente el servicio `sonidovivo-backend` compilando desde el contexto local `../../backend`.
- Asigna límites estrictos de recursos (`mem_limit: 512m`, `cpus: "1.0"`).
- Se conecta a la red externa `hermes_net` para comunicarse con las bases de datos ya existentes en el servidor.
- Define sondeo de salud mediante HTTP Actuator (`http://localhost:8080/actuator/health`).

### 3. `docker-compose.dokploy.yml`
Pila Compose unificada para despliegue gestionado mediante Dokploy y proxy inverso Traefik:
- Orquesta tanto `sonidovivo-backend` (puerto host `8085`, límite 512 MB) como `sonidovivo-frontend` (puerto host `5173`, límite 128 MB).
- Conecta ambos contenedores a la red externa `dokploy-network` (`dokploy_dokploy-network`).
- Integra etiquetas Traefik en `sonidovivo-frontend` para enrutamiento automático mediante el dominio `sonidovivo.nzrkc.com`.
- Establece dependencia con condición `service_healthy` para garantizar que el frontend inicie sólo cuando el backend esté verificado.

### 4. `docker-compose.swarm.yml`
Manifiesto para despliegues en modo Docker Swarm (`docker stack deploy`):
- Despliega el backend utilizando imágenes empaquetadas (`${BACKEND_IMAGE:-sonidovivo-backend:latest}`).
- Publica el puerto 8080 en modo `host` (`BACKEND_HOST_PORT:-8085`).
- Configura bloques de gobernanza Swarm:
  - Réplicas: 1.
  - Límites de recursos: CPU 1.0, RAM 512M (reserva 256M).
  - Políticas de reinicio: `on-failure` con ventana de 120 segundos.
  - Actualizaciones graduales (`update_config`): parada previa (`stop-first`) y rollback automático ante error.
- Conecta a la red overlay externa `dokploy-network`.

---

## Comandos de Ejecución

### Preparación Previa
Antes de ejecutar cualquier despliegue, genere el archivo `.env.proxmox` a partir del ejemplo y complete las contraseñas requeridas:

```bash
# Desde la raíz del repositorio:
cp deploy/proxmox/.env.proxmox.example deploy/proxmox/.env.proxmox

# O si se encuentra en la carpeta deploy/proxmox/:
cp .env.proxmox.example .env.proxmox
```

Asegúrese de que la red externa correspondiente exista en el host Docker:
```bash
docker network inspect hermes_net >/dev/null 2>&1 || docker network create hermes_net
# O para Dokploy:
docker network inspect dokploy_dokploy-network >/dev/null 2>&1 || docker network create dokploy_dokploy-network
```

---

### Opción A: Despliegue con Docker Compose (Hermes Standalone)

Permite construir y levantar el backend conectado a `hermes_net`.

**Desde la raíz del repositorio:**
```bash
# Iniciar servicios en segundo plano con build local
docker compose -f deploy/proxmox/docker-compose.proxmox.yml --env-file deploy/proxmox/.env.proxmox up -d --build

# Ver logs de ejecución
docker compose -f deploy/proxmox/docker-compose.proxmox.yml logs -f sonidovivo-backend

# Detener servicios
docker compose -f deploy/proxmox/docker-compose.proxmox.yml --env-file deploy/proxmox/.env.proxmox down
```

**Desde la carpeta `deploy/proxmox/`:**
```bash
cd deploy/proxmox

# Iniciar
docker compose -f docker-compose.proxmox.yml --env-file .env.proxmox up -d --build

# Ver logs
docker compose -f docker-compose.proxmox.yml logs -f sonidovivo-backend

# Detener
docker compose -f docker-compose.proxmox.yml --env-file .env.proxmox down
```

---

### Opción B: Despliegue Unificado Dokploy (Backend + Frontend + Traefik)

Levanta la suite completa conectada a Traefik bajo `dokploy_dokploy-network`.

**Desde la raíz del repositorio:**
```bash
# Iniciar stack
docker compose -f deploy/proxmox/docker-compose.dokploy.yml --env-file deploy/proxmox/.env.proxmox up -d

# Inspeccionar estado
docker compose -f deploy/proxmox/docker-compose.dokploy.yml ps

# Detener stack
docker compose -f deploy/proxmox/docker-compose.dokploy.yml --env-file deploy/proxmox/.env.proxmox down
```

**Desde la carpeta `deploy/proxmox/`:**
```bash
cd deploy/proxmox

# Iniciar
docker compose -f docker-compose.dokploy.yml --env-file .env.proxmox up -d

# Inspeccionar estado
docker compose -f docker-compose.dokploy.yml ps

# Detener
docker compose -f docker-compose.dokploy.yml --env-file .env.proxmox down
```

---

### Opción C: Despliegue en Docker Swarm

Para entornos con orquestación Swarm habilitada en Dokploy.

**Desde la raíz del repositorio:**
```bash
# Desplegar stack
docker stack deploy -c deploy/proxmox/docker-compose.swarm.yml sonidovivo

# Verificar estado de tareas y servicios
docker stack ps sonidovivo
docker service logs -f sonidovivo_sonidovivo-backend

# Eliminar stack
docker stack rm sonidovivo
```

**Desde la carpeta `deploy/proxmox/`:**
```bash
cd deploy/proxmox

# Desplegar stack
docker stack deploy -c docker-compose.swarm.yml sonidovivo

# Verificar estado de tareas y servicios
docker stack ps sonidovivo
docker service logs -f sonidovivo_sonidovivo-backend

# Eliminar stack
docker stack rm sonidovivo
```
