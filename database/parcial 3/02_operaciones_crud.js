/**
 * Sonido Vivo - Evaluación Parcial 3 (NoSQL con MongoDB)
 * Script 02: Demostración de Operaciones CRUD
 * Base de datos: sonido_vivo_nosql
 */

const dbName = "sonido_vivo_nosql";
const db = db.getSiblingDB(dbName);

print("\n==================================================");
print("  SONIDO VIVO - SUITE DE OPERACIONES CRUD (NoSQL) ");
print("==================================================\n");

// ====================================================================
// 1. CREATE (Creación de Documentos)
// ====================================================================
print("--- [1. CREATE] Insertando nuevo pedal de efectos con esquema dinamico ---");

const nuevoProducto = {
  codigo: "ACC-BOS-DS1-01",
  nombre: "Boss DS-1 Distortion Pedal para Guitarra",
  categoria: "Accesorios",
  precio_clp: 69990,
  stock_disponible: 12,
  especificaciones: {
    tipo: "Pedal de Efecto",
    efecto: "Distorsión clásica analógica",
    controles: ["Tone", "Dist", "Level"],
    alimentacion: "Batería 9V o adaptador AC",
    bypass: "Buffered Bypass"
  },
  tags: ["boss", "pedal", "distorsion", "guitarra", "analogico"],
  resenas: [],
  estado: "ACTIVO"
};

const insertRes = db.productos.insertOne(nuevoProducto);
print("Resultado Insert: " + JSON.stringify(insertRes));


// ====================================================================
// 2. READ (Lecturas, Filtros y Agregaciones)
// ====================================================================
print("\n--- [2. READ] Consultando productos de Cuerdas con precio > $500.000 ---");
const prodsCaros = db.productos.find(
  {
    categoria: "Cuerdas",
    precio_clp: { $gt: 500000 }
  },
  { codigo: 1, nombre: 1, precio_clp: 1, "especificaciones.tipo": 1 }
).toArray();
printjson(prodsCaros);

print("\n--- [2. READ] Busqueda por atributo anidado dinamico (mástil de Arce) ---");
const prodArce = db.productos.find(
  { "especificaciones.mastil": "Arce" },
  { codigo: 1, nombre: 1, especificaciones: 1 }
).toArray();
printjson(prodArce);

print("\n--- [2. READ / AGGREGATION] Inventario valorizado agrupado por Categoria ---");
const inventarioPorCat = db.productos.aggregate([
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
]).toArray();
printjson(inventarioPorCat);


// ====================================================================
// 3. UPDATE (Actualizaciones Atomicas y Manipulacion de Arrays)
// ====================================================================
print("\n--- [3. UPDATE] Ajustando stock de Fender (-1) y agregando resena con $push ---");

// Decremento atómico de stock
db.productos.updateOne(
  { codigo: "G-FND-STRAT-01" },
  {
    $inc: { stock_disponible: -1 },
    $set: { ultima_venta: new Date() }
  }
);

// Agregar reseña de cliente al array embebido
db.productos.updateOne(
  { codigo: "G-FND-STRAT-01" },
  {
    $push: {
      resenas: {
        cliente: "Dylan Sandoval",
        calificacion: 5,
        comentario: "Excelente calibración de fábrica. El mástil es sumamente cómodo.",
        fecha: new Date()
      }
    }
  }
);

const fenderActualizada = db.productos.findOne(
  { codigo: "G-FND-STRAT-01" },
  { codigo: 1, nombre: 1, stock_disponible: 1, resenas: 1 }
);
print("Fender tras Update:");
printjson(fenderActualizada);


// ====================================================================
// 4. DELETE (Eliminacion Fisica y Borrado Logico)
// ====================================================================
print("\n--- [4. DELETE] Borrado logico (descontinuar) y eliminacion fisica de prueba ---");

// Borrado lógico (recomendado en comercio)
db.productos.updateOne(
  { codigo: "ACC-BOS-DS1-01" },
  { $set: { estado: "DESCONTINUADO", fecha_baja: new Date() } }
);

print("Estado tras borrado logico: " + db.productos.findOne({ codigo: "ACC-BOS-DS1-01" }).estado);

// Eliminación física
const deleteRes = db.productos.deleteOne({ codigo: "ACC-BOS-DS1-01" });
print("Resultado Delete Fisico: " + JSON.stringify(deleteRes));

print("\n=== Suite de pruebas CRUD completada con exito ===");
