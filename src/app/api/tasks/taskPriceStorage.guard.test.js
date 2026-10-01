import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD (goal step 4, 2026-10-01): a calculated price is never stored on a task or a material.
 *
 * Owner ruling 2026-09-30 (one pricing engine): a price is always calculated, never saved. Stored snapshots went
 * stale and were re-saved on every edit, because the editor loads a task WITH its computed prices and sends it back.
 * The services stripped them, but the model — the one place tasks are written — trusted its callers, so a new
 * caller (a script, an import, efd-mcp's create_task) could store a price by forgetting. Now TasksModel strips at
 * the sink, and this guard keeps every write going through it.
 */
const SRC = path.resolve(__dirname, '../../..');

const { insertOne, updateOne, findOne } = vi.hoisted(() => ({
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  findOne: vi.fn(),
}));
vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(),
    _instance: { collection: () => ({ insertOne, updateOne, findOne }) },
  },
}));

const WRITE = '(?:insertOne|insertMany|updateOne|updateMany|bulkWrite|findOneAndUpdate|replaceOne)';
const DIRECT = new RegExp(String.raw`collection\(\s*(?:['"]tasks['"]|[\w.]*TASKS_COLLECTION\b[^)]*)\)\s*\.\s*${WRITE}\s*\(`);
const BOUND = /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?[\w.]*(?:dbTasks\(\)|collection\(\s*(?:['"]tasks['"]|[\w.]*TASKS_COLLECTION\b[^)]*|this\.collectionName)\s*\))\s*;/g;

/** Pure: does this source write the tasks collection? */
export function writesTasks(text) {
  if (DIRECT.test(text)) return true;
  for (const m of text.matchAll(BOUND)) {
    // A `this.collectionName` binding only counts in a class whose collection IS tasks.
    if (m[0].includes('this.collectionName') && !/collectionName\s*=\s*[^;\n]*(?:TASKS_COLLECTION|['"]tasks['"])/.test(text)) continue;
    if (new RegExp(String.raw`\b${m[1]}\s*\.\s*${WRITE}\s*\(`).test(text)) return true;
  }
  return false;
}

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!entry.name.startsWith('.') && entry.name !== 'node_modules') sourceFiles(full, out); }
    else if (/\.(m?js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

const PRICE = {
  pricing: { retail: 99 }, universalPricing: { gold: 1 }, basePrice: 10, price: 11, retailPrice: 12,
  wholesalePrice: 13, totalCosts: 14, wholesaleCosts: 15, calculatedAt: new Date(0),
  pricingStatus: 'ok', pricingMessage: 'priced', laborCost: 50,
};
const INPUTS = { title: 'Rhodium plate', laborHours: 0.1, minimumPrice: 5, priceOverride: null };

describe('a task never stores a calculated price', () => {
  beforeEach(() => {
    insertOne.mockReset().mockResolvedValue({ insertedId: '64b000000000000000000001' });
    updateOne.mockReset().mockResolvedValue({ matchedCount: 1 });
    findOne.mockReset().mockResolvedValue({ _id: 'abc' });
  });

  it('every direct write to tasks is the model, which strips at the sink', () => {
    const writers = sourceFiles(SRC)
      .map((file) => ({ rel: path.relative(SRC, file).split(path.sep).join('/'), text: fs.readFileSync(file, 'utf8') }))
      .filter(({ text }) => writesTasks(text))
      .map(({ rel }) => rel);
    expect(writers).toEqual(['app/api/tasks/model.js']);
  });

  it('TasksModel.createTask drops every computed price and keeps the inputs', async () => {
    const { TasksModel } = await import('./model.js');
    await TasksModel.createTask({ ...INPUTS, ...PRICE });
    const stored = insertOne.mock.calls[0][0];
    for (const field of Object.keys(PRICE)) expect(stored).not.toHaveProperty(field);
    expect(stored).toMatchObject(INPUTS);
  });

  it('TasksModel.updateTask drops every computed price and keeps the inputs', async () => {
    const { TasksModel } = await import('./model.js');
    await TasksModel.updateTask('64b000000000000000000000', { ...INPUTS, ...PRICE });
    const { $set } = updateOne.mock.calls[0][1];
    for (const field of Object.keys(PRICE)) expect($set).not.toHaveProperty(field);
    expect($set).toMatchObject(INPUTS);
  });

  it('a material is stored without a computed price (Stuller cost is an input, not a price)', async () => {
    const { COMPUTED_PRICE_FIELDS } = await import('@/services/pricing/computedFields');
    const { default: Material } = await import('../materials/class.js');
    const stored = new Material('Rhodium', 'plating', 1, 'gram', [], 'Stuller', '', '45-4142', true, 'test').toObject();
    for (const field of COMPUTED_PRICE_FIELDS) expect(stored).not.toHaveProperty(field);
  });

  it('sees every way of writing tasks — and not a file that only reads them', () => {
    expect(writesTasks("await dbi.collection('tasks').updateMany(")).toBe(true);
    expect(writesTasks('db.collection(Constants.TASKS_COLLECTION).insertOne(t)')).toBe(true);
    expect(writesTasks('const tasks = await db.dbTasks();\nawait tasks.bulkWrite(ops);')).toBe(true);
    expect(writesTasks("static collectionName = Constants.TASKS_COLLECTION || 'tasks';\nconst collection = db._instance.collection(this.collectionName);\nawait collection.insertOne(x);")).toBe(true);
    expect(writesTasks("static collectionName = 'tools';\nconst collection = db._instance.collection(this.collectionName);\nawait collection.insertOne(x);")).toBe(false);
    expect(writesTasks("const t = await dbi.collection('tasks').find({}).toArray();")).toBe(false);
    expect(writesTasks("dbi.collection('taskLogs').updateMany(")).toBe(false);
  });
});
