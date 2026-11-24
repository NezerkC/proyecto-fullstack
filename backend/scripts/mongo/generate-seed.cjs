const fs = require('fs');

async function main() {
  const m = await import('../../../frontend/sonido-vivo-react/src/data/productos.js');
  const items = m.PRODUCTOS_SONIDO_VIVO.slice(0, 50);
  const regex = /^[A-Z]{1,4}-[A-Z0-9]{2,5}-[A-Z0-9]{2,10}-[0-9]{2}$/;

  const baseline = {
    'GE001': 'G-FND-STRAT-01',
    'MI001': 'MIC-SHU-SM58-01',
    'TC002': 'K-YAM-P45-01',
    'BT002': 'D-ROL-TD02-01'
  };

  const categoryMap = {
    'Guitarras Acústicas': 'Cuerdas',
    'Guitarras Eléctricas': 'Cuerdas',
    'Bajos Eléctricos': 'Cuerdas',
    'Baterías': 'Percusion',
    'Teclados y Pianos': 'Teclados',
    'Amplificadores': 'Audio Pro',
    'Micrófonos': 'Audio Pro',
    'Pedales de Efectos': 'Audio Pro',
    'Estudio y Grabación': 'Audio Pro',
    'Accesorios': 'Accesorios'
  };

  const lines = [];
  lines.push('/**');
  lines.push(' * Sonido Vivo - Seed 50 Catalog Products for MongoDB');
  lines.push(' * Database: sonido_vivo_nosql');
  lines.push(' * Collection: productos');
  lines.push(' */');
  lines.push('');
  lines.push('const targetDb = db.getSiblingDB("sonido_vivo_nosql");');
  lines.push('print("[Seed 50] Seeding 50 Sonido Vivo catalog products into sonido_vivo_nosql.productos...");');
  lines.push('');
  lines.push('const products = [');

  items.forEach((p, idx) => {
    let sku = baseline[p.codigo];
    if (!sku) {
      const prefix = p.codigo.replace(/[0-9]/g, '');
      const brand = (p.marca || 'SON').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5).padEnd(2, 'X');
      const model = (p.modelo || p.codigo).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10).padEnd(2, '0');
      const num = String((idx % 99) + 1).padStart(2, '0');
      sku = (prefix + '-' + brand + '-' + model + '-' + num).toUpperCase();
    }

    if (!regex.test(sku)) {
      throw new Error('Invalid SKU generated: ' + sku);
    }

    const cat = categoryMap[p.categoria] || 'Accesorios';
    const subcat = p.categoria;
    const stockCritico = p.stockCritico || 3;

    const rawTags = [
      p.codigo.toLowerCase(),
      sku.toLowerCase(),
      (p.marca || '').toLowerCase(),
      (p.modelo || '').toLowerCase(),
      cat.toLowerCase(),
      subcat.toLowerCase()
    ].filter(Boolean);
    const tags = [...new Set(rawTags)];

    const docStr = '  {\n' +
      '    codigo: ' + JSON.stringify(sku) + ',\n' +
      '    nombre: ' + JSON.stringify(p.nombre) + ',\n' +
      '    categoria: ' + JSON.stringify(cat) + ',\n' +
      '    precio_clp: NumberInt(' + p.precio + '),\n' +
      '    stock_disponible: NumberInt(' + p.stock + '),\n' +
      '    estado: "ACTIVO",\n' +
      '    especificaciones: {\n' +
      '      tipo: ' + JSON.stringify(subcat) + ',\n' +
      '      subcategoria: ' + JSON.stringify(subcat) + ',\n' +
      '      marca: ' + JSON.stringify(p.marca || "Sonido Vivo") + ',\n' +
      '      modelo: ' + JSON.stringify(p.modelo || "") + ',\n' +
      '      imagen: ' + JSON.stringify(p.imagen || "") + ',\n' +
      '      descripcion: ' + JSON.stringify(p.descripcion || "") + ',\n' +
      '      codigo_legacy: ' + JSON.stringify(p.codigo) + ',\n' +
      '      stock_critico: NumberInt(' + stockCritico + ')\n' +
      '    },\n' +
      '    tags: ' + JSON.stringify(tags) + '\n' +
      '  }' + (idx < items.length - 1 ? ',' : '');
    lines.push(docStr);
  });

  lines.push('];');
  lines.push('');
  lines.push('let upsertedCount = 0;');
  lines.push('let modifiedCount = 0;');
  lines.push('');
  lines.push('products.forEach(p => {');
  lines.push('  const result = targetDb.productos.updateOne(');
  lines.push('    { codigo: p.codigo },');
  lines.push('    { $set: p },');
  lines.push('    { upsert: true }');
  lines.push('  );');
  lines.push('  if (result.getUpsertedId()) {');
  lines.push('    upsertedCount++;');
  lines.push('  } else if (result.getModifiedCount() > 0) {');
  lines.push('    modifiedCount++;');
  lines.push('  }');
  lines.push('});');
  lines.push('');
  lines.push('print("[Seed 50] Done. Processed: " + products.length + ", Upserted: " + upsertedCount + ", Modified: " + modifiedCount + ". Total active: " + targetDb.productos.countDocuments({ estado: "ACTIVO" }));');

  fs.writeFileSync('backend/scripts/mongo/seed-50-productos.js', lines.join('\n'), 'utf8');
  console.log('Successfully written backend/scripts/mongo/seed-50-productos.js with ' + items.length + ' products.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
