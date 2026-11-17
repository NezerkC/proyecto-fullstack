---
tags:
  - taller-bd
  - nosql
  - mongodb
  - mongosh
  - crud
  - unidad-3
aliases:
  - Operaciones CRUD en Mongosh
  - Guia de Comandos CRUD MongoDB
created: 2026-11-05
---

# 03 - Operaciones CRUD y Manipulación de Datos en Mongosh

**Indicador de Logro Asociado:** **IL3.3:** Manipula bases de datos no relacionales, utilizando operaciones CRUD (Create, Read, Update, Delete).

---

## 1. El Entorno `mongosh` (MongoDB Shell)

`mongosh` es la interfaz de línea de comandos moderna e interactiva basada en Node.js que reemplazó al cliente legado `mongo`. Permite interactuar con la base de datos utilizando sintaxis JavaScript estándar.

### Comandos de Navegación y Contexto

```javascript
// Mostrar todas las bases de datos en la instancia
show dbs;

// Cambiar de base de datos activa (o crearla en memoria si no existe)
use sonido_vivo;

// Ver la base de datos activa actualmente
db;

// Listar colecciones creadas en la base de datos actual
show collections;

// Limpiar la pantalla de la terminal
cls;
```

---

## 2. Operaciones de Creación (Create)

En MongoDB, si se inserta un documento en una colección que no existe previamente, el motor la crea automáticamente de forma implícita.

### 2.1 Inserción de un Documento Individual: `insertOne()`

```javascript
// Inserción en la colección 'productos'
db.productos.insertOne({
  sku: "GTR-0012",
  nombre: "Gibson Les Paul Standard 60s",
  categoria: "Cuerdas",
  precio: NumberDecimal("2499990.00"),
  stock: NumberInt(4),
  activo: true,
  fecha_ingreso: new Date(),
  especificaciones: {
    color: "Iced Tea",
    cuerpo: "Caoba maciza con tapa de arce flameado",
    microfonos: ["60s Burstbucker Neck", "60s Burstbucker Bridge"],
    peso_kg: 4.2
  },
  etiquetas: ["electrica", "vintage", "pro"]
});
```

**Respuesta devuelta por el motor:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("672ad780f1a23b4c5d6e8001")
}
```

### 2.2 Inserción Masiva de Documentos: `insertMany()`

Permite registrar un arreglo de documentos en un solo viaje de red (*batch insert*).

```javascript
db.productos.insertMany([
  {
    sku: "GTR-0015",
    nombre: "Ibanez Steve Vai Signature JEM7V",
    categoria: "Cuerdas",
    precio: NumberDecimal("2890000.00"),
    stock: NumberInt(2),
    activo: true,
    especificaciones: {
      color: "Blanco",
      trastes: 24,
      puente: "Edge Tremolo"
    },
    etiquetas: ["shred", "firmas", "japon"]
  },
  {
    sku: "TEC-0004",
    nombre: "Nord Stage 4 88 Teclas",
    categoria: "Teclados",
    precio: NumberDecimal("4650000.00"),
    stock: NumberInt(3),
    activo: true,
    especificaciones: {
      teclas: "Triple Sensor Contrapesadas",
      motores: ["Piano", "Sintetizador", "Organo"],
      peso_kg: 19.6
    },
    etiquetas: ["escenario", "sintetizador", "estudio"]
  },
  {
    sku: "AUD-0021",
    nombre: "Microfono Shure SM7B Dinamico",
    categoria: "Audio Profesional",
    precio: NumberDecimal("420000.00"),
    stock: NumberInt(12),
    activo: true,
    especificaciones: {
      patron_polar: "Cardioide",
      conexion: "XLR",
      filtro: "Corte de graves y realce de presencia"
    },
    etiquetas: ["estudio", "podcast", "vocal"]
  }
], { ordered: true }); // Si ordered es false, continúa insertando si uno falla
```

---

## 3. Operaciones de Lectura (Read)

### 3.1 Consulta General y Filtros de Igualdad: `find()` y `findOne()`

```javascript
// Obtener todos los productos (hasta el lote por defecto de 20 documentos)
db.productos.find();

// Obtener un único documento coincidente
db.productos.findOne({ sku: "GTR-0012" });

// Filtrar por coincidencia exacta en campos de primer nivel
db.productos.find({ categoria: "Cuerdas", activo: true });
```

### 3.2 Operadores de Comparación

| Operador | Significado | Sintaxis de Ejemplo |
| :--- | :--- | :--- |
| `$eq` | Igual a | `{ stock: { $eq: 4 } }` |
| `$ne` | Distinto de | `{ categoria: { $ne: "Accesorios" } }` |
| `$gt` | Mayor que ($>$) | `{ precio: { $gt: NumberDecimal("1000000") } }` |
| `$gte` | Mayor o igual que ($\ge$) | `{ stock: { $gte: 5 } }` |
| `$lt` | Menor que ($<$) | `{ precio: { $lt: NumberDecimal("500000") } }` |
| `$lte` | Menor o igual que ($\le$) | `{ stock: { $lte: 2 } }` |
| `$in` | Dentro de una lista | `{ categoria: { $in: ["Cuerdas", "Teclados"] } }` |
| `$nin` | No dentro de una lista | `{ categoria: { $nin: ["Percusion", "Accesorios"] } }` |

### 3.3 Operadores Lógicos (`$and`, `$or`, `$not`, `$nor`)

```javascript
// Buscar productos de categoría 'Cuerdas' O con precio inferior a $500.000
db.productos.find({
  $or: [
    { categoria: "Cuerdas" },
    { precio: { $lt: NumberDecimal("500000") } }
  ]
});

