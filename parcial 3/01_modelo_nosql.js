/**
 * Sonido Vivo - Evaluación Parcial 3 (NoSQL con MongoDB)
 * Script 01: Definición de Esquema y Carga Semilla
 * Base de datos: sonido_vivo_nosql
 */

// 1. Conexión y selección de base de datos
const dbName = "sonido_vivo_nosql";
const db = db.getSiblingDB(dbName);

print("=== Inicializando Base de Datos NoSQL: " + dbName + " ===");

// 2. Limpieza de colecciones previas
db.productos.drop();
db.pedidos_web.drop();
db.logs_actividad.drop();

// 3. Creación de Colección 'productos' con validación JSON Schema (Polimorfismo instrumental)
db.createCollection("productos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["codigo", "nombre", "categoria", "precio_clp", "stock_disponible", "estado"],
      properties: {
        codigo: {
          bsonType: "string",
          description: "Código único de inventario del producto (ej. G-ELEC-001)"
        },
        nombre: {
          bsonType: "string",
          description: "Nombre comercial del instrumento o equipo"
        },
        categoria: {
          enum: ["Cuerdas", "Audio Pro", "Percusion", "Teclados", "Vientos", "Accesorios"],
          description: "Categoría principal de Sonido Vivo"
        },
        precio_clp: {
          bsonType: "int",
          minimum: 1000,
          description: "Precio unitario en pesos chilenos"
        },
        stock_disponible: {
          bsonType: "int",
          minimum: 0,
          description: "Unidades disponibles en bodega"
        },
        especificaciones: {
          bsonType: "object",
          description: "Atributos dinámicos y polimórficos según el tipo de instrumento"
        },
        tags: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Etiquetas de búsqueda y marketing"
        },
        resenas: {
          bsonType: "array",
          description: "Comentarios y calificaciones de músicos clientes",
          items: {
            bsonType: "object",
            required: ["cliente", "calificacion", "fecha"],
            properties: {
              cliente: { bsonType: "string" },
              calificacion: { bsonType: "int", minimum: 1, maximum: 5 },
              comentario: { bsonType: "string" },
              fecha: { bsonType: "date" }
            }
          }
        },
        estado: {
          enum: ["ACTIVO", "AGOTADO", "DESCONTINUADO"],
          description: "Estado del producto en el catálogo web"
        }
      }
    }
  }
});

// 4. Índices para optimización de consultas
db.productos.createIndex({ codigo: 1 }, { unique: true });
db.productos.createIndex({ categoria: 1, precio_clp: 1 });
db.productos.createIndex({ tags: 1 });
db.productos.createIndex({ "especificaciones.tipo": 1 });

// 5. Carga Semilla (Seed Data con polimorfismo instrumental)
db.productos.insertMany([
  {
    codigo: "G-FND-STRAT-01",
    nombre: "Fender Player Stratocaster Polar White",
    categoria: "Cuerdas",
    precio_clp: 849990,
    stock_disponible: 5,
    especificaciones: {
      tipo: "Guitarra Eléctrica",
      cuerpo: "Aliso",
      mastil: "Arce",
      trastes: 22,
      configuracion_pastillas: "SSS (Player Series Alnico 5)",
      puente: "Trémolo sincronizado de 2 puntos"
    },
    tags: ["fender", "stratocaster", "guitarra", "electrica", "pro"],
    resenas: [
      {
        cliente: "Danilo Sepulveda",
        calificacion: 5,
        comentario: "Excelente sonido para estudio y directo.",
        fecha: new Date("2026-10-15T12:00:00Z")
      }
    ],
    estado: "ACTIVO"
  },
  {
    codigo: "MIC-SHR-SM58-01",
    nombre: "Shure SM58 Micrófono Dinámico Cardioide",
    categoria: "Audio Pro",
    precio_clp: 139990,
    stock_disponible: 18,
    especificaciones: {
      tipo: "Micrófono Dinámico",
      patron_polar: "Cardioide",
      respuesta_frecuencia: "50Hz - 15kHz",
      conector: "XLR macho 3 pines",
      sensibilidad: "-54.5 dBV/Pa"
    },
    tags: ["shure", "microfono", "audio-pro", "vivo", "voz"],
    resenas: [],
    estado: "ACTIVO"
  },
  {
    codigo: "TEC-YAM-P125-01",
    nombre: "Yamaha P-125 Piano Digital 88 Teclas",
    categoria: "Teclados",
    precio_clp: 699990,
    stock_disponible: 3,
    especificaciones: {
      tipo: "Piano Digital",
      teclas: 88,
      mecanismo: "GHS (Graded Hammer Standard)",
      polifonia_maxima: 192,
      voces: 24,
      conectividad: ["USB to Host", "Salida AUX L/R", "Doble Jack Auriculares"]
    },
    tags: ["yamaha", "piano", "teclado", "88-teclas", "estudio"],
    resenas: [
      {
        cliente: "Victor Martinez",
        calificacion: 5,
        comentario: "El peso de las teclas emula perfectamente un acústico.",
        fecha: new Date("2026-10-20T16:30:00Z")
      }
    ],
    estado: "ACTIVO"
  },
  {
    codigo: "BAT-ROL-TD17-01",
    nombre: "Roland TD-17KVX V-Drums Batería Electrónica",
    categoria: "Percusion",
    precio_clp: 1799990,
    stock_disponible: 2,
    especificaciones: {
      tipo: "Batería Electrónica",
      pads: "Malla de doble zona",
      modulo: "TD-17 Sound Engine",
      kits_preconfigurados: 50,
      bluetooth: true
    },
    tags: ["roland", "bateria", "v-drums", "electronica", "malla"],
    resenas: [],
    estado: "ACTIVO"
  }
]);

print("=== Semilla insertada con exito en 'productos'. Total registros: " + db.productos.countDocuments() + " ===");
