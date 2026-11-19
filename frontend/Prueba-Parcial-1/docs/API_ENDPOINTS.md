# Sonido Vivo — Especificación Oficial de la API REST
**Versión:** 1.0.0  
**Stack de Servidor:** Spring Boot 3.3+ (Java 21 LTS, Maven)  
**Persistencia:** MongoDB (Spring Data MongoDB) & Motor Relacional  
**Clientes Consumidores:** React Admin Dashboard (Vite) & Web Pública  
**Base URL:** `http://localhost:8080/api/v1`  
**Seguridad:** Bearer JWT Token (`Authorization: Bearer <token>`)

---

## 1. Resumen Ejecutivo de la Arquitectura de Endpoints

Esta API desacopla el frontend de React de la persistencia de datos mediante **Arquitectura Hexagonal**, exponiendo endpoints REST normalizados con validaciones estrictas en la frontera (`jakarta.validation`). 

Cubre los requerimientos académicos y profesionales de:
1. **Fullstack II (Unidad 3):** Conexión segura frontend-backend, CRUD de entidades, manejo de sesión/roles y consumo reactivo.
2. **Taller de Base de Datos (Unidad 3 NoSQL):** Manejo de esquemas polimórficos, subdocumentos embebidos (`resenas`), operaciones atómicas (`$inc`, `$push`), pipelines de agregación (`$aggregate`) para métricas de inventario, y equivalencia REST para los procedimientos de negocio (`prc_calcula_precio`).

---

## 2. Dominio 1: Autenticación y Control de Acceso (`/auth`)

### 2.1 Iniciar Sesión de Administrador
* **Método:** `POST`
* **Ruta:** `/auth/login`
* **Acceso:** Público
* **Descripción:** Valida credenciales contra la base de datos y genera un token JWT firmado para proteger el acceso a las rutas `/admin/*`.
* **Request Body:**
```json
{
  "username": "admin",
  "password": "Password123!"
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tipo": "Bearer",
  "expiraEnSegundos": 86400,
  "usuario": {
    "id": "672f0a1b2c3d4e5f6a7b8c9d",
    "nombre": "Martín Gómez",
    "email": "martin.gomez@sonidovivo.cl",
    "rol": "ROLE_ADMIN"
  }
}
```
* **Errores:**
  * `401 Unauthorized`: Credenciales inválidas o cuenta deshabilitada.

---

## 3. Dominio 2: Catálogo Polimórfico y Productos NoSQL (`/admin/products`)

Los productos utilizan el modelo documental BSON definido en `sonido_vivo_nosql`, permitiendo atributos polimórficos bajo el objeto `especificaciones`.

