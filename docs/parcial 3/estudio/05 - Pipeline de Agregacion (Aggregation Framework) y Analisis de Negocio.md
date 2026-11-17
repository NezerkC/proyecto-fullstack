---
tags:
  - taller-bd
  - nosql
  - mongodb
  - agregacion
  - pipeline
  - bi-analitica
  - unidad-3
aliases:
  - Aggregation Pipeline MongoDB
  - Consultas Avanzadas y Analitica MongoDB
created: 2026-11-05
---

# 05 - Pipeline de Agregación (Aggregation Framework) y Análisis de Negocio

**Indicador de Logro Asociado:** **IL3.3:** Manipula bases de datos no relacionales, utilizando operaciones de agregación y análisis de datos para generar información relevante para el negocio.

---

## 1. El Paradigma de Tubería (*Pipeline*)

El **Aggregation Framework** de MongoDB está diseñado bajo la metáfora de una línea de ensamblaje o tubería industrial (*Pipeline*). Los documentos de una colección ingresan a la primera etapa, son transformados, filtrados o agrupados, y el flujo resultante pasa como entrada a la etapa siguiente:

```mermaid
flowchart LR
    classDef stage fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#f8fafc;
    classDef acc fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ecfdf5;

    Coleccion[("Colección 'pedidos'")]
    S1["1. $match<br/>(Filtra completados)"]:::stage
    S2["2. $unwind<br/>(Desenrolla items)"]:::stage
    S3["3. $group<br/>(Agrupa por producto)"]:::stage
    S4["4. $sort<br/>(Ordena por facturación)"]:::stage
    S5["5. $limit<br/>(Top 5)"]:::stage
    Salida["Reporte Ejecutivo"]:::acc

    Coleccion --> S1 --> S2 --> S3 --> S4 --> S5 --> Salida
```

---

## 2. Equivalencias: Aggregation Pipeline vs Cláusulas SQL

| Etapa MongoDB | Equivalencia en SQL Relacional | Propósito |
| :--- | :--- | :--- |
| **`$match`** | Cláusula `WHERE` (o `HAVING` si va tras `$group`) | Filtra los documentos para procesar únicamente los relevantes. |
| **`$project`** | Lista `SELECT` con alias y transformaciones | Modifica la forma del documento, calcula campos nuevos o suprime otros. |
| **`$group`** | Cláusula `GROUP BY` con funciones agregadas | Agrupa documentos según una clave (`_id`) y calcula acumuladores. |
| **`$sort`** | Cláusula `ORDER BY` | Ordena el conjunto de resultados (`1` ASC, `-1` DESC). |
| **`$limit`** | `FETCH FIRST n ROWS ONLY` / `LIMIT n` | Restringe el número de documentos devueltos. |
| **`$skip`** | `OFFSET n ROWS` | Omite una cantidad fija de documentos. |
| **`$unwind`** | *No existe en SQL estándar* (Equivale a `CROSS JOIN UNNEST`) | Descompone un campo tipo arreglo produciendo un documento por cada elemento del arreglo. |
| **`$lookup`** | `LEFT OUTER JOIN` | Cruza documentos con otra colección mediante igualdad de claves. |
| **`$count`** | `SELECT COUNT(*)` | Retorna el total de documentos en ese punto de la tubería. |

---

## 3. Acumuladores Matemáticos dentro de `$group`

Dentro de la etapa `$group`, el campo `_id` define la clave de agrupamiento. Para calcular totales se utilizan acumuladores:

- **`$sum: <expresión>`:** Suma valores numéricos (o `$sum: 1` para contar ocurrencias).
- **`$avg: <campo>`:** Calcula el promedio aritmético.
- **`$min / $max:`** Encuentra el valor más bajo o más alto del grupo.
- **`$push: <campo>`:** Crea un arreglo nuevo conteniendo todos los valores agrupados.
- **`$addToSet: <campo>`:** Crea un arreglo nuevo conteniendo sólo los valores únicos (sin duplicados).

---

## 4. Casos Prácticos de Analítica de Negocio (Sonido Vivo)

### Caso 1: Facturación Total y Ticket Promedio por Categoría de Instrumentos

