import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
};

loadEnvFile(path.join(repoRoot, '.env.local'));
loadEnvFile(path.join(repoRoot, '.env'));

process.env.MONGO_DB_NAME = 'efd-database';

const args = new Set(process.argv.slice(2));
const watch = args.has('--watch');
const once = args.has('--once') || !watch;
const idleMs = Number(process.env.WHOLESALE_IMPORT_WORKER_IDLE_MS || 15000);
const workerId = process.env.WHOLESALE_IMPORT_WORKER_ID || `${os.hostname()}-${process.pid}`;

const {
  claimNextQueuedWholesaleImportJob,
  getWholesaleImportJob,
  runWholesaleImportJob,
} = await import('../src/lib/wholesaleLeadService.js');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runOneJob = async () => {
  const job = await claimNextQueuedWholesaleImportJob(workerId);
  if (!job) return false;

  console.log(`[wholesale-import-worker] Running job ${job.id} against ${process.env.MONGO_DB_NAME}`);
  await runWholesaleImportJob(job.id, workerId);
  const finished = await getWholesaleImportJob(job.id);
  console.log(`[wholesale-import-worker] Job ${job.id} finished with status ${finished?.status || 'unknown'}`);
  return true;
};

console.log(`[wholesale-import-worker] Started. DB=${process.env.MONGO_DB_NAME} worker=${workerId}`);
console.log(`[wholesale-import-worker] Mode=${watch ? 'watch' : 'once'}`);

do {
  const processed = await runOneJob();
  if (once) break;
  if (!processed) await sleep(idleMs);
} while (watch);

console.log('[wholesale-import-worker] No queued import jobs to process.');
process.exit(0);
