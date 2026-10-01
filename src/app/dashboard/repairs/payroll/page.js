"use client";

import { payrollTotal } from '@/services/payrollUtils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { REPAIRS_UI } from '../components/repairsUi';
import { canAccessPayroll } from '@/lib/repairAccess';
import ConnectPayoutCard from '@/components/payroll/ConnectPayoutCard';
import PayrollHealthCard from '@/components/payroll/PayrollHealthCard';
import AddHoursCard from '@/components/payroll/AddHoursCard';
import { getMondayOfWeek } from './payrollParts';
import { PayrollDialog } from './PayrollDialog';
import { PayrollLists } from './PayrollLists';
import { PayrollStats } from './PayrollStats';
import { PayrollDiagnostics } from './PayrollDiagnostics';
import { payrollActions } from './payrollActions';
import {
  ANALYTICS_BASELINE_NOTE,
  DEFAULT_LABOR_ANALYTICS_START_DATE,
} from '@/services/analyticsBaseline';

export default function RepairPayrollPage({ initialTab = 'queue' }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab');
  const [tab, setTab] = useState(
    requestedTab === 'owner_draws' || requestedTab === 'history' || requestedTab === 'queue'
      ? requestedTab
      : initialTab
  );
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [ownerDraws, setOwnerDraws] = useState([]);
  const [ownerOperators, setOwnerOperators] = useState([]);
  const [ownerDrawSummary, setOwnerDrawSummary] = useState({ amount: 0, count: 0 });
  const [diagnostics, setDiagnostics] = useState(null);
  const [error, setError] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [ownerDrawUserID, setOwnerDrawUserID] = useState('');
  const [ownerDrawAmount, setOwnerDrawAmount] = useState('');
  const [ownerDrawDate, setOwnerDrawDate] = useState(() => new Date().toISOString().slice(0, 16));

  const currentWeekStart = useMemo(() => getMondayOfWeek(new Date()).toISOString(), []);

  useEffect(() => {
    if (requestedTab === 'owner_draws' || requestedTab === 'history' || requestedTab === 'queue') {
      setTab(requestedTab);
      return;
    }
    setTab(initialTab);
  }, [initialTab, requestedTab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [queueRes, historyRes, diagnosticsRes, ownerDrawsRes] = await Promise.all([
        fetch('/api/repairs/payroll'),
        fetch('/api/repairs/payroll?history=true'),
        fetch(`/api/repairs/payroll/diagnostics?weekStart=${encodeURIComponent(currentWeekStart)}`),
        fetch('/api/repairs/payroll/owner-draws'),
      ]);

      const [queueData, historyData, diagnosticsData, ownerDrawsData] = await Promise.all([
        queueRes.json(),
        historyRes.json(),
        diagnosticsRes.json(),
        ownerDrawsRes.json(),
      ]);

      if (!queueRes.ok) throw new Error(queueData.error || 'Failed to load payroll queue.');
      if (!historyRes.ok) throw new Error(historyData.error || 'Failed to load payroll history.');
      if (!diagnosticsRes.ok) throw new Error(diagnosticsData.error || 'Failed to load payroll diagnostics.');
      if (!ownerDrawsRes.ok) throw new Error(ownerDrawsData.error || 'Failed to load owner draws.');

      setQueue(Array.isArray(queueData) ? queueData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setDiagnostics(diagnosticsData || null);
      setOwnerDraws(Array.isArray(ownerDrawsData?.draws) ? ownerDrawsData.draws : []);
      setOwnerOperators(Array.isArray(ownerDrawsData?.ownerOperators) ? ownerDrawsData.ownerOperators : []);
      setOwnerDrawSummary(ownerDrawsData?.summary || { amount: 0, count: 0 });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    if (status === 'authenticated' && !canAccessPayroll(session)) {
      router.push('/dashboard');
      return;
    }
    if (status === 'authenticated' && canAccessPayroll(session)) {
      fetchData();
    }
  }, [fetchData, router, session, status]);

  useEffect(() => {
    if (!ownerDrawUserID && ownerOperators.length > 0) {
      setOwnerDrawUserID(ownerOperators[0].userID);
    }
  }, [ownerDrawUserID, ownerOperators]);

  const {
    openCandidate, openBatch, openOwnerDraw, closeDialog, createBatch, updateBatch, saveOwnerDraw,
    voidOwnerDraw, toggleOwnerOperator,
  } = payrollActions({
    fetchData, notes, ownerDrawAmount, ownerDrawDate, ownerDrawUserID, ownerOperators, paidAt, paymentMethod,
    paymentReference, selectedDetail, setActionLoading, setDialogLoading, setError, setNotes,
    setOwnerDrawAmount, setOwnerDrawDate, setOwnerDrawUserID, setPaidAt, setPaymentMethod, setPaymentReference,
    setSelectedDetail, setSelectedMode,
  });

  if (status === 'loading' || (status === 'authenticated' && !canAccessPayroll(session))) {
    return null;
  }

  const currentWeekLogCount = diagnostics
    ? (diagnostics.countsByWeek || []).find((entry) => (
        new Date(entry.weekStart).toISOString() === new Date(currentWeekStart).toISOString()
      ))?.count || 0
    : 0;
  const hasNoLogs = diagnostics && currentWeekLogCount === 0;
  const ownerLaborPaid = history
    .filter((batch) => batch.isOwnerOperator && batch.status === 'paid')
    .reduce((sum, batch) => sum + payrollTotal(batch), 0);
  const ownerLaborUnpaid = history
    .filter((batch) => batch.isOwnerOperator && batch.status !== 'paid' && batch.status !== 'void')
    .reduce((sum, batch) => sum + payrollTotal(batch), 0);

  // Everything the page's sections read, passed whole to each (each takes only the names it uses).
  const payroll = {
    actionLoading, closeDialog, createBatch, diagnostics, dialogLoading, loading, notes, openBatch,
    openCandidate, openOwnerDraw, ownerDrawAmount, ownerDrawDate, ownerDrawSummary, ownerDrawUserID,
    ownerDraws, ownerLaborPaid, ownerLaborUnpaid, ownerOperators, paidAt, paymentMethod, paymentReference,
    queue, router, saveOwnerDraw, selectedDetail, selectedMode, setNotes, setOwnerDrawAmount, setOwnerDrawDate,
    setOwnerDrawUserID, setPaidAt, setPaymentMethod, setPaymentReference, tab, toggleOwnerOperator,
    updateBatch, voidOwnerDraw,
  };

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PaymentIcon sx={{ color: REPAIRS_UI.accent, fontSize: 28 }} />
          <Box>
            <Typography component="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>
              Payroll
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Freeze weekly jeweler payouts from approved labor logs and mark them paid.
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>
        {ANALYTICS_BASELINE_NOTE} Labor analytics start on {new Date(DEFAULT_LABOR_ANALYTICS_START_DATE).toLocaleDateString()}.
      </Alert>
      {hasNoLogs && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No repair labor logs exist for the current week in the live ledger. Payroll can be correct and still empty until send-to-QC is generating labor logs in production.
        </Alert>
      )}

      <PayrollDiagnostics {...payroll} />

      <PayrollStats {...payroll} />

      {/* The admin is a payee too (owner-operator): connect YOUR Stripe account here. Stripe Connect is
          the only way anyone — you included — is paid. */}
      <Box sx={{ mb: 3 }}>
        {/* Running payroll by hand creates and pays batches, so the lists below are stale the moment
            it finishes — reload them with it. */}
        <PayrollHealthCard onRan={fetchData} />
        {/* Hourly work entered by hand becomes a labor log, so it shows up in the candidates below. */}
        <AddHoursCard sx={{ mb: 3 }} onAdded={fetchData} />
        <Typography variant="overline" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>Your payouts</Typography>
        <ConnectPayoutCard sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}` }} />
      </Box>

      <Box sx={{ borderBottom: `1px solid ${REPAIRS_UI.border}`, mb: 2 }}>
        <Tabs value={tab} onChange={(_e, next) => setTab(next)} textColor="inherit" indicatorColor="secondary">
          <Tab value="queue" label="Payroll Queue" />
          <Tab value="history" label="Payroll History" />
          <Tab value="owner_draws" label="Owner Draws" />
        </Tabs>
      </Box>

      <PayrollLists {...payroll} />

      <PayrollDialog {...payroll} />
    </Box>
  );
}
