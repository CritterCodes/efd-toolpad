/**
 * Bench actions for piece work orders — production AND custom pieces (U1 QC
 * unification). Mirrors the repair bench flow so EVERY source moves through the
 * same gate: claim → in progress → move to QC → approve from QC.
 *
 *   - claim            → lane-enforced (D9), status IN PROGRESS.
 *   - move to QC        → logs labor (pays the artisan + flags review like the
 *                         repair move-to-QC), status QC. Labor is logged HERE,
 *                         not at completion, exactly like repairs.
 *   - complete from QC  → status COMPLETED + re-roll the piece COGS (which picks
 *                         up the labor logged at the QC step). No second log.
 *
 * Labor logs go into the unified `laborLogs` collection keyed by workOrderID so
 * payroll picks them up exactly like repair labor.
 */
export { claimPieceWorkOrder, movePieceToQc } from './pieceActions/pieceBench';
export { attachCadStl, replaceCadStl, uploadCadStl, uploadCadGlb, submitCadGlbToQc } from './pieceActions/cadFiles';
export { splitPieceTask, approveCadQc, rejectCadQc } from './pieceActions/cadReview';
export { completePieceWorkOrderFromQc } from './pieceActions/completion';
export { DISCIPLINE } from '@/services/workOrders/disciplines';
