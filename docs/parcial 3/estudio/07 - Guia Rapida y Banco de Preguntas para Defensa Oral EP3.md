---
tags:
  - taller-bd
  - nosql
  - mongodb
  - unidad-3
  - defensa-oral
  - preguntas-respuestas
  - ep3
aliases:
  - Banco de Preguntas Defensa EP3
  - Guia Rapida de Repaso Unidad 3 NoSQL
created: 2026-11-05
---

# 07 - Guía Rápida y Banco de Preguntas para Defensa Oral EP3

Este documento recopila las definiciones conceptuales indispensables y las preguntas técnicas más recurrentes que realiza el cuerpo docente en la evaluación de la **Unidad 3 (Evaluación Parcial 3)** de Taller de Base de Datos (BDY1103) en Duoc UC.

---

## 1. Glosario Técnico Esencial (Dominio de Conceptos)

1. **NoSQL (*Not Only SQL*):** Movimiento y paradigma de sistemas gestores de bases de datos que rompen con el esquema relacional tradicional tabular y las restricciones estrictas de ACID para optimizar escalabilidad horizontal, velocidad y flexibilidad en estructuras heterogéneas.
2. **BSON (*Binary JSON*):** Formato binario de serialización utilizado internamente por MongoDB. Extiende el estándar JSON soportando tipos como `ObjectId`, `Date`, enteros explícitos de 32/64 bits y `Decimal128`.
3. **Colección:** Agrupación lógica de documentos BSON dentro de MongoDB, análoga conceptualmente a una tabla en el modelo relacional, pero sin forzar a que todos los registros compartan idéntica estructura.
4. **Documento:** Unidad mínima de registro en MongoDB, análoga a una fila o tupla en SQL. Almacena pares clave-valor estructurados jerárquicamente.
5. **Teorema CAP:** Principio matemático que demuestra que un sistema de datos distribuido sólo puede garantizar simultáneamente dos de tres propiedades ante fallos de red: Consistencia (**C**), Disponibilidad (**A**) y Tolerancia a Particiones (**P**).
6. **Modelo BASE:** Paradigma transaccional flexible en sistemas distribuidos (*Basically Available, Soft state, Eventual consistency*), contrapartida de la rigidez de ACID.
7. **Embebido (*Embedding*):** Estrategia de modelado no relacional donde las entidades relacionadas se almacenan como subdocumentos o matrices de subdocumentos dentro de un mismo documento contenedor.
8. **Referenciación (*Referencing*):** Estrategia de modelado donde se guardan identificadores (`ObjectId`) foráneos para vincular documentos en colecciones independientes.
9. **Límite BSON de 16 MB:** Tamaño físico máximo permitido para un solo documento en MongoDB, diseñado para evitar monopolio de memoria RAM y saturación de ancho de banda.
10. **Notación de Punto (*Dot Notation*):** Sintaxis basada en comillas y puntos (ej. `"especificaciones.color"`) para consultar o modificar campos anidados dentro de subdocumentos o elementos de arreglos.
11. **Operador `$elemMatch`:** Condición de búsqueda en arrays que exige que dos o más filtros se satisfagan obligatoriamente **dentro del mismo subdocumento** de la lista.
12. **Aggregation Pipeline:** Tubería de procesamiento de datos por etapas (`$match`, `$unwind`, `$group`, `$sort`, etc.) donde cada fase transforma el flujo y alimenta a la siguiente.
13. **Etapa `$unwind`:** Operación de descompresión que desenrolla un arreglo de $N$ elementos, produciendo $N$ documentos individuales.
14. **Etapa `$lookup`:** Operación de agregación que realiza un *Left Outer Join* documental entre dos colecciones sin necesidad de claves foráneas impuestas por DDL.
15. **Índice Multikey:** Índice B-Tree construido sobre un campo de tipo array, donde MongoDB genera una entrada en el índice por cada elemento individual del arreglo.
16. **`COLLSCAN` vs `IXSCAN`:** `COLLSCAN` indica que la base de datos tuvo que escanear secuencialmente toda la colección en disco (lento, ineficiente); `IXSCAN` certifica que utilizó un índice en memoria para ubicar los punteros a los documentos de forma instantánea.

---

## 2. Banco de Preguntas y Respuestas Técnicas para la Defensa Oral

