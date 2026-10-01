/**
 * What in the catalog uses a material or a tool — asked BEFORE one is archived (EFD-DEFECTS P21).
 *
 * Deleting used to be permanent and blind: a deleted material left every task that used it unpriceable,
 * and repair tickets pointed at a task that was gone. Nothing is deleted any more — tasks, materials and
 * tools are ARCHIVED — and a material or tool an active task still uses can't be archived until those
 * tasks stop using it.
 */
import { db } from '@/lib/database';

export class InUseError extends Error {
  constructor(what, users) {
    const list = users.slice(0, 8).join(', ') + (users.length > 8 ? ` and ${users.length - 8} more` : '');
    super(`${what} is still used by: ${list}. Remove it from them first.`);
    this.name = 'InUseError';
    this.code = 'IN_USE';
    this.users = users;
  }
}

/** Titles of the active tasks, and names of active processes, that use this material. */
export async function usersOfMaterial(materialId) {
  const dbi = await db.connect();
  const id = String(materialId);
  const [tasks, processes] = await Promise.all([
    dbi.collection('tasks').find({ isActive: { $ne: false }, 'materials.materialId': id }, { projection: { title: 1 } }).toArray(),
    dbi.collection('processes').find({ isActive: { $ne: false }, 'materials.materialId': id }, { projection: { displayName: 1 } }).toArray(),
  ]);
  return [
    ...tasks.map((t) => t.title),
    ...processes.map((p) => (p.displayName ? `process "${p.displayName}"` : '')),
  ].filter(Boolean);
}

/** Titles of the active tasks that use this tool or machine. */
export async function usersOfTool(toolId) {
  const dbi = await db.connect();
  const tasks = await dbi.collection('tasks').find({ isActive: { $ne: false }, 'tools.toolId': String(toolId) }, { projection: { title: 1 } }).toArray();
  return tasks.map((t) => t.title).filter(Boolean);
}
