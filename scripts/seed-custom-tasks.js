#!/usr/bin/env node

/**
 * Seed the flat-default "custom" labor tasks into the `tasks` collection so they
 * appear in the custom quote builder's labor autocomplete (filtered to the
 * `contexts: ['custom']` tag) and act as the cost source auto-added at their stage:
 *   - "CAD QC Review"  → auto-added as a labor line when a CAD designer is assigned.
 *   - "GLB Creation"   → auto-added as a labor line when a GLB work order is created.
 *
 * These are priced like any other task: the PricingEngine yields laborCost = the
 * task's `minimumLaborPrice` floor (no processes), and the per-job cost stays
 * editable on the quote line. Idempotent — upserts by title, so safe to re-run.
 *
 * Usage:  node scripts/seed-custom-tasks.js
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Minimal .env.local loader (dotenv isn't a runtime dep for plain-node scripts).
// Only pulls the keys we need; never logs secret values.
(function loadEnv() {
  try {
    const file = path.join(__dirname, '..', '.env.local');
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const key = m[1];
      if (process.env[key]) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      process.env[key] = val;
    }
  } catch { /* fall back to ambient env */ }
})();

const DB_NAME = process.env.MONGO_DB_NAME || 'efd-database-DEV';

// Flat default costs (editable per job on the quote line, and on the task itself).
// QC mirrors the legacy financial.qcReviewFee default; GLB is a sensible starting fee.
const CUSTOM_TASKS = [
  {
    title: 'CAD QC Review',
    description: 'Peer QC review of the CAD/STL before casting.',
    category: 'CAD',
    sku: 'CAD-CUSTOM-QC',
    shortCode: 'CSTM-QC',
    minimumLaborPrice: 25,
    laborHours: 0.5,
  },
  {
    title: 'GLB Creation',
    description: 'Create the web-ready GLB model from the approved CAD.',
    category: 'CAD',
    sku: 'CAD-CUSTOM-GLB',
    shortCode: 'CSTM-GLB',
    minimumLaborPrice: 50,
    laborHours: 1,
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is required (check .env.local).');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB database: ${DB_NAME}`);
    const tasks = client.db(DB_NAME).collection('tasks');

    for (const t of CUSTOM_TASKS) {
      const now = new Date();
      const res = await tasks.updateOne(
        { title: t.title },
        {
          $set: {
            title: t.title,
            description: t.description,
            category: t.category,
            sku: t.sku,
            shortCode: t.shortCode,
            minimumLaborPrice: t.minimumLaborPrice,
            laborHours: t.laborHours,
            contexts: ['custom'],
            processes: [],
            materials: [],
            isActive: true,
            updatedAt: now,
            updatedBy: 'seed:custom-tasks',
          },
          $setOnInsert: { createdAt: now, createdBy: 'seed:custom-tasks' },
        },
        { upsert: true },
      );
      const action = res.upsertedCount ? 'created' : 'updated';
      console.log(`  • ${action}: "${t.title}" (contexts:['custom'], $${t.minimumLaborPrice})`);
    }
    console.log('✅ Custom tasks seeded.');
  } finally {
    await client.close();
  }
}

main().catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); });