### P1: ¿Cuál es la diferencia fundamental entre el modelo relacional (Oracle) y el modelo documental (MongoDB)?
**Respuesta:** En el modelo relacional de Oracle, los datos están estructurados en tablas rígidas bidimensionales sujetas a normalización (3NF) y claves foráneas, requiriendo un esquema definido por adelantado (*Schema-on-Write*) y uniones lógicas (`JOIN`) en tiempo de ejecución bajo transacciones ACID fuertes. En MongoDB, los datos se almacenan en colecciones de documentos BSON semiestructurados y jerárquicos (*Schema-on-Read*), donde se prioriza la desnormalización y la incrustación de subdocumentos para permitir lecturas masivas en un solo I/O de disco y escalabilidad horizontal (*Sharding*).

---

### P2: ¿Cómo explica el Teorema CAP y en qué cuadrante se ubica MongoDB por defecto?
**Respuesta:** El Teorema CAP postula que ante una partición de red inevitable en un sistema distribuido, se debe elegir entre Consistencia Fuerte (**C**) o Disponibilidad (**A**). Por defecto, un clúster de réplicas de MongoDB se clasifica como un sistema **CP** (*Consistency + Partition Tolerance*): Si la red se corta y un nodo secundario pierde contacto con la mayoría de los miembros del *Replica Set*, MongoDB suspende o rechaza temporalmente las escrituras en la minoría para evitar divergencia o escrituras fantasma, asegurando que los clientes no lean estados corruptos antes de restablecer el consenso.

---

### P3: En el diseño del caso Sonido Vivo, ¿por qué eligió embeber los items dentro de `pedidos` en lugar de separarlos en una colección independiente?
**Respuesta:** Se fundamenta en dos principios de ingeniería:
1. **Patrón de Acceso (Lectura Atómica):** Cuando un usuario consulta un pedido o se procesa un despacho, la aplicación siempre necesita ver la orden completa con sus productos. Al estar embebidos, se recupera toda la información en un único acceso a disco sin necesidad de sentencias `JOIN` o etapas `$lookup`.
2. **Inmutabilidad y Coherencia Histórica:** Si el precio de una guitarra cambia en el catálogo comercial mañana, el pedido ya cerrado debe preservar inalterable el precio exacto y el subtotal al que fue vendido en ese instante.

---

### P4: ¿Cuáles son los riesgos del modelo embebido y qué límite estructural impone MongoDB?
**Respuesta:** El principal riesgo es el crecimiento descontrolado del documento (*Unbounded Growth*). Si se anida un array que acumula miles de entradas (como comentarios o lecturas de sensores), se puede alcanzar el **límite físico de 16 MB por documento BSON** que impone el motor. Además, el crecimiento dinámico repetido en disco obliga al motor de almacenamiento *WiredTiger* a reasignar bloques de memoria y mover documentos, degradando el rendimiento. Por eso, las relaciones 1 a Millones o 1 a Muchos no acotados deben resolverse siempre mediante **referenciación** de IDs.

---

### P5: ¿Cuál es la diferencia técnica entre los operadores de arreglos `$push` y `$addToSet`?
**Respuesta:** `$push` agrega el elemento especificado al final del arreglo sin validar si el contenido ya existe, lo que permite duplicados. En cambio, `$addToSet` trata al arreglo como un conjunto matemático estricto: inspecciona si el elemento ya forma parte de la lista y, si ya está presente, no ejecuta ninguna modificación, garantizando unicidad sin escribir código de comprobación en la aplicación.

---

### P6: ¿Para qué sirve el operador `$elemMatch` y qué problema evita en las consultas sobre arrays?
**Respuesta:** Evita el problema de los **falsos positivos en filtros compuestos**. Si ejecutamos una consulta como `{ "items.precio": { $gt: 1000 }, "items.cantidad": { $gt: 5 } }`, MongoDB evalúa las condiciones de forma independiente, coincidiendo si el pedido tiene un item con precio mayor a 1.000 y *otro item distinto* con cantidad mayor a 5. Al envolver los filtros dentro de `$elemMatch`, se obliga al motor a comprobar que **ambas condiciones se cumplan simultáneamente en el mismo subdocumento** del arreglo.

---

### P7: ¿Por qué es una mala práctica leer el stock en backend, restarle unidades y hacer `$set`, en lugar de utilizar `$inc`?
**Respuesta:** Porque genera **condiciones de carrera (*Race Conditions*)**. Si dos clientes compran simultáneamente el último producto disponible, ambos hilos leerán `stock = 1`, ambos calcularán `1 - 1 = 0` y ambos emitirán un `$set: { stock: 0 }`, vendiendo dos veces un inventario que sólo tenía una unidad física. Con el operador `$inc: { stock: -1 }` combinado con un filtro `{ stock: { $gte: 1 } }`, la operación se ejecuta a nivel de motor de base de datos con bloqueo atómico en memoria, garantizando que sólo una de las dos peticiones tenga éxito.

