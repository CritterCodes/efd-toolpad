/**
 * The Stuller settings page's actions: save settings, test the connection, update prices, sync orders and invoices, create an expense from an invoice, open an invoice. Moved verbatim out of page.js (max-lines burn-down); a plain factory the page calls each render.
 */
export function stullerActions({ clearMessages, invoiceNumberInput, invoicePoInput, loadInvoices, loadOrders, loadStullerMaterials, loadStullerSettings, orderSyncInput, setCreatingExpenseId, setError, setLoadingInvoiceDetail, setSelectedInvoice, setSuccess, setSyncingInvoices, setSyncingOrders, setTesting, setUpdating, settings }) {
  const saveStullerSettings = async () => {
    try {
      setUpdating(true);
      clearMessages();

      const response = await fetch('/api/admin/settings/stuller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      await loadStullerSettings();
      setSuccess('Stuller settings saved successfully.');
    } catch (saveError) {
      console.error('Error saving Stuller settings:', saveError);
      setError(saveError.message);
    } finally {
      setUpdating(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      clearMessages();

      const testData = {
        username: settings.username,
        password: settings.password === '********' ? '' : settings.password,
        apiUrl: settings.apiUrl,
      };

      const response = await fetch('/api/admin/settings/stuller', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Stuller connection test failed');
      }

      setSuccess(result.message || 'Stuller API connection successful.');
    } catch (testError) {
      console.error('Error testing Stuller connection:', testError);
      setError(testError.message);
    } finally {
      setTesting(false);
    }
  };

  const updatePrices = async (force = false) => {
    try {
      setUpdating(true);
      clearMessages();

      const response = await fetch('/api/stuller/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update prices');
      }

      await loadStullerMaterials();
      setSuccess(result.message || 'Stuller prices updated.');
    } catch (priceError) {
      console.error('Error updating Stuller prices:', priceError);
      setError(priceError.message);
    } finally {
      setUpdating(false);
    }
  };

  const syncOrders = async () => {
    try {
      setSyncingOrders(true);
      clearMessages();

      const response = await fetch('/api/stuller/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseOrderNumbers: orderSyncInput }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync Stuller orders');
      }

      await loadOrders();
      setSuccess(`Synced ${result.syncedCount || 0} Stuller order${result.syncedCount === 1 ? '' : 's'}.`);
    } catch (syncError) {
      console.error('Error syncing Stuller orders:', syncError);
      setError(syncError.message);
    } finally {
      setSyncingOrders(false);
    }
  };

  const syncInvoices = async ({ recentDays = null, syncAll = false } = {}) => {
    try {
      setSyncingInvoices(true);
      clearMessages();

      const hasManualIdentifiers = Boolean(invoicePoInput.trim() || invoiceNumberInput.trim());
      const response = await fetch('/api/stuller/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderNumbers: invoicePoInput,
          invoiceNumbers: invoiceNumberInput,
          recentDays: hasManualIdentifiers ? null : recentDays,
          syncAll: hasManualIdentifiers ? false : syncAll,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync Stuller invoices');
      }

      await loadInvoices();
      let message = `Synced ${result.syncedCount || 0} Stuller invoice${result.syncedCount === 1 ? '' : 's'}.`;
      if (!hasManualIdentifiers && result.sourceMode === 'recent' && result.recentDays) {
        message = `Synced ${result.syncedCount || 0} Stuller invoice${result.syncedCount === 1 ? '' : 's'} from the last ${result.recentDays} days.`;
      } else if (!hasManualIdentifiers && result.sourceMode === 'all') {
        message = `Synced ${result.syncedCount || 0} Stuller invoice${result.syncedCount === 1 ? '' : 's'} from the full account history currently returned by Stuller.`;
      }
      setSuccess(message);
    } catch (syncError) {
      console.error('Error syncing Stuller invoices:', syncError);
      setError(syncError.message);
    } finally {
      setSyncingInvoices(false);
    }
  };

  const createExpenseFromInvoice = async (invoiceId) => {
    try {
      setCreatingExpenseId(invoiceId);
      clearMessages();

      const response = await fetch(`/api/stuller/invoices/${invoiceId}/create-expense`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create Stuller expense');
      }

      setSuccess(`Created scheduled expense for Stuller invoice ${result.invoice?.invoiceNumber || invoiceId}.`);
    } catch (createError) {
      console.error('Error creating Stuller expense:', createError);
      setError(createError.message);
    } finally {
      setCreatingExpenseId('');
    }
  };

  const openInvoiceDetails = async (invoiceId) => {
    try {
      setLoadingInvoiceDetail(true);
      clearMessages();

      const response = await fetch(`/api/stuller/invoices/${invoiceId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load Stuller invoice details');
      }

      setSelectedInvoice(result.invoice || null);
    } catch (detailError) {
      console.error('Error loading Stuller invoice detail:', detailError);
      setError(detailError.message);
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };

  return {
    saveStullerSettings,
    testConnection,
    updatePrices,
    syncOrders,
    syncInvoices,
    createExpenseFromInvoice,
    openInvoiceDetails,
  };
}