// Condición compuesta con $and explícito (evalúa stock entre 2 y 10 unidades)
db.productos.find({
  $and: [
    { stock: { $gte: 2 } },
    { stock: { $lte: 10 } }
  ]
});
```

### 3.4 Proyecciones (Selección de Columnas)
Permite especificar qué campos viajarán por la red hacia el cliente.
- `1`: Incluir campo.
- `0`: Excluir campo.

> [!NOTE]
> No se pueden combinar inclusiones y exclusiones en la misma proyección, con la **única excepción** del campo `_id` (que por defecto siempre se incluye a menos que se fuerce `_id: 0`).

```javascript
// Devolver únicamente SKU, Nombre y Precio (excluyendo el _id)
db.productos.find(
  { activo: true },
  { sku: 1, nombre: 1, precio: 1, _id: 0 }
);
```

### 3.5 Modificadores de Cursor: Ordenamiento, Paginación y Conteo

```javascript
// Ordenar por precio descendente (-1) y luego por nombre ascendente (1)
db.productos.find().sort({ precio: -1, nombre: 1 });

// Paginación eficiente: Página 2 (tamaño de página 10 registros)
db.productos.find()
  .sort({ precio: -1 })
  .skip(10)   // Salta los primeros 10 registros
  .limit(10); // Toma los 10 siguientes

// Contar documentos que coincidan con un filtro de negocio
db.productos.countDocuments({ stock: { $lt: 5 } });
```

---

## 4. Operaciones de Actualización (Update)

En MongoDB **nunca** se debe actualizar un documento sin especificar operadores atómicos (como `$set`), pues de lo contrario se corre el riesgo de sobrescribir el documento completo.

### 4.1 Actualización Parcial: `updateOne()` y `updateMany()`

```javascript
// Actualizar el precio y la fecha de última modificación de un producto específico
db.productos.updateOne(
  { sku: "GTR-0012" },
  {
    $set: {
      precio: NumberDecimal("2599990.00"),
      "especificaciones.color": "Heritage Cherry Sunburst"
    },
    $currentDate: { fecha_modificacion: true }
  }
);

// Desactivar todos los productos sin stock disponible
db.productos.updateMany(
  { stock: 0 },
  { $set: { activo: false } }
);
```

### 4.2 Operador de Incremento Atómico: `$inc`

Evita condiciones de carrera (*Race Conditions*) al actualizar contadores o inventarios.

```javascript
// Descontar 1 unidad de stock tras una venta confirmada
db.productos.updateOne(
  { sku: "GTR-0012", stock: { $gte: 1 } },
  { $inc: { stock: -1 } }
);
```

### 4.3 Reemplazo Completo: `replaceOne()`

Sobrescribe todo el documento preservando únicamente el identificador inmutable `_id`.

```javascript
db.productos.replaceOne(
  { sku: "GTR-0015" },
  {
    sku: "GTR-0015",
    nombre: "Ibanez JEM7V White Premium Edition",
    categoria: "Cuerdas",
    precio: NumberDecimal("2950000.00"),
    stock: NumberInt(1),
    activo: true
  }
);
```

### 4.4 La Opción `upsert: true` (Update or Insert)

Si el documento existe, lo actualiza; si no existe, lo inserta en la colección de forma automática.

```javascript
db.configuraciones.updateOne(
  { clave: "TASA_DESCUENTO_VIP" },
  { $set: { valor: 0.15, descripcion: "Descuento del 15% a clientes de alta frecuencia" } },
  { upsert: true }
);
```

---

## 5. Operaciones de Eliminación (Delete)

### 5.1 Eliminación de un Documento: `deleteOne()`

```javascript
// Elimina el primer documento que coincida con el criterio
db.productos.deleteOne({ sku: "AUD-0021" });
```

### 5.2 Eliminación Masiva: `deleteMany()`

```javascript
// Eliminar todos los productos inactivos que tengan stock en 0
db.productos.deleteMany({
  activo: false,
  stock: 0
});

// Eliminar TODOS los documentos de la colección preservando los índices y validadores
db.productos.deleteMany({});
```

> [!WARNING]
> Para destruir la colección por completo y liberar el espacio en el motor WiredTiger de MongoDB, se debe usar `db.productos.drop()`. Usar `deleteMany({})` borra los documentos pero mantiene la definición de la colección y sus índices.