---

### P8: ¿Cómo opera el Aggregation Pipeline y para qué se utilizan `$unwind` y `$lookup`?
**Respuesta:** El Aggregation Pipeline es un modelo de tubería por etapas donde el resultado de una fase sirve de entrada a la siguiente. 
- `$unwind` desenrolla o descompone un arreglo: si un documento de pedido tiene 3 productos en su array `items`, `$unwind: "$items"` desdobla ese pedido en 3 documentos independientes, permitiendo posteriormente agruparlos por producto con `$group` para sumar ventas totales.
- `$lookup` permite realizar un cruce documental (*Left Outer Join*) entre dos colecciones distintas cruzando una clave local y una foránea, incorporando los documentos coincidentes como un arreglo anidado.

---

### P9: Si MongoDB no tiene DDL rígido, ¿cómo garantizan en su proyecto que no se inserten datos corruptos o incompletos?
**Respuesta:** Implementamos **validación de esquemas con `$jsonSchema`** al momento de crear la colección con `db.createCollection()`. Con esta directiva definimos campos obligatorios (`required`), tipos de datos estrictos en BSON (`bsonType`), límites numéricos (`minimum`, `maximum`), expresiones regulares para SKUs o RUTs (`pattern`), y configuramos `validationAction: "error"` para que MongoDB rechace y aborte cualquier inserción o actualización que no cumpla las especificaciones de calidad.

---

### P10: ¿Cómo justifica la convivencia de Oracle y MongoDB en el proyecto Sonido Vivo (Persistencia Políglota)?
**Respuesta:** Porque cada motor sobresale en una necesidad distinta del negocio:
- **Oracle Database 19c** administra el **núcleo transaccional financiero y contable**: procesa las liquidaciones masivas de clientes mediante el paquete `PKG_SONIDO_VIVO`, valida el stock físico con triggers de fila `BEFORE INSERT` con `RAISE_APPLICATION_ERROR`, y retiene bitácoras con `PRAGMA AUTONOMOUS_TRANSACTION`, garantizando cumplimiento fiscal y ACID estricto.
- **MongoDB** gestiona la **capa ágil de experiencia de usuario y catálogo**: almacena instrumentos con atributos polimórficos variables sin necesidad de tablas puente ni campos nulos, sirve el catálogo y el carrito de compras a ultra-alta velocidad en un solo acceso a disco, y analiza métricas de negocio en tiempo real mediante su *Aggregation Pipeline*.

---

## 3. Checklist de Comandos de Consola para la Demostración (`mongosh`)

Ten listos estos comandos en la terminal para demostrar el funcionamiento al docente:

```javascript
// 1. Conexión y verificación de colecciones
use sonido_vivo;
show collections;

// 2. Demostración de Integridad: Probar que $jsonSchema rechaza datos inválidos
// Intentar insertar un producto con precio negativo (debe fallar arrojando error de validación)
try {
  db.productos.insertOne({
    sku: "BAD-0001",
    nombre: "Guitarra Invalida",
    categoria: "Cuerdas",
    precio: NumberDecimal("-500.00"), // VIOLACION: minimum es 1.00
    stock: NumberInt(1),
    especificaciones: {}
  });
} catch(e) {
  print("Prueba superada: El validador rechazo la insercion correctamente.");
}

// 3. Demostración de Consulta Avanzada con Operadores
// Buscar productos de Cuerdas o Teclados con precio superior a 2 millones
db.productos.find({
  categoria: { $in: ["Cuerdas", "Teclados"] },
  precio: { $gt: NumberDecimal("2000000.00") }
}, { sku: 1, nombre: 1, precio: 1, _id: 0 });

// 4. Demostración de Actualización Atómica y Arreglos
// Añadir un nuevo tag único al Shure SM7B
db.productos.updateOne(
  { sku: "AUD-0301" },
  { $addToSet: { etiquetas: "locucion-profesional" } }
);

// 5. Demostración del Aggregation Pipeline
// Facturación total agrupada por producto vendido
db.pedidos.aggregate([
  { $match: { estado: "COMPLETADO" } },
  { $unwind: "$items" },
  {
    $group: {
      _id: "$items.nombre",
      total_unidades: { $sum: "$items.cantidad" },
      ingresos: { $sum: "$items.subtotal" }
    }
  },
  { $sort: { ingresos: -1 } }
]);
```
