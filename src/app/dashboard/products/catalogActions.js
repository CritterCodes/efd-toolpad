import { editorFormToPayload, productToEditorForm } from '@/services/products/productEditorPayload';

/**
 * The Catalog's write actions (page.js): duplicate a product and the bulk publish / archive / remove / reassign. Moved verbatim; state arrives as deps.
 */
export function catalogActions({ clearSelection, load, reassignTo, selected, setBulkBusy, setReassignOpen, setReassignTo, showSnack }) {
  const responseError = async (response, fallback) => {
    const body = await response.json().catch(() => ({}));
    const detail = Array.isArray(body.details) ? `: ${body.details.join(', ')}` : '';
    return `${body.error || fallback}${detail}`;
  };

  const handleDuplicate = async (product) => {
    try {
      const detailResponse = await fetch(`/api/products/${product._id}`);
      if (!detailResponse.ok) throw new Error(await responseError(detailResponse, 'Failed to load product'));
      const source = await detailResponse.json();
      const payload = editorFormToPayload({
        ...productToEditorForm(source.product || source),
        title: `${product.title || 'Untitled product'} (copy)`,
        status: 'draft',
      });
      const createResponse = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!createResponse.ok) throw new Error(await responseError(createResponse, 'Duplicate failed'));
      showSnack('Product duplicated.');
      await load();
    } catch (error) {
      showSnack(error.message, 'error');
    }
  };

  const runBulk = async (label, operation, confirmation) => {
    const ids = [...selected];
    if (ids.length === 0 || (confirmation && !window.confirm(confirmation))) return;
    setBulkBusy(true);
    const failures = [];
    for (const id of ids) {
      try {
        await operation(id);
      } catch (error) {
        failures.push(error.message);
      }
    }
    await load();
    setBulkBusy(false);
    if (failures.length > 0) {
      showSnack(`${label}: ${ids.length - failures.length} succeeded, ${failures.length} failed. ${failures[0]}`, 'error');
      return;
    }
    clearSelection();
    showSnack(`${label}: ${ids.length} product${ids.length === 1 ? '' : 's'} updated.`);
  };

  const handleBulkPublish = () => runBulk('Publish', async (id) => {
    const response = await fetch(`/api/products/${id}/publish`, { method: 'POST', body: '{}' });
    if (!response.ok) throw new Error(await responseError(response, 'Publish failed'));
  }, `Publish ${selected.size} selected product(s)?`);

  const handleBulkArchive = () => runBulk('Archive', async (id) => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'archived' }),
    });
    if (!response.ok) throw new Error(await responseError(response, 'Archive failed'));
  }, `Archive ${selected.size} selected product(s)?`);

  const handleBulkRemove = () => runBulk('Remove', async (id) => {
    const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(await responseError(response, 'Remove failed'));
  }, `Remove ${selected.size} selected product(s) from the active catalog? They will be archived.`);

  const handleBulkReassign = () => {
    setReassignTo('');
    setReassignOpen(true);
  };

  const confirmBulkReassign = async () => {
    if (!reassignTo) return;
    setReassignOpen(false);
    await runBulk('Reassign', async (id) => {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artisanId: reassignTo }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Reassign failed'));
    });
  };


  return {
    responseError,
    handleDuplicate,
    runBulk,
    handleBulkPublish,
    handleBulkArchive,
    handleBulkRemove,
    handleBulkReassign,
    confirmBulkReassign,
  };
}
