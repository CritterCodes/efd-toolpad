/**
 * The payroll page's actions: open a candidate / batch / owner draw, close the dialog, create and update a batch, save and void an owner draw, toggle owner-operator. Moved verbatim out of page.js (max-lines burn-down); a plain factory the page calls each render.
 */
export function payrollActions({ fetchData, notes, ownerDrawAmount, ownerDrawDate, ownerDrawUserID, ownerOperators, paidAt, paymentMethod, paymentReference, selectedDetail, setActionLoading, setDialogLoading, setError, setNotes, setOwnerDrawAmount, setOwnerDrawDate, setOwnerDrawUserID, setPaidAt, setPaymentMethod, setPaymentReference, setSelectedDetail, setSelectedMode }) {
  const openCandidate = async (candidate) => {
    setSelectedMode('candidate');
    setSelectedDetail(null);
    setDialogLoading(true);
    setNotes('');
    try {
      const params = new URLSearchParams({
        detail: 'true',
        weekStart: new Date(candidate.weekStart).toISOString(),
        userID: candidate.userID,
      });
      const res = await fetch(`/api/repairs/payroll?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payroll candidate detail.');
      setSelectedDetail(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setDialogLoading(false);
    }
  };

  const openBatch = async (batch) => {
    setSelectedMode('batch');
    setSelectedDetail(null);
    setDialogLoading(true);
    try {
      const res = await fetch(`/api/repairs/payroll/${batch.batchID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payroll batch.');
      setSelectedDetail(data);
      setNotes(data.notes || '');
      setPaymentMethod(data.paymentMethod || '');
      setPaymentReference(data.paymentReference || '');
      setPaidAt(data.paidAt ? new Date(data.paidAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    } catch (e) {
      setError(e.message);
    } finally {
      setDialogLoading(false);
    }
  };

  const openOwnerDraw = (draw = null) => {
    setSelectedMode('owner_draw');
    setSelectedDetail(draw);
    setDialogLoading(false);
    setNotes(draw?.notes || '');
    setPaymentMethod(draw?.paymentMethod || '');
    setPaymentReference(draw?.paymentReference || '');
    setOwnerDrawAmount(draw?.amount != null ? String(draw.amount) : '');
    setOwnerDrawDate(
      draw?.drawDate
        ? new Date(draw.drawDate).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16)
    );
    setOwnerDrawUserID(draw?.userID || ownerOperators[0]?.userID || '');
  };

  const closeDialog = () => {
    setSelectedMode('');
    setSelectedDetail(null);
    setNotes('');
    setPaymentMethod('');
    setPaymentReference('');
    setOwnerDrawAmount('');
    setOwnerDrawDate(new Date().toISOString().slice(0, 16));
    setOwnerDrawUserID(ownerOperators[0]?.userID || '');
  };

  const performAction = async (fn) => {
    setActionLoading(true);
    setError('');
    try {
      await fn();
      await fetchData();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const createBatch = async () => performAction(async () => {
    const res = await fetch('/api/repairs/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: selectedDetail.weekStart,
        userID: selectedDetail.userID,
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create payroll batch.');
    closeDialog();
  });

  const updateBatch = async (action) => performAction(async () => {
    const res = await fetch(`/api/repairs/payroll/${selectedDetail.batchID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        notes,
        paidAt,
        paymentMethod,
        paymentReference,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed to ${action} payroll batch.`);
    if (action === 'finalize' || action === 'mark_paid' || action === 'void' || action === 'pay_stripe') {
      closeDialog();
    }
  });

  const saveOwnerDraw = async () => performAction(async () => {
    const isEditing = Boolean(selectedDetail?.drawID);
    const endpoint = isEditing
      ? `/api/repairs/payroll/owner-draws/${selectedDetail.drawID}`
      : '/api/repairs/payroll/owner-draws';
    const method = isEditing ? 'PATCH' : 'POST';
    const payload = {
      userID: ownerDrawUserID,
      amount: Number(ownerDrawAmount || 0),
      drawDate: ownerDrawDate,
      paymentMethod,
      paymentReference,
      notes,
    };

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save owner draw.');
    closeDialog();
  });

  const voidOwnerDraw = async () => performAction(async () => {
    const res = await fetch(`/api/repairs/payroll/owner-draws/${selectedDetail.drawID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'void',
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to void owner draw.');
    closeDialog();
  });

  const toggleOwnerOperator = async () => performAction(async () => {
    const res = await fetch('/api/repairs/payroll/owner-operators', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userID: selectedDetail.userID,
        isOwnerOperator: !selectedDetail.isOwnerOperator,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update owner/operator flag.');
    setSelectedDetail((prev) => prev ? { ...prev, isOwnerOperator: data.isOwnerOperator } : prev);
    await fetchData();
  });

  return {
    openCandidate,
    openBatch,
    openOwnerDraw,
    closeDialog,
    performAction,
    createBatch,
    updateBatch,
    saveOwnerDraw,
    voidOwnerDraw,
    toggleOwnerOperator,
  };
}
