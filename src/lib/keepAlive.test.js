/**
 * Work started after the answer must be kept alive, or Vercel freezes it mid-send (2026-11-10: 28 of 43 repair-lead
 * emails neither sent nor failed). Two halves: the helper itself, and a guard that no API file starts a notification
 * and drops it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const registered = [];
let insideRequest = true;
vi.mock('next/server', () => ({
  after: (task) => {
    if (!insideRequest) throw new Error('`after` was called outside a request scope');
    registered.push(task);
  },
}));

import { keepAlive } from './keepAlive';

beforeEach(() => { registered.length = 0; insideRequest = true; });

describe('keepAlive', () => {
  it('hands the work to after(), so the function lives until it settles', async () => {
    let finish;
    const work = new Promise((resolve) => { finish = resolve; });
    keepAlive(work, 'lead email');
    expect(registered).toHaveLength(1);
    let done = false;
    const held = registered[0]().then(() => { done = true; });
    await Promise.resolve();
    expect(done).toBe(false);
    finish();
    await held;
    expect(done).toBe(true);
  });

  it('a failure is logged, never thrown at the caller or at after()', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(keepAlive(Promise.reject(new Error('smtp down')), 'lead email')).resolves.toBeUndefined();
    await expect(registered[0]()).resolves.toBeUndefined();
    expect(quiet).toHaveBeenCalledWith('lead email failed (non-fatal):', 'smtp down');
    quiet.mockRestore();
  });

  it('outside a request it just runs', async () => {
    insideRequest = false;
    let ran = false;
    await keepAlive(Promise.resolve().then(() => { ran = true; }));
    expect(ran).toBe(true);
    expect(registered).toHaveLength(0);
  });
});

describe('no API file starts a notification and drops it', () => {
  const API = path.resolve(__dirname, '../app/api');
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.js$/.test(entry.name) && !/\.test\.js$/.test(entry.name)) files.push(full);
    }
  };
  walk(API);

  it('every notification call is awaited, returned, or kept alive', () => {
    // A statement that BEGINS with the call: nothing is waiting for it and nothing keeps the function alive.
    const dropped = /^\s*(?:void\s+)?(?:NotificationService\.createNotification|notifyAllAdmins|notify[A-Z]\w*|sendNotificationEmail|sendEmail\w*|sendPushToUser)\(/;
    const found = [];
    for (const file of files) {
      fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (dropped.test(line)) found.push(`${path.relative(API, file)}:${i + 1}  ${line.trim().slice(0, 80)}`);
      });
    }
    expect(found, 'wrap it in keepAlive(...) from @/lib/keepAlive, or await it').toEqual([]);
  });
});
