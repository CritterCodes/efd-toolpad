import { stripComputedPrices } from '@/services/pricing/computedFields';
import { sizingStockCheck, ticketChecks } from './newRepairFormHelpers';

/**
 * The ticket checks and what their buttons do, for whichever intake form is on screen (the stepped flow and the
 * classic form both call this — the classic form used to show none of it).
 *
 * Nothing here changes the ticket on its own: `applyCheck` runs only when the jeweler taps a check's button.
 */
export function ticketCheckActions({ availableTasks = [], formData = {}, removeItem, setFormData }) {
  // Sizing stock that no longer matches the sizes (a size edited after the read, a size-up added by hand).
  const stockCheck = sizingStockCheck(formData);
  // The owner's rulings against the ticket as it stands now.
  const checks = ticketChecks(formData, availableTasks);
  const applyCheck = (check) => {
    if (check.add) {
      setFormData((prev) => ({ ...prev, tasks: [...prev.tasks, { ...stripComputedPrices(check.add), id: Date.now(), quantity: check.quantity || 1, _smartIntakeRuled: check.why || 'added from a check' }] }));
    } else if (check.remove != null) {
      removeItem('tasks', check.remove);
    } else if (check.swap) {
      setFormData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === check.swap.id ? { ...stripComputedPrices(check.swap.task), id: t.id, quantity: t.quantity } : t)),
      }));
    }
  };
  return { applyCheck, checks, stockCheck };
}
