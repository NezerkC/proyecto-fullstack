/**
 * Sonido Vivo - Seed 50 Catalog Products for MongoDB
 * Database: sonido_vivo_nosql
 * Collection: productos
 */

const targetDb = db.getSiblingDB("sonido_vivo_nosql");
print("[Seed 50] Seeding 50 Sonido Vivo catalog products into sonido_vivo_nosql.productos...");

const products = [
  {
    codigo: "GA-YAMAH-F310-01",
    nombre: "Guitarra Acústica Folk",
    categoria: "Cuerdas",
    precio_clp: NumberInt(129990),
    stock_disponible: NumberInt(8),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Acústicas",
      subcategoria: "Guitarras Acústicas",
      marca: "Yamaha",
      modelo: "F310",
      imagen: "GA001.jpg",
      descripcion: "Tapa de abeto, aros y fondo de meranti. Ideal para iniciantes.",
      codigo_legacy: "GA001",
      stock_critico: NumberInt(3)
    },
    tags: ["ga001","ga-yamah-f310-01","yamaha","f310","cuerdas","guitarras acústicas"]
  },
  {
    codigo: "GA-FENDE-CD60S-02",
    nombre: "Guitarra Acústica Dreadnought",
    categoria: "Cuerdas",
    precio_clp: NumberInt(189990),
    stock_disponible: NumberInt(5),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Acústicas",
      subcategoria: "Guitarras Acústicas",
      marca: "Fender",
      modelo: "CD-60S",
      imagen: "GA002.jpg",
      descripcion: "Tapa de abeto macizo, brazo de caoba. Sonido cálido y proyectado.",
      codigo_legacy: "GA002",
      stock_critico: NumberInt(3)
    },
    tags: ["ga002","ga-fende-cd60s-02","fender","cd-60s","cuerdas","guitarras acústicas"]
  },
  {
    codigo: "GA-YAMAH-C40-03",
    nombre: "Guitarra Acústica Clásica 4/4",
    categoria: "Cuerdas",
    precio_clp: NumberInt(89990),
    stock_disponible: NumberInt(10),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Acústicas",
      subcategoria: "Guitarras Acústicas",
      marca: "Yamaha",
      modelo: "C40",
      imagen: "GA003.jpg",
      descripcion: "Nailon, tapa de abeto. Ideal para estudio y flamenco.",
      codigo_legacy: "GA003",
      stock_critico: NumberInt(3)
    },
    tags: ["ga003","ga-yamah-c40-03","yamaha","c40","cuerdas","guitarras acústicas"]
  },
  {
    codigo: "GA-TAKAM-GN20CE-04",
    nombre: "Guitarra Electroacústica",
    categoria: "Cuerdas",
    precio_clp: NumberInt(349990),
    stock_disponible: NumberInt(3),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Acústicas",
      subcategoria: "Guitarras Acústicas",
      marca: "Takamine",
      modelo: "GN20CE",
      imagen: "GA004.jpg",
      descripcion: "Pickup integrado, afinador incorporado.",
      codigo_legacy: "GA004",
      stock_critico: NumberInt(3)
    },
    tags: ["ga004","ga-takam-gn20ce-04","takamine","gn20ce","cuerdas","guitarras acústicas"]
  },
  {
    codigo: "GA-YAMAH-JR1-05",
    nombre: "Guitarra 3/4 Niños",
    categoria: "Cuerdas",
    precio_clp: NumberInt(79990),
    stock_disponible: NumberInt(6),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Acústicas",
      subcategoria: "Guitarras Acústicas",
      marca: "Yamaha",
      modelo: "JR1",
      imagen: "GA005.jpg",
      descripcion: "Tamaño reducido para niños de 6 a 10 años.",
      codigo_legacy: "GA005",
      stock_critico: NumberInt(3)
    },
    tags: ["ga005","ga-yamah-jr1-05","yamaha","jr1","cuerdas","guitarras acústicas"]
  },
  {
    codigo: "G-FND-STRAT-01",
    nombre: "Guitarra Eléctrica Stratocaster",
    categoria: "Cuerdas",
    precio_clp: NumberInt(249990),
    stock_disponible: NumberInt(5),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Eléctricas",
      subcategoria: "Guitarras Eléctricas",
      marca: "Squier",
      modelo: "Affinity Strat",
      imagen: "GE001.jpg",
      descripcion: "Cuerpo de álamo, mástil de arce, pastillas SSS.",
      codigo_legacy: "GE001",
      stock_critico: NumberInt(3)
    },
    tags: ["ge001","g-fnd-strat-01","squier","affinity strat","cuerdas","guitarras eléctricas"]
  },
  {
    codigo: "GE-EPIPH-LESPAULSTD-07",
    nombre: "Guitarra Eléctrica Les Paul",
    categoria: "Cuerdas",
    precio_clp: NumberInt(329990),
    stock_disponible: NumberInt(4),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Eléctricas",
      subcategoria: "Guitarras Eléctricas",
      marca: "Epiphone",
      modelo: "Les Paul Std",
      imagen: "GE002.jpg",
      descripcion: "Cuerpo caoba, tapa arce, pastillas humbucker.",
      codigo_legacy: "GE002",
      stock_critico: NumberInt(3)
    },
    tags: ["ge002","ge-epiph-lespaulstd-07","epiphone","les paul std","cuerdas","guitarras eléctricas"]
  },
  {
    codigo: "GE-EPIPH-SGSTANDARD-08",
    nombre: "Guitarra Eléctrica SG",
    categoria: "Cuerdas",
    precio_clp: NumberInt(319990),
    stock_disponible: NumberInt(3),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Eléctricas",
      subcategoria: "Guitarras Eléctricas",
      marca: "Epiphone",
      modelo: "SG Standard",
      imagen: "GE003.jpg",
      descripcion: "Cuerpo caoba, mástil caoba, 2 humbuckers.",
      codigo_legacy: "GE003",
      stock_critico: NumberInt(3)
    },
    tags: ["ge003","ge-epiph-sgstandard-08","epiphone","sg standard","cuerdas","guitarras eléctricas"]
  },
  {
    codigo: "GE-SQUIE-AFFINITYTE-09",
    nombre: "Guitarra Eléctrica Telecaster",
    categoria: "Cuerdas",
    precio_clp: NumberInt(239990),
    stock_disponible: NumberInt(4),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Eléctricas",
      subcategoria: "Guitarras Eléctricas",
      marca: "Squier",
      modelo: "Affinity Tele",
      imagen: "GE004.jpg",
      descripcion: "Cuerpo álamo, clavijero vintage, 2 pastillas single.",
      codigo_legacy: "GE004",
      stock_critico: NumberInt(3)
    },
    tags: ["ge004","ge-squie-affinityte-09","squier","affinity tele","cuerdas","guitarras eléctricas"]
  },
  {
    codigo: "GE-EPIPH-ES335-10",
    nombre: "Guitarra Eléctrica Semi-hollow",
    categoria: "Cuerdas",
    precio_clp: NumberInt(549990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Guitarras Eléctricas",
      subcategoria: "Guitarras Eléctricas",
      marca: "Epiphone",
      modelo: "ES-335",
      imagen: "GE005.jpg",
      descripcion: "Semi-hueca, 2 humbuckers, ideal para jazz y blues.",
      codigo_legacy: "GE005",
      stock_critico: NumberInt(3)
    },
    tags: ["ge005","ge-epiph-es335-10","epiphone","es-335","cuerdas","guitarras eléctricas"]
  },
  {
    codigo: "BA-SQUIE-AFFINITYPJ-11",
    nombre: "Bajo Eléctrico 4 Cuerdas",
    categoria: "Cuerdas",
    precio_clp: NumberInt(299990),
    stock_disponible: NumberInt(5),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Bajos Eléctricos",
      subcategoria: "Bajos Eléctricos",
      marca: "Squier",
      modelo: "Affinity PJ",
      imagen: "BA001.jpg",
      descripcion: "Pickup PJ, cuerpo álamo, mástil arce.",
      codigo_legacy: "BA001",
      stock_critico: NumberInt(3)
    },
    tags: ["ba001","ba-squie-affinitypj-11","squier","affinity pj","cuerdas","bajos eléctricos"]
  },
  {
    codigo: "BA-FENDE-PLAYERJAZZ-12",
    nombre: "Bajo Eléctrico Jazz Bass",
    categoria: "Cuerdas",
    precio_clp: NumberInt(699990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Bajos Eléctricos",
      subcategoria: "Bajos Eléctricos",
      marca: "Fender",
      modelo: "Player Jazz",
      imagen: "BA002.jpg",
      descripcion: "Alder body, 2 Alnico V Jazz single-coil.",
      codigo_legacy: "BA002",
      stock_critico: NumberInt(3)
    },
    tags: ["ba002","ba-fende-playerjazz-12","fender","player jazz","cuerdas","bajos eléctricos"]
  },
  {
    codigo: "BA-YAMAH-APX700II-13",
    nombre: "Bajo Acústico 4 Cuerdas",
    categoria: "Cuerdas",
    precio_clp: NumberInt(429990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Bajos Eléctricos",
      subcategoria: "Bajos Eléctricos",
      marca: "Yamaha",
      modelo: "APX700II",
      imagen: "BA003.jpg",
      descripcion: "Electroacústico, afinador incorporado.",
      codigo_legacy: "BA003",
      stock_critico: NumberInt(3)
    },
    tags: ["ba003","ba-yamah-apx700ii-13","yamaha","apx700ii","cuerdas","bajos eléctricos"]
  },
  {
    codigo: "BT-PEARL-ROADSHOW-14",
    nombre: "Batería Acústica 5 piezas",
    categoria: "Percusion",
    precio_clp: NumberInt(599990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Baterías",
      subcategoria: "Baterías",
      marca: "Pearl",
      modelo: "Roadshow",
      imagen: "BT001.jpg",
      descripcion: "Incluye stands, platillos y pedal de bombo.",
      codigo_legacy: "BT001",
      stock_critico: NumberInt(3)
    },
    tags: ["bt001","bt-pearl-roadshow-14","pearl","roadshow","percusion","baterías"]
  },
  {
    codigo: "D-ROL-TD02-01",
    nombre: "Batería Electrónica 8 pads",
    categoria: "Percusion",
    precio_clp: NumberInt(799990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Baterías",
      subcategoria: "Baterías",
      marca: "Roland",
      modelo: "TD-02KV",
      imagen: "BT002.jpg",
      descripcion: "Módulo TD-02, 8 pads de goma, pedal hi-hat.",
      codigo_legacy: "BT002",
      stock_critico: NumberInt(3)
    },
    tags: ["bt002","d-rol-td02-01","roland","td-02kv","percusion","baterías"]
  },
  {
    codigo: "BT-PEARL-STE1450-16",
    nombre: "Caja Snare 14\"",
    categoria: "Percusion",
    precio_clp: NumberInt(89990),
    stock_disponible: NumberInt(4),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Baterías",
      subcategoria: "Baterías",
      marca: "Pearl",
      modelo: "STE1450",
      imagen: "BT003.jpg",
      descripcion: "Acero, 14x5\", 10 tensores.",
      codigo_legacy: "BT003",
      stock_critico: NumberInt(3)
    },
    tags: ["bt003","bt-pearl-ste1450-16","pearl","ste1450","percusion","baterías"]
  },
  {
    codigo: "BT-ZILDJ-ASERIES-17",
    nombre: "Platillo Hi-Hat 14\"",
    categoria: "Percusion",
    precio_clp: NumberInt(149990),
    stock_disponible: NumberInt(3),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Baterías",
      subcategoria: "Baterías",
      marca: "Zildjian",
      modelo: "A Series",
      imagen: "BT004.jpg",
      descripcion: "Latón B20, sonido brillante y claro.",
      codigo_legacy: "BT004",
      stock_critico: NumberInt(3)
    },
    tags: ["bt004","bt-zildj-aseries-17","zildjian","a series","percusion","baterías"]
  },
  {
    codigo: "BT-ZILDJ-ASERIES-18",
    nombre: "Platillo Crash 16\"",
    categoria: "Percusion",
    precio_clp: NumberInt(129990),
    stock_disponible: NumberInt(3),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Baterías",
      subcategoria: "Baterías",
      marca: "Zildjian",
      modelo: "A Series",
      imagen: "BT005.jpg",
      descripcion: "Latón B20, ataque rápido.",
      codigo_legacy: "BT005",
      stock_critico: NumberInt(3)
    },
    tags: ["bt005","bt-zildj-aseries-18","zildjian","a series","percusion","baterías"]
  },
  {
    codigo: "TC-YAMAH-PSRE373-19",
    nombre: "Teclado Digital 61 teclas",
    categoria: "Teclados",
    precio_clp: NumberInt(249990),
    stock_disponible: NumberInt(4),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Teclados y Pianos",
      subcategoria: "Teclados y Pianos",
      marca: "Yamaha",
      modelo: "PSR-E373",
      imagen: "TC001.jpg",
      descripcion: "61 teclas sensibles al tacto, 622 voces.",
      codigo_legacy: "TC001",
      stock_critico: NumberInt(3)
    },
    tags: ["tc001","tc-yamah-psre373-19","yamaha","psr-e373","teclados","teclados y pianos"]
  },
  {
    codigo: "K-YAM-P45-01",
    nombre: "Piano Digital 88 teclas",
    categoria: "Teclados",
    precio_clp: NumberInt(499990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Teclados y Pianos",
      subcategoria: "Teclados y Pianos",
      marca: "Yamaha",
      modelo: "P-45",
      imagen: "TC002.jpg",
      descripcion: "88 teclas pesadas, 10 voces, pedal sustain incluido.",
      codigo_legacy: "TC002",
      stock_critico: NumberInt(3)
    },
    tags: ["tc002","k-yam-p45-01","yamaha","p-45","teclados","teclados y pianos"]
  },
  {
    codigo: "TC-ARTUR-MINILABMKI-21",
    nombre: "Sintetizador 49 teclas",
    categoria: "Teclados",
    precio_clp: NumberInt(129990),
    stock_disponible: NumberInt(5),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Teclados y Pianos",
      subcategoria: "Teclados y Pianos",
      marca: "Arturia",
      modelo: "MiniLab MKII",
      imagen: "TC003.jpg",
      descripcion: "MIDI controller, 49 mini teclas.",
      codigo_legacy: "TC003",
      stock_critico: NumberInt(3)
    },
    tags: ["tc003","tc-artur-minilabmki-21","arturia","minilab mkii","teclados","teclados y pianos"]
  },
  {
    codigo: "TC-MAUDI-HAMMER88-22",
    nombre: "Teclado MIDI 88 teclas",
    categoria: "Teclados",
    precio_clp: NumberInt(399990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Teclados y Pianos",
      subcategoria: "Teclados y Pianos",
      marca: "M-Audio",
      modelo: "Hammer 88",
      imagen: "TC004.jpg",
      descripcion: "88 teclas martillo, sin sonidos propios.",
      codigo_legacy: "TC004",
      stock_critico: NumberInt(3)
    },
    tags: ["tc004","tc-maudi-hammer88-22","m-audio","hammer 88","teclados","teclados y pianos"]
  },
  {
    codigo: "AM-FENDE-FRONTMAN15-23",
    nombre: "Amplificador Guitarra 15W",
    categoria: "Audio Pro",
    precio_clp: NumberInt(99990),
    stock_disponible: NumberInt(5),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Amplificadores",
      subcategoria: "Amplificadores",
      marca: "Fender",
      modelo: "Frontman 15G",
      imagen: "AM001.jpg",
      descripcion: "15W, distorsión incorporada, entrada auxiliar.",
      codigo_legacy: "AM001",
      stock_critico: NumberInt(3)
    },
    tags: ["am001","am-fende-frontman15-23","fender","frontman 15g","audio pro","amplificadores"]
  },
  {
    codigo: "AM-MARSH-MG40GFX-24",
    nombre: "Amplificador Guitarra 40W",
    categoria: "Audio Pro",
    precio_clp: NumberInt(299990),
    stock_disponible: NumberInt(3),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Amplificadores",
      subcategoria: "Amplificadores",
      marca: "Marshall",
      modelo: "MG40GFX",
      imagen: "AM002.jpg",
      descripcion: "40W, 4 canales, efectos digitales integrados.",
      codigo_legacy: "AM002",
      stock_critico: NumberInt(3)
    },
    tags: ["am002","am-marsh-mg40gfx-24","marshall","mg40gfx","audio pro","amplificadores"]
  },
  {
    codigo: "AM-HARTK-HD100-25",
    nombre: "Amplificador Bajo 100W",
    categoria: "Audio Pro",
    precio_clp: NumberInt(449990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Amplificadores",
      subcategoria: "Amplificadores",
      marca: "Hartke",
      modelo: "HD100",
      imagen: "AM003.jpg",
      descripcion: "100W, tweeter integrado, ecualizador de 4 bandas.",
      codigo_legacy: "AM003",
      stock_critico: NumberInt(3)
    },
    tags: ["am003","am-hartk-hd100-25","hartke","hd100","audio pro","amplificadores"]
  },
  {
    codigo: "AM-FISHM-LOUDBOXMIN-26",
    nombre: "Amplificador Acústico 40W",
    categoria: "Audio Pro",
    precio_clp: NumberInt(499990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Amplificadores",
      subcategoria: "Amplificadores",
      marca: "Fishman",
      modelo: "Loudbox Mini",
      imagen: "AM004.jpg",
      descripcion: "60W, 2 canales, reverb y chorus incorporados.",
      codigo_legacy: "AM004",
      stock_critico: NumberInt(3)
    },
    tags: ["am004","am-fishm-loudboxmin-26","fishman","loudbox mini","audio pro","amplificadores"]
  },
  {
    codigo: "MIC-SHU-SM58-01",
    nombre: "Micrófono Dinámico Cardioide",
    categoria: "Audio Pro",
    precio_clp: NumberInt(149990),
    stock_disponible: NumberInt(8),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Micrófonos",
      subcategoria: "Micrófonos",
      marca: "Shure",
      modelo: "SM58",
      imagen: "MI001.jpg",
      descripcion: "Estándar industria para voz en vivo.",
      codigo_legacy: "MI001",
      stock_critico: NumberInt(3)
    },
    tags: ["mi001","mic-shu-sm58-01","shure","sm58","audio pro","micrófonos"]
  },
  {
    codigo: "MI-SHURE-SM57-28",
    nombre: "Micrófono Dinámico Instrumento",
    categoria: "Audio Pro",
    precio_clp: NumberInt(139990),
    stock_disponible: NumberInt(6),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Micrófonos",
      subcategoria: "Micrófonos",
      marca: "Shure",
      modelo: "SM57",
      imagen: "MI002.jpg",
      descripcion: "Ideal para captura de instrumentos y amplificadores.",
      codigo_legacy: "MI002",
      stock_critico: NumberInt(3)
    },
    tags: ["mi002","mi-shure-sm57-28","shure","sm57","audio pro","micrófonos"]
  },
  {
    codigo: "MI-AUDIO-AT2020-29",
    nombre: "Micrófono Condensador",
    categoria: "Audio Pro",
    precio_clp: NumberInt(199990),
    stock_disponible: NumberInt(4),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Micrófonos",
      subcategoria: "Micrófonos",
      marca: "Audio-Tech.",
      modelo: "AT2020",
      imagen: "MI003.jpg",
      descripcion: "Cardioide, XLR, ideal para grabación en estudio.",
      codigo_legacy: "MI003",
      stock_critico: NumberInt(3)
    },
    tags: ["mi003","mi-audio-at2020-29","audio-tech.","at2020","audio pro","micrófonos"]
  },
  {
    codigo: "MI-BLUE-YETI-30",
    nombre: "Micrófono USB de Condensador",
    categoria: "Audio Pro",
    precio_clp: NumberInt(299990),
    stock_disponible: NumberInt(5),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Micrófonos",
      subcategoria: "Micrófonos",
      marca: "Blue",
      modelo: "Yeti",
      imagen: "MI004.jpg",
      descripcion: "USB, 4 patrones polares, ideal para streaming y podcast.",
      codigo_legacy: "MI004",
      stock_critico: NumberInt(3)
    },
    tags: ["mi004","mi-blue-yeti-30","blue","yeti","audio pro","micrófonos"]
  },
  {
    codigo: "PE-BOSS-DS1-31",
    nombre: "Pedal Distorsión",
    categoria: "Audio Pro",
    precio_clp: NumberInt(79990),
    stock_disponible: NumberInt(7),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Pedales de Efectos",
      subcategoria: "Pedales de Efectos",
      marca: "Boss",
      modelo: "DS-1",
      imagen: "PE001.jpg",
      descripcion: "Clásico pedal de distorsión, 3 controles.",
      codigo_legacy: "PE001",
      stock_critico: NumberInt(3)
    },
    tags: ["pe001","pe-boss-ds1-31","boss","ds-1","audio pro","pedales de efectos"]
  },
  {
    codigo: "PE-BOSS-RV6-32",
    nombre: "Pedal Reverb",
    categoria: "Audio Pro",
    precio_clp: NumberInt(179990),
    stock_disponible: NumberInt(4),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Pedales de Efectos",
      subcategoria: "Pedales de Efectos",
      marca: "Boss",
      modelo: "RV-6",
      imagen: "PE002.jpg",
      descripcion: "8 modos de reverb, control de shimmer.",
      codigo_legacy: "PE002",
      stock_critico: NumberInt(3)
    },
    tags: ["pe002","pe-boss-rv6-32","boss","rv-6","audio pro","pedales de efectos"]
  },
  {
    codigo: "PE-BOSS-ME80-33",
    nombre: "Pedal Multi-efectos",
    categoria: "Audio Pro",
    precio_clp: NumberInt(349990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Pedales de Efectos",
      subcategoria: "Pedales de Efectos",
      marca: "Boss",
      modelo: "ME-80",
      imagen: "PE003.jpg",
      descripcion: "Diseño tipo pedalboard, 8 efectos simultáneos.",
      codigo_legacy: "PE003",
      stock_critico: NumberInt(3)
    },
    tags: ["pe003","pe-boss-me80-33","boss","me-80","audio pro","pedales de efectos"]
  },
  {
    codigo: "PE-BOSS-TU3-34",
    nombre: "Pedal Tuner Cromático",
    categoria: "Audio Pro",
    precio_clp: NumberInt(89990),
    stock_disponible: NumberInt(8),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Pedales de Efectos",
      subcategoria: "Pedales de Efectos",
      marca: "Boss",
      modelo: "TU-3",
      imagen: "PE004.jpg",
      descripcion: "Afinador cromático, indicador de tono.",
      codigo_legacy: "PE004",
      stock_critico: NumberInt(3)
    },
    tags: ["pe004","pe-boss-tu3-34","boss","tu-3","audio pro","pedales de efectos"]
  },
  {
    codigo: "PE-MXR-CARBONCOPY-35",
    nombre: "Pedal Delay",
    categoria: "Audio Pro",
    precio_clp: NumberInt(179990),
    stock_disponible: NumberInt(4),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Pedales de Efectos",
      subcategoria: "Pedales de Efectos",
      marca: "MXR",
      modelo: "Carbon Copy",
      imagen: "PE005.jpg",
      descripcion: "Delay analógico cálido, tiempo 600ms.",
      codigo_legacy: "PE005",
      stock_critico: NumberInt(3)
    },
    tags: ["pe005","pe-mxr-carboncopy-35","mxr","carbon copy","audio pro","pedales de efectos"]
  },
  {
    codigo: "PE-IBANE-TS9-36",
    nombre: "Pedal Overdrive",
    categoria: "Audio Pro",
    precio_clp: NumberInt(99990),
    stock_disponible: NumberInt(6),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Pedales de Efectos",
      subcategoria: "Pedales de Efectos",
      marca: "Ibanez",
      modelo: "TS9",
      imagen: "PE006.jpg",
      descripcion: "Tube Screamer clásico, sonido suave y orgánico.",
      codigo_legacy: "PE006",
      stock_critico: NumberInt(3)
    },
    tags: ["pe006","pe-ibane-ts9-36","ibanez","ts9","audio pro","pedales de efectos"]
  },
  {
    codigo: "AC-ERNIE-SUPERSLINK-37",
    nombre: "Cuerdas Guitarra Eléctrica 09-42",
    categoria: "Accesorios",
    precio_clp: NumberInt(8990),
    stock_disponible: NumberInt(25),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Ernie Ball",
      modelo: "Super Slinky",
      imagen: "AC001.jpg",
      descripcion: "Juego 6 cuerdas, calibre ligero.",
      codigo_legacy: "AC001",
      stock_critico: NumberInt(3)
    },
    tags: ["ac001","ac-ernie-superslink-37","ernie ball","super slinky","accesorios"]
  },
  {
    codigo: "AC-ERNIE-EARTHWOOD-38",
    nombre: "Cuerdas Guitarra Acústica 12-53",
    categoria: "Accesorios",
    precio_clp: NumberInt(10990),
    stock_disponible: NumberInt(20),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Ernie Ball",
      modelo: "Earthwood",
      imagen: "AC002.jpg",
      descripcion: "Bronce fósforo, sonido cálido.",
      codigo_legacy: "AC002",
      stock_critico: NumberInt(3)
    },
    tags: ["ac002","ac-ernie-earthwood-38","ernie ball","earthwood","accesorios"]
  },
  {
    codigo: "AC-ERNIE-REGULARSLI-39",
    nombre: "Cuerdas Bajo 45-105",
    categoria: "Accesorios",
    precio_clp: NumberInt(14990),
    stock_disponible: NumberInt(12),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Ernie Ball",
      modelo: "Regular Slinky",
      imagen: "AC003.jpg",
      descripcion: "Cuerdas de níquel enrollado, set 4 cuerdas.",
      codigo_legacy: "AC003",
      stock_critico: NumberInt(3)
    },
    tags: ["ac003","ac-ernie-regularsli-39","ernie ball","regular slinky","accesorios"]
  },
  {
    codigo: "AC-FENDE-351-40",
    nombre: "Púas de Guitarra x10 (0.73mm)",
    categoria: "Accesorios",
    precio_clp: NumberInt(3990),
    stock_disponible: NumberInt(50),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Fender",
      modelo: "351",
      imagen: "AC004.jpg",
      descripcion: "Celulosa, grosor medio.",
      codigo_legacy: "AC004",
      stock_critico: NumberInt(3)
    },
    tags: ["ac004","ac-fende-351-40","fender","351","accesorios"]
  },
  {
    codigo: "AC-DUNLO-TRIGGER-41",
    nombre: "Capotraste Guitarra",
    categoria: "Accesorios",
    precio_clp: NumberInt(12990),
    stock_disponible: NumberInt(15),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Dunlop",
      modelo: "Trigger",
      imagen: "AC005.jpg",
      descripcion: "Capotraste de resorte, compatible 6 cuerdas.",
      codigo_legacy: "AC005",
      stock_critico: NumberInt(3)
    },
    tags: ["ac005","ac-dunlo-trigger-41","dunlop","trigger","accesorios"]
  },
  {
    codigo: "AC-SNARK-SN5-42",
    nombre: "Afinador de Clip",
    categoria: "Accesorios",
    precio_clp: NumberInt(8990),
    stock_disponible: NumberInt(20),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Snark",
      modelo: "SN-5",
      imagen: "AC006.jpg",
      descripcion: "Afinador cromático de clip, pantalla giratoria.",
      codigo_legacy: "AC006",
      stock_critico: NumberInt(3)
    },
    tags: ["ac006","ac-snark-sn5-42","snark","sn-5","accesorios"]
  },
  {
    codigo: "AC-MONST-S100I3-43",
    nombre: "Cable Instrumento 3m",
    categoria: "Accesorios",
    precio_clp: NumberInt(12990),
    stock_disponible: NumberInt(15),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Monster",
      modelo: "S100-I-3",
      imagen: "AC007.jpg",
      descripcion: "Cable trenzado, conectores dorados, 3 metros.",
      codigo_legacy: "AC007",
      stock_critico: NumberInt(3)
    },
    tags: ["ac007","ac-monst-s100i3-43","monster","s100-i-3","accesorios"]
  },
  {
    codigo: "AC-MONST-S100I6-44",
    nombre: "Cable Instrumento 6m",
    categoria: "Accesorios",
    precio_clp: NumberInt(17990),
    stock_disponible: NumberInt(10),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Monster",
      modelo: "S100-I-6",
      imagen: "AC008.jpg",
      descripcion: "Cable trenzado, conectores dorados, 6 metros.",
      codigo_legacy: "AC008",
      stock_critico: NumberInt(3)
    },
    tags: ["ac008","ac-monst-s100i6-44","monster","s100-i-6","accesorios"]
  },
  {
    codigo: "AC-HERCU-GS302B-45",
    nombre: "Soporte Guitarra de Piso",
    categoria: "Accesorios",
    precio_clp: NumberInt(22990),
    stock_disponible: NumberInt(12),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Hercules",
      modelo: "GS302B",
      imagen: "AC009.jpg",
      descripcion: "Soporte plegable con enganche automático.",
      codigo_legacy: "AC009",
      stock_critico: NumberInt(3)
    },
    tags: ["ac009","ac-hercu-gs302b-45","hercules","gs302b","accesorios"]
  },
  {
    codigo: "AC-HERCU-WAH202-46",
    nombre: "Soporte Guitarra de Pared",
    categoria: "Accesorios",
    precio_clp: NumberInt(18990),
    stock_disponible: NumberInt(10),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Accesorios",
      subcategoria: "Accesorios",
      marca: "Hercules",
      modelo: "WAH-202",
      imagen: "AC010.jpg",
      descripcion: "Montaje a pared, enganche automático.",
      codigo_legacy: "AC010",
      stock_critico: NumberInt(3)
    },
    tags: ["ac010","ac-hercu-wah202-46","hercules","wah-202","accesorios"]
  },
  {
    codigo: "ES-FOCUS-SCARLETTSO-47",
    nombre: "Interfaz de Audio 2x2 USB",
    categoria: "Audio Pro",
    precio_clp: NumberInt(149990),
    stock_disponible: NumberInt(4),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Estudio y Grabación",
      subcategoria: "Estudio y Grabación",
      marca: "Focusrite",
      modelo: "Scarlett Solo",
      imagen: "ES001.jpg",
      descripcion: "1 entrada XLR+instrumento, 2 salidas, 24bit/192kHz.",
      codigo_legacy: "ES001",
      stock_critico: NumberInt(3)
    },
    tags: ["es001","es-focus-scarlettso-47","focusrite","scarlett solo","audio pro","estudio y grabación"]
  },
  {
    codigo: "ES-AUDIO-ATHM20X-48",
    nombre: "Auriculares de Estudio",
    categoria: "Audio Pro",
    precio_clp: NumberInt(79990),
    stock_disponible: NumberInt(6),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Estudio y Grabación",
      subcategoria: "Estudio y Grabación",
      marca: "Audio-Tech.",
      modelo: "ATH-M20x",
      imagen: "ES002.jpg",
      descripcion: "Circumaurales, respuesta 15Hz-20kHz.",
      codigo_legacy: "ES002",
      stock_critico: NumberInt(3)
    },
    tags: ["es002","es-audio-athm20x-48","audio-tech.","ath-m20x","audio pro","estudio y grabación"]
  },
  {
    codigo: "ES-AUDIO-ATHM50X-49",
    nombre: "Auriculares de Estudio Pro",
    categoria: "Audio Pro",
    precio_clp: NumberInt(219990),
    stock_disponible: NumberInt(4),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Estudio y Grabación",
      subcategoria: "Estudio y Grabación",
      marca: "Audio-Tech.",
      modelo: "ATH-M50x",
      imagen: "ES003.jpg",
      descripcion: "Referencia de industria, sonido neutro y detallado.",
      codigo_legacy: "ES003",
      stock_critico: NumberInt(3)
    },
    tags: ["es003","es-audio-athm50x-49","audio-tech.","ath-m50x","audio pro","estudio y grabación"]
  },
  {
    codigo: "ES-YAMAH-HS5-50",
    nombre: "Monitor de Estudio 5\"",
    categoria: "Audio Pro",
    precio_clp: NumberInt(349990),
    stock_disponible: NumberInt(2),
    estado: "ACTIVO",
    especificaciones: {
      tipo: "Estudio y Grabación",
      subcategoria: "Estudio y Grabación",
      marca: "Yamaha",
      modelo: "HS5",
      imagen: "ES004.jpg",
      descripcion: "Altavoz activo, respuesta plana, ideal mezcla.",
      codigo_legacy: "ES004",
      stock_critico: NumberInt(3)
    },
    tags: ["es004","es-yamah-hs5-50","yamaha","hs5","audio pro","estudio y grabación"]
  }
];

let upsertedCount = 0;
let modifiedCount = 0;

products.forEach(p => {
  const result = targetDb.productos.updateOne(
    { codigo: p.codigo },
    { $set: p },
    { upsert: true }
  );
  if (result.upsertedId || result.nUpserted) {
    upsertedCount++;
  } else if ((result.modifiedCount || result.nModified || 0) > 0) {
    modifiedCount++;
  }
});

print("[Seed 50] Done. Processed: " + products.length + ", Upserted: " + upsertedCount + ", Modified: " + modifiedCount + ". Total active: " + targetDb.productos.countDocuments({ estado: "ACTIVO" }));