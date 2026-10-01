import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { stlVolumeCm3FromStorage } from '@/lib/stlVolumeStream';
import PiecesModel from '@/app/api/pieces/model';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import WorkOrdersModel from '@/app/api/workOrders/model';
import { storageClient } from '@/lib/storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { STORAGE_BUCKET } from '@/lib/storage';
import { storageUrl } from '@/lib/storage';
import { notifyAllAdmins } from '@/lib/notificationService';
import { BENCH_ACTION_URL, customIDForWorkOrder, customLink, isAdminRole, loadPieceWorkOrder, stlVolumeCm3, woLabel } from './shared';
/**
 * Upload the STL for a CAD work order (C6b). STL = the metal-only model for the
 * manufacturer/casting (no stones). Uploading it completes the CAD design step
 * and moves the WO to QC (CAD QC peer review, C6c). NO hourly labor is logged —
 * the CAD designer is paid the flat design fee captured in the quote (C4/C5),
 * not hours × rate. Stored to MinIO via lib/storage; mirrored onto the piece.
 */
/** Shared gate for both STL paths: CAD discipline, and the assigned designer or staff. */
export async function assertCadStlAllowed({ session, workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  if (wo.discipline !== DISCIPLINE.CAD) {
    const e = new Error('STL upload is only for CAD work orders.'); e.code = 'BAD_REQUEST'; throw e;
  }
  if (!isAdminRole(session) && wo.assignedToUserID && wo.assignedToUserID !== session.user.userID) {
    const e = new Error('Only the assigned designer can upload the STL.'); e.code = 'FORBIDDEN'; throw e;
  }
  return wo;
}

/**
 * Record an STL that the browser already PUT straight to storage, then move the work order to QC.
 *
 * This is the DIRECT-UPLOAD path (see lib/presign.js). A CAD STL is the manufacturing file Carrera
 * casts from — a real one is 91 MB — and a serverless request body caps at ~4.5 MB, so the file cannot
 * travel through `uploadCadStl` below. Same effects as that function minus the storage write.
 *
 * VOLUME IS COMPUTED SERVER-SIDE, never taken from the client (owner: "we cant rely on the client to
 * enter the volume, it has to be calculated"). It feeds `estimateMetalCost`, so it sets the mounting
 * cost and therefore the retail price — a browser-supplied figure would be both untrustworthy (an
 * artisan could understate it to lower their own cost) and unreliable (the parser can fail on a very
 * dense model). Since the request no longer carries the bytes, the server streams them back out of
 * storage: see `stlVolumeCm3FromStorage`. Any `volumeCm3` a caller sends is ignored.
 */
export async function attachCadStl({ session, workOrderID, url, key, originalName }) {
  const wo = await assertCadStlAllowed({ session, workOrderID });
  if (!url || !key) {
    const e = new Error('The uploaded file reference is incomplete.'); e.code = 'BAD_REQUEST'; throw e;
  }
  // Refuse a key outside this piece's own prefix — the presign route chooses keys, so a mismatch means
  // the client is trying to attach someone else's object.
  const expectedPrefix = `production/pieces/${wo.sourceID}/`;
  if (!String(key).startsWith(expectedPrefix)) {
    const e = new Error('That file does not belong to this work order.'); e.code = 'FORBIDDEN'; throw e;
  }
  // Stream the object back out of storage and measure it ourselves. Best-effort by contract: returns
  // null on any failure so a pricing convenience can never strand the work order.
  const volumeCm3 = await stlVolumeCm3FromStorage(key);
  const stl = {
    url, key, originalName: originalName || null,
    volumeCm3,
    volumeSource: volumeCm3 != null ? 'server' : null,
    uploadedBy: session.user.name || session.user.email || session.user.userID,
    uploadedAt: new Date(),
  };
  return finalizeCadStl({ session, wo, workOrderID, stl });
}

/**
 * Swap the STL on a CAD work order WITHOUT touching its status or re-running QC.
 *
 * This is the "make it a little lighter" path: the design already passed (or is in) review and the
 * change is a refinement, not a redo — hollowing, a thickness tweak, a sprue adjustment. Re-running
 * the whole submit→QC ceremony for that would re-charge review fees and bounce the bench. The prior
 * file is kept on files.stlHistory so nothing is ever silently overwritten, and volume is re-measured
 * server-side (it prices the mounting metal) and re-mirrored onto the piece + custom order.
 */
export async function replaceCadStl({ session, workOrderID, url, key, originalName, reason = '' }) {
  const wo = await assertCadStlAllowed({ session, workOrderID });
  if (!wo.files?.stl?.url) {
    const e = new Error('No STL to replace — upload the first one from the bench.'); e.code = 'BAD_REQUEST'; throw e;
  }
  if (!url || !key) {
    const e = new Error('The uploaded file reference is incomplete.'); e.code = 'BAD_REQUEST'; throw e;
  }
  const expectedPrefix = `production/pieces/${wo.sourceID}/`;
  if (!String(key).startsWith(expectedPrefix)) {
    const e = new Error('That file does not belong to this work order.'); e.code = 'FORBIDDEN'; throw e;
  }

  const volumeCm3 = await stlVolumeCm3FromStorage(key);
  const stl = {
    url, key, originalName: originalName || null,
    volumeCm3,
    volumeSource: volumeCm3 != null ? 'server' : null,
    uploadedBy: session.user.name || session.user.email || session.user.userID,
    uploadedAt: new Date(),
  };
  const stlHistory = [
    ...(wo.files?.stlHistory || []),
    { ...wo.files.stl, replacedBy: stl.uploadedBy, replacedAt: new Date(), replaceReason: reason || null },
  ];

  const piece = await PiecesModel.findById(wo.sourceID);
  if (piece) {
    const updates = { files: { ...(piece.files || {}), stl } };
    if (volumeCm3 != null) updates.printVolumeCm3 = volumeCm3;
    await PiecesModel.updateById(wo.sourceID, updates);
    if (piece.customOrderID && volumeCm3 != null) {
      const order = await CustomOrdersModel.findById(piece.customOrderID);
      if (order) {
        await CustomOrdersModel.updateById(piece.customOrderID, {
          designModel: { ...(order.designModel || {}), stlVolumeCm3: volumeCm3 },
        });
      }
    }
  }

  return WorkOrdersModel.updateByID(workOrderID, {
    files: { ...(wo.files || {}), stl, stlHistory },
  });
}

export async function uploadCadStl({ session, workOrderID, file }) {
  const wo = await assertCadStlAllowed({ session, workOrderID });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safe = (file.name || 'model.stl').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `production/pieces/${wo.sourceID}/stl/${Date.now()}-${safe}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET, Key: key, Body: buffer, ContentType: file.type || 'model/stl',
  }));
  // Compute the model volume so the quote's Mounting "Estimate from model" can price metal.
  // BEST-EFFORT, like the design tab's equivalent. This used to be unguarded, so a parser failure on
  // one file threw AFTER the STL had already landed in storage — a 500 that left the work order
  // stranded mid-upload with no way forward. The volume is a convenience for pricing; losing it must
  // not cost the upload. `printVolumeCm3` is only written when a real number comes back.
  let volumeCm3 = null;
  try {
    volumeCm3 = await stlVolumeCm3(arrayBuffer);
  } catch (e) {
    console.error(`[bench] STL volume parse failed for ${workOrderID}:`, e?.message || e);
  }
  if (!Number.isFinite(volumeCm3)) volumeCm3 = null;
  const stl = {
    url: storageUrl(key), key, originalName: file.name || null,
    volumeCm3,
    volumeSource: volumeCm3 != null ? 'server' : null,
    uploadedBy: session.user.name || session.user.email || session.user.userID, uploadedAt: new Date(),
  };
  return finalizeCadStl({ session, wo, workOrderID, stl });
}

/**
 * Everything that happens once an STL exists in storage: stamp it on the piece, surface the volume on
 * any linked custom order, move the work order to QC, and alert admins for peer review. Shared by the
 * direct-upload path (`attachCadStl`) and the legacy multipart path (`uploadCadStl`) so the two can
 * never drift — the QC transition in particular must happen identically either way.
 */
export async function finalizeCadStl({ session, wo, workOrderID, stl }) {
  const volumeCm3 = stl.volumeCm3;
  const piece = await PiecesModel.findById(wo.sourceID);
  if (piece) {
    const updates = { files: { ...(piece.files || {}), stl } };
    if (volumeCm3 != null) updates.printVolumeCm3 = volumeCm3;
    await PiecesModel.updateById(wo.sourceID, updates);
    // Surface the volume on the linked custom order so the Quote tab can read it.
    if (piece.customOrderID && volumeCm3 != null) {
      const order = await CustomOrdersModel.findById(piece.customOrderID);
      if (order) {
        await CustomOrdersModel.updateById(piece.customOrderID, {
          designModel: { ...(order.designModel || {}), stlVolumeCm3: volumeCm3 },
        });
      }
    }
  }

  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    files: { ...(wo.files || {}), stl },
    status: 'QC',
    completedBy: session.user.name,
    completedAt: new Date(),
  });

  // X8 — STL design submitted for QC peer review: alert admins.
  //
  // NOT AWAITED. The work is already done above: the STL is recorded and the work order is in QC. This
  // notification fans out an email PER ADMIN, and awaiting it made a slow mail server able to fail an
  // operation that had entirely succeeded — the route 504'd at Vercel's 15s limit while retrying sends,
  // and the bench saw "Could not attach the STL" for a 91 MB upload that had worked. The response must
  // not depend on anything that happens after the state change.
  void (async () => {
    try {
      const customID = piece?.customOrderID || (await customIDForWorkOrder(wo));
      await notifyAllAdmins({
        type: 'custom-design-submitted',
        title: 'Design submitted for QC review',
        message: `"${woLabel(wo)}"${customID ? ` (custom ${customID})` : ''} was submitted for CAD QC peer review.`,
        actionUrl: customID ? customLink(customID) : BENCH_ACTION_URL,
        priority: 'normal',
        relatedData: { customID: customID || null, workOrderID },
      });
    } catch (e) {
      console.error('⚠️ custom-design-submitted (STL) notify failed:', e?.message || e);
    }
  })();

  return updated;
}

/**
 * Upload the GLB for a CAD GLB-stage work order (C6d). GLB = the web-viewer model
 * (client review + efd-shop), made from the approved STL. Uploading completes the
 * GLB design step and moves the WO to QC. Sets files.glb on the WO + piece, and
 * propagates glbUrl onto the linked custom order's designModel (3D & Share / shop).
 * No hourly labor — the GLB fee is the CAD designer's flat fee (paid at QC, C6c).
 */
export async function uploadCadGlb({ session, workOrderID, file }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  if (wo.discipline !== DISCIPLINE.CAD) {
    const e = new Error('GLB upload is only for CAD work orders.'); e.code = 'BAD_REQUEST'; throw e;
  }
  if (!isAdminRole(session) && wo.assignedToUserID && wo.assignedToUserID !== session.user.userID) {
    const e = new Error('Only the assigned designer can upload the GLB.'); e.code = 'FORBIDDEN'; throw e;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safe = (file.name || 'model.glb').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `production/pieces/${wo.sourceID}/glb/${Date.now()}-${safe}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET, Key: key, Body: buffer, ContentType: file.type || 'model/gltf-binary',
  }));
  const glb = {
    url: storageUrl(key), key, originalName: file.name || null,
    uploadedBy: session.user.name || session.user.email || session.user.userID, uploadedAt: new Date(),
  };

  const piece = await PiecesModel.findById(wo.sourceID);
  if (piece) {
    await PiecesModel.updateById(wo.sourceID, { files: { ...(piece.files || {}), glb } });
    // Propagate the web model onto the custom order (3D & Share tab + efd-shop).
    if (piece.customOrderID) {
      const order = await CustomOrdersModel.findById(piece.customOrderID);
      if (order) {
        await CustomOrdersModel.updateById(piece.customOrderID, {
          designModel: { ...(order.designModel || {}), glbUrl: glb.url, meshMap: order.designModel?.meshMap || [] },
        });
      }
    }
  }

  // NOTE: uploading the GLB no longer auto-advances to QC. The GLB must have its
  // materials assigned first (meshMap → designModel via the Assign Materials studio
  // page), and submitCadGlbToQc() is what moves it to QC. Keep it IN PROGRESS here.
  return WorkOrdersModel.updateByID(workOrderID, {
    files: { ...(wo.files || {}), glb },
  });
}

/**
 * Submit a GLB-stage CAD work order to QC AFTER materials are assigned. The flow is
 * upload GLB → assign materials (meshMap saved to the order's designModel) → submit
 * to QC. Requires a GLB + a non-empty authored meshMap. No hourly labor (the CAD fee
 * is flat, paid at QC peer-review approval). Mirrors the old uploadCadGlb transition.
 */
export async function submitCadGlbToQc({ session, workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  if (wo.discipline !== DISCIPLINE.CAD) {
    const e = new Error('Submit-to-QC applies only to CAD work orders.'); e.code = 'BAD_REQUEST'; throw e;
  }
  if (!isAdminRole(session) && wo.assignedToUserID && wo.assignedToUserID !== session.user.userID) {
    const e = new Error('Only the assigned designer can submit this GLB to QC.'); e.code = 'FORBIDDEN'; throw e;
  }
  if (!wo.files?.glb?.url) {
    const e = new Error('Upload the GLB before submitting to QC.'); e.code = 'BAD_REQUEST'; throw e;
  }
  const piece = await PiecesModel.findById(wo.sourceID);
  const order = piece?.customOrderID ? await CustomOrdersModel.findById(piece.customOrderID) : null;
  if (!order?.designModel?.meshMap?.length) {
    const e = new Error('Assign materials to the model before submitting to QC.'); e.code = 'BAD_REQUEST'; throw e;
  }

  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'QC',
    completedBy: session.user.name,
    completedAt: new Date(),
  });

  // X8 — GLB design submitted for QC peer review: alert admins that a CAD/GLB WO needs review.
  // Best-effort; never block the submit.
  try {
    await notifyAllAdmins({
      type: 'custom-design-submitted',
      title: 'Design submitted for QC review',
      message: `"${woLabel(wo)}"${order?.customID ? ` (custom ${order.customID})` : ''} was submitted for CAD QC peer review.`,
      actionUrl: order?.customID ? customLink(order.customID) : BENCH_ACTION_URL,
      priority: 'normal',
      relatedData: { customID: order?.customID || null, workOrderID },
    });
  } catch (e) {
    console.error('⚠️ custom-design-submitted (GLB) notify failed:', e?.message || e);
  }

  return updated;
}

