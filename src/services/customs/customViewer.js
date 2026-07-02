/**
 * Custom-order 3D viewer + share link (S7e) — per custom-design-viewer-contract.md.
 * Replaces the legacy Shapr3D `designLink` with an embedded REFRAKT viewer
 * (`designModel`, same shape as a product `viewer`) + a public, login-free share
 * link (`share { token, enabled, createdAt }`) at `<shop>/d/<token>`.
 *
 * Reuses the product contract's meshMap rules. The `/d/<token>` page + `/api/glb/inspect`
 * are storefront-hosted; admin only writes the model + mints/revokes the token.
 */
import { randomBytes } from 'crypto';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { METAL_FINISHES, GEM_PRESETS } from '@/services/products/productContract';
import { NotificationService } from '@/lib/notificationService';

export function validateDesignModel(designModel = {}) {
  const errors = [];
  if (!designModel.glbUrl) errors.push('designModel.glbUrl is required');
  if (!Array.isArray(designModel.meshMap) || designModel.meshMap.length === 0) {
    errors.push('designModel.meshMap must be a non-empty array');
  } else {
    designModel.meshMap.forEach((slot, i) => {
      if (slot.type === 'metal' && !METAL_FINISHES.includes(slot.finish)) {
        errors.push(`meshMap[${i}]: metal slot needs a valid finish`);
      }
      if (slot.type === 'gem' && !slot.gemPreset && !slot.ior) {
        errors.push(`meshMap[${i}]: gem slot needs a gemPreset or custom params`);
      }
      if (slot.type === 'gem' && slot.gemPreset && !GEM_PRESETS.includes(slot.gemPreset)) {
        errors.push(`meshMap[${i}]: invalid gemPreset "${slot.gemPreset}"`);
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

export function shareUrl(token) {
  const base = process.env.NEXT_PUBLIC_SHOP_URL || '';
  return `${base}/d/${token}`;
}

/** Attach/replace the 3D model on a custom order (validated). MERGES with the existing
 * designModel so fields the caller doesn't manage (e.g. `stlVolumeCm3`, written by the
 * STL upload for the casting estimator) aren't wiped when materials are (re)assigned. */
export async function setDesignModel(customID, designModel) {
  const { valid, errors } = validateDesignModel(designModel);
  if (!valid) {
    const err = new Error(`Invalid designModel: ${errors.join('; ')}`);
    err.code = 'INVALID_DESIGN_MODEL';
    throw err;
  }
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  const merged = { ...(order.designModel || {}), ...designModel };
  const updated = await CustomOrdersModel.updateById(customID, { designModel: merged });
  if (!updated) throw new Error('Custom order not found.');
  return updated;
}

/** Mint a public share link (requires a model first — the share page 404s otherwise). */
export async function createShareLink(customID, shareTitle) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  if (!order.designModel?.glbUrl) {
    const err = new Error('Set a 3D model (designModel.glbUrl) before creating a share link.');
    err.code = 'NO_MODEL';
    throw err;
  }
  const token = randomBytes(16).toString('hex');
  const share = { token, enabled: true, createdAt: new Date() };
  const updated = await CustomOrdersModel.updateById(customID, {
    share,
    ...(shareTitle != null ? { shareTitle } : {}),
  });

  // X3 — the design/GLB is now client-visible (share link minted + enabled). Tell the
  // client their design is ready to review. This is the single "becomes visible" edge:
  // both the manual Share tab and the auto-share on GLB QC approval mint the link here.
  // Best-effort — never block minting the link.
  if (updated?.clientID) {
    try {
      await NotificationService.createNotification({
        userId: updated.clientID,
        type: 'custom-design-ready',
        title: 'Your design is ready to review',
        message: `The 3D design for "${updated.title || 'your custom piece'}" is ready — take a look!`,
        channels: ['inApp', 'email'],
        recipientEmail: updated.customerEmail,
        priority: 'high',
        data: { actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/custom-work/portal`, customID },
      });
    } catch (e) {
      console.error('⚠️ custom-design-ready notification failed:', e.message);
    }
  }

  return { token, url: shareUrl(token), order: updated };
}

/** Revoke / re-enable the existing share token. */
export async function setShareEnabled(customID, enabled) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  if (!order.share?.token) throw new Error('No share link to update.');
  const updated = await CustomOrdersModel.updateById(customID, {
    share: { ...order.share, enabled: !!enabled },
  });
  return updated;
}