**Requerimiento del Negocio:** La gerencia comercial necesita conocer el valor total de inventario y el precio promedio por categoría para guitarras, teclados y audio profesional.

```javascript
db.productos.aggregate([
  // Etapa 1: Filtrar sólo instrumentos activos
  {
    $match: {
      activo: true
    }
  },
  // Etapa 2: Agrupar por categoría y calcular métricas financieras
  {
    $group: {
      _id: "$categoria",
      total_productos_distintos: { $sum: 1 },
      unidades_en_stock: { $sum: "$stock" },
      precio_promedio: { $avg: "$precio" },
      precio_maximo: { $max: "$precio" },
      valor_total_inventario: {
        $sum: { $multiply: ["$precio", "$stock"] }
      }
    }
  },
  // Etapa 3: Renombrar campos para salida ejecutiva
  {
    $project: {
      _id: 0,
      categoria: "$_id",
      total_productos_distintos: 1,
      unidades_en_stock: 1,
      precio_promedio: { $round: ["$precio_promedio", 2] },
      precio_maximo: 1,
      valor_total_inventario: 1
    }
  },
  // Etapa 4: Ordenar de mayor a menor valorización de inventario
  {
    $sort: { valor_total_inventario: -1 }
  }
]);
```

---

### Caso 2: Top 5 de Productos Más Vendidos con `$unwind`

**Problema Técnico:** En la colección `pedidos`, los productos vendidos residen dentro de un arreglo llamado `items`. Para poder agrupar por producto y sumar las unidades vendidas, primero debemos desanidar el arreglo mediante `$unwind`.

```javascript
db.pedidos.aggregate([
  // 1. Filtrar sólo pedidos completados o pagados
  {
    $match: {
      estado: "COMPLETADO"
    }
  },
  // 2. Desenrollar el array 'items': Si un pedido tenía 3 items, genera 3 documentos independientes
  {
    $unwind: "$items"
  },
  // 3. Agrupar por el nombre del producto vendido
  {
    $group: {
      _id: "$items.nombre",
      unidades_vendidas: { $sum: "$items.cantidad" },
      ingresos_totales: { $sum: "$items.subtotal" }
    }
  },
  // 4. Ordenar por cantidad total de unidades vendidas (descendente)
  {
    $sort: { unidades_vendidas: -1 }
  },
  // 5. Tomar el podio (Top 5)
  {
    $limit: 5
  },
  // 6. Proyección limpia para el dashboard
  {
    $project: {
      _id: 0,
      producto: "$_id",
      unidades_vendidas: 1,
      ingresos_totales: 1
    }
  }
]);
```

---

### Caso 3: Cruce Documental con `$lookup` (Left Outer Join)

**Requerimiento:** Vincular cada producto de la colección `productos` con los datos de su fabricante que residen en la colección `fabricantes`.

```javascript
db.productos.aggregate([
  {
    $match: { categoria: "Cuerdas" }
  },
  // Cruce de colecciones vía $lookup
  {
    $lookup: {
      from: "fabricantes",                 // Colección remota a unir
      localField: "fabricante_id",          // Campo de enlace en 'productos'
      foreignField: "_id",                  // Campo de enlace en 'fabricantes'
      as: "datos_fabricante"                // Nombre del arreglo resultante
    }
  },
  // Descomprimir el arreglo del fabricante a subdocumento simple
  {
    $unwind: {
      path: "$datos_fabricante",
      preserveNullAndEmptyArrays: true     // Conserva el producto aunque no tenga fabricante registrado
    }
  },
  // Proyectar documento consolidado
  {
    $project: {
      sku: 1,
      nombre: 1,
      precio: 1,
      marca: "$datos_fabricante.marca",
      pais: "$datos_fabricante.pais_origen"
    }
  }
]);
```

> [!TIP]
> **Optimización en Aggregation Pipeline:** Siempre coloca la etapa `$match` lo más al principio posible de la tubería. De esta forma, MongoDB filtra los documentos antes de reservar memoria o transferirlos por el pipeline, permitiendo además el aprovechamiento de los índices B-Tree de la colección.
