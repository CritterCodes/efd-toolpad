import { NextResponse } from 'next/server';
import { canCreateRepair, isAdminRole } from '@/lib/repairAccess';

/**
 * Who may call the AI helper routes (owner, 2026-10-01, OPEN-QUESTIONS Q11): "I don't want it abused, but if it's on
 * a page that they can access, then they should be able to use it." Each route is gated by the page that uses it:
 *
 *   - smart intake (parse-smart-intake, describe-item-image) — the repair intake: admins, stores (wholesalers) and
 *     on-site repair ops, exactly who may create a repair. "That's our flagship intake."
 *   - task builder (build-task, generate-ai-meta) — Admin → Tasks: admins.
 *
 * Every call costs a Gemini request, so a signed-in customer or an off-site account gets a 403.
 */
export const AI_SURFACES = Object.freeze({
  intake: canCreateRepair,
  taskBuilder: isAdminRole,
});

/** Returns a 403 response when the session may not use this AI surface, or null when it may. */
export function aiRefusal(session, surface) {
  const allowed = AI_SURFACES[surface];
  if (!allowed) throw new Error(`unknown AI surface: ${surface}`);
  if (allowed(session)) return null;
  return NextResponse.json({ success: false, error: 'This AI helper is not available to your account.' }, { status: 403 });
}
