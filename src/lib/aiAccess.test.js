import { describe, it, expect } from 'vitest';
import { aiRefusal } from './aiAccess';

/** OPEN-QUESTIONS Q11 (owner, 2026-10-01): the AI helpers follow the page that uses them. */
const admin = { user: { role: 'admin' } };
const store = { user: { role: 'wholesaler' } };
const onsite = { user: { role: 'artisan', employment: { isOnsite: true }, staffCapabilities: { repairOps: true } } };
const offsite = { user: { role: 'artisan', employment: { isOnsite: false } } };
const customer = { user: { role: 'customer' } };

describe('aiRefusal', () => {
  it('lets everyone who can open the intake use smart intake — stores included', () => {
    for (const s of [admin, store, onsite]) expect(aiRefusal(s, 'intake')).toBeNull();
  });

  it('refuses smart intake to customers and off-site accounts', () => {
    for (const s of [customer, offsite]) expect(aiRefusal(s, 'intake')?.status).toBe(403);
  });

  it('keeps the task builder helpers to admins', () => {
    expect(aiRefusal(admin, 'taskBuilder')).toBeNull();
    for (const s of [store, onsite, customer]) expect(aiRefusal(s, 'taskBuilder')?.status).toBe(403);
  });

  it('throws on an unknown surface instead of allowing it', () => {
    expect(() => aiRefusal(admin, 'nope')).toThrow(/unknown AI surface/);
  });
});