### 3.1 Listar Inventario Paginado
* **Método:** `GET`
* **Ruta:** `/admin/products`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Query Params:**
  * `page` (int, default: 0)
  * `size` (int, default: 10)
  * `categoria` (string, opcional: "Cuerdas", "Audio Pro", "Teclados", "Percusion", "Accesorios")
  * `estado` (string, opcional: "ACTIVO", "AGOTADO", "DESCONTINUADO")
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "contenido": [
    {
      "codigo": "G-FND-STRAT-01",
      "nombre": "Fender Player Stratocaster Polar White",
      "categoria": "Cuerdas",
      "precio_clp": 849990,
      "stock_disponible": 5,
      "estado": "ACTIVO",
      "especificaciones": {
        "tipo": "Guitarra Eléctrica",
        "cuerpo": "Aliso",
        "mastil": "Arce",
        "trastes": 22
      },
      "tags": ["fender", "stratocaster", "guitarra", "electrica", "pro"]
    }
  ],
  "totalElementos": 45,
  "totalPaginas": 5,
  "paginaActual": 0
}
```

### 3.2 Obtener Detalle de Producto por Código
* **Método:** `GET`
* **Ruta:** `/admin/products/{codigo}`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Respuesta Exitosa (`200 OK`):** Retorna el documento completo con el array embebido de `resenas`.
* **Errores:** `404 Not Found` si el código no existe.

### 3.3 Crear Nuevo Producto con Esquema Dinámico
* **Método:** `POST`
* **Ruta:** `/admin/products`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Request Body:**
```json
{
  "codigo": "ACC-BOS-DS1-01",
  "nombre": "Boss DS-1 Distortion Pedal para Guitarra",
  "categoria": "Accesorios",
  "precio_clp": 69990,
  "stock_disponible": 12,
  "especificaciones": {
    "tipo": "Pedal de Efecto",
    "efecto": "Distorsión clásica analógica",
    "controles": ["Tone", "Dist", "Level"],
    "alimentacion": "Batería 9V o adaptador AC"
  },
  "tags": ["boss", "pedal", "distorsion", "guitarra"]
}
```
* **Respuesta Exitosa (`201 Created`):** Retorna el producto creado con su ID generado.

### 3.4 Actualizar Producto
* **Método:** `PUT`
* **Ruta:** `/admin/products/{codigo}`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Request Body:** Objeto con datos actualizados (nombre, precio, especificaciones, tags).
* **Respuesta Exitosa (`200 OK`)**

### 3.5 Búsqueda Avanzada por Atributos Dinámicos
* **Método:** `GET`
* **Ruta:** `/admin/products/search`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Query Params:**
  * `claveAtributo`: nombre del campo anidado (ej. `mastil`, `patron_polar`, `teclas`)
  * `valorAtributo`: valor a coincidir (ej. `Arce`, `Cardioide`, `88`)
  * `precioMin`, `precioMax`: rango monetario en CLP.
* **Respuesta Exitosa (`200 OK`):** Lista de productos que cumplen el filtro anidado.

### 3.6 Ajuste Atómico de Stock (Operador `$inc`)
* **Método:** `PATCH`
* **Ruta:** `/admin/products/{codigo}/stock`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Descripción:** Ejecuta una actualización atómica en MongoDB. Valida que `stock_disponible + delta >= 0` (invariante de inventario).
* **Request Body:**
```json
{
  "delta": -1,
  "motivo": "VENTA_DIRECTA_MOSTRADOR"
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "codigo": "G-FND-STRAT-01",
  "stock_disponible": 4,
  "ultima_modificacion": "2026-11-10T02:00:00Z"
}
```

### 3.7 Borrado Lógico y Estado (Soft Delete)
* **Método:** `PATCH`
* **Ruta:** `/admin/products/{codigo}/status`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Request Body:**
```json
{
  "estado": "DESCONTINUADO"
}
```
* **Respuesta Exitosa (`200 OK`):** Estampa la `fecha_baja` y cambia el estado a `DESCONTINUADO` sin destruir el registro físico.

### 3.8 Registrar Reseña de Cliente (Operador `$push`)
* **Método:** `POST`
* **Ruta:** `/admin/products/{codigo}/reviews`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Request Body:**
```json
{
  "cliente": "Dylan Sandoval",
  "calificacion": 5,
  "comentario": "Excelente calibración de fábrica. El mástil es sumamente cómodo."
}
```
* **Respuesta Exitosa (`201 Created`):** Retorna el array de reseñas actualizado.

---

## 4. Dominio 3: Gestión de Clientes (`/admin/customers`)

### 4.1 Listar Clientes
* **Método:** `GET`
* **Ruta:** `/admin/customers`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Respuesta Exitosa (`200 OK`):** Lista completa de clientes registrados.

### 4.2 Registrar Cliente con Validación de Formato
* **Método:** `POST`
* **Ruta:** `/admin/customers`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Descripción:** Implementa la regla de negocio de validación de correo equivalente a `fun_valida_email`.
* **Request Body:**
```json
{
  "rut": "18.456.789-0",
  "nombre": "Carlos",
  "apellido": "Santana",
  "email": "carlos.santana@rockmail.com",
  "telefono": "+56912345678",
  "comuna": "Viña del Mar",
  "region": "Valparaíso"
}
```
* **Respuesta Exitosa (`201 Created`)**
* **Errores:** `400 Bad Request` si el email o RUT no cumplen con la expresión regular de formato.

### 4.3 Actualizar Cliente
* **Método:** `PUT`
* **Ruta:** `/admin/customers/{id}`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Respuesta Exitosa (`200 OK`)**

---

## 5. Dominio 4: Métricas del Dashboard y Procedimientos Masivos

### 5.1 Métricas de Inventario Valorizado (`$aggregate`)
* **Método:** `GET`
* **Ruta:** `/admin/dashboard/metrics`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Descripción:** Ejecuta el pipeline de agregación en MongoDB para alimentar en tiempo real las tarjetas y gráficos del Dashboard en React.
* **Pipeline en Backend:**
```javascript
db.productos.aggregate([
  { $match: { estado: "ACTIVO" } },
  {
    $group: {
      _id: "$categoria",
      total_unidades: { $sum: "$stock_disponible" },
      valor_total_inventario: { $sum: { $multiply: ["$precio_clp", "$stock_disponible"] } },
      precio_promedio: { $avg: "$precio_clp" }
    }
  },
  { $sort: { valor_total_inventario: -1 } }
])
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "kpis": {
    "capitalTotalEnBodega": 34890000,
    "unidadesTotales": 28,
    "categoriasActivas": 5
  },
  "desglosePorCategoria": [
    {
      "categoria": "Cuerdas",
      "total_unidades": 5,
      "valor_total_inventario": 4249950,
      "precio_promedio": 849990
    },
    {
      "categoria": "Percusion",
      "total_unidades": 2,
      "valor_total_inventario": 3599980,
      "precio_promedio": 1799990
    },
    {
      "categoria": "Audio Pro",
      "total_unidades": 18,
      "valor_total_inventario": 2519820,
      "precio_promedio": 139990
    }
  ]
}
```

### 5.2 Reajuste Masivo de Precios (`prc_calcula_precio`)
* **Método:** `POST`
* **Ruta:** `/admin/operations/price-adjustment`
* **Acceso:** Protegido (`ROLE_ADMIN`)
* **Descripción:** Implementa la lógica del procedimiento almacenado `prc_calcula_precio` de la guía 2.4.2 de APEX. Aplica un porcentaje de incremento o descuento masivo sobre los productos, garantizando redondeo y margen comercial.
* **Request Body:**
```json
{
  "porcentaje": 7.5,
  "categoria": "Cuerdas",
  "motivo": "Reajuste inflacionario anual"
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "mensaje": "Reajuste de precios completado con éxito",
  "productosAfectados": 1,
  "porcentajeAplicado": 7.5,
  "categoriaFiltrada": "Cuerdas",
  "ejecutadoPor": "admin",
  "fechaEjecucion": "2026-11-10T02:00:00Z"
}
```

---

## 6. Mapeo de Códigos de Estado HTTP

| Código | Significado | Escenario de Uso |
| :--- | :--- | :--- |
| `200 OK` | Operación exitosa | Consultas `GET`, actualizaciones `PUT`/`PATCH` y métricas. |
| `201 Created` | Creación exitosa | Registro de productos, clientes o reseñas (`POST`). |
| `204 No Content` | Eliminación exitosa | Baja física de un recurso sin cuerpo de respuesta. |
| `400 Bad Request` | Error de validación | Cuerpos JSON mal formados, email o RUT inválido. |
| `401 Unauthorized` | No autenticado | Token ausente, expirado o credenciales inválidas. |
| `403 Forbidden` | Acceso denegado | Token válido pero sin rol administrativo (`ROLE_ADMIN`). |
| `404 Not Found` | No encontrado | Código de producto o ID de cliente inexistente. |
| `409 Conflict` | Conflicto de unicidad | Código de producto o email ya registrado. |
| `500 Internal Error` | Error no controlado | Fallo de conexión en base de datos o excepción no capturada. |
