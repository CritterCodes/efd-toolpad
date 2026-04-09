const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const envFiles = ['.env.local', '.env.development.local', '.env.development', '.env'];
for (const file of envFiles) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  const raw = fs.readFileSync(full, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function gt(a, b, eps = 1e-6) { return a - b > eps; }

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error('No MongoDB URI found in env files');

  const client = new MongoClient(uri);
  await client.connect();

  const dbName = process.env.MONGO_DB_NAME || process.env.MONGODB_DB || process.env.MONGODB_DATABASE || undefined;
  const db = dbName ? client.db(dbName) : client.db();
  const col = db.collection('materials');

  const materials = await col.find({}, {
    projection: {
      displayName: 1,
      isActive: 1,
      unitCost: 1,
      costPerPortion: 1,
      stullerPrice: 1,
      portionsPerUnit: 1,
      stullerProducts: 1
    }
  }).toArray();

  let topLevelComparable = 0;
  let topLevelMarkedUp = 0;
  let topLevelRawOrEqual = 0;

  let variantsComparable = 0;
  let variantsMarkedUp = 0;
  let variantsRawOrEqual = 0;

  for (const m of materials) {
    const stullerPrice = n(m.stullerPrice);
    const unitCost = n(m.unitCost);
    if (stullerPrice > 0 && unitCost > 0) {
      topLevelComparable += 1;
      if (gt(unitCost, stullerPrice)) topLevelMarkedUp += 1;
      else topLevelRawOrEqual += 1;
    }

    if (Array.isArray(m.stullerProducts)) {
      for (const p of m.stullerProducts) {
        const sp = n(p?.stullerPrice);
        const mup = n(p?.markedUpPrice ?? p?.unitCost);
        if (sp > 0 && mup > 0) {
          variantsComparable += 1;
          if (gt(mup, sp)) variantsMarkedUp += 1;
          else variantsRawOrEqual += 1;
        }
      }
    }
  }

  const sampleTopLevelNotMarkedUp = materials
    .filter((m) => n(m.stullerPrice) > 0 && n(m.unitCost) > 0 && !gt(n(m.unitCost), n(m.stullerPrice)))
    .slice(0, 8)
    .map((m) => ({
      id: String(m._id),
      displayName: m.displayName,
      stullerPrice: n(m.stullerPrice),
      unitCost: n(m.unitCost),
      costPerPortion: n(m.costPerPortion),
      portionsPerUnit: n(m.portionsPerUnit) || 1
    }));

  const result = {
    totalMaterials: materials.length,
    activeMaterials: materials.filter((m) => m.isActive !== false).length,
    topLevel: {
      comparableCount: topLevelComparable,
      markedUpCount: topLevelMarkedUp,
      rawOrEqualCount: topLevelRawOrEqual,
      markedUpPct: topLevelComparable ? Number(((topLevelMarkedUp / topLevelComparable) * 100).toFixed(2)) : 0
    },
    stullerVariants: {
      comparableCount: variantsComparable,
      markedUpCount: variantsMarkedUp,
      rawOrEqualCount: variantsRawOrEqual,
      markedUpPct: variantsComparable ? Number(((variantsMarkedUp / variantsComparable) * 100).toFixed(2)) : 0
    },
    sampleTopLevelNotMarkedUp
  };

  console.log(JSON.stringify(result, null, 2));
  await client.close();
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
