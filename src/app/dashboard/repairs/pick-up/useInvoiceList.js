import { useCallback, useMemo } from "react";
import { INVOICES_PER_PAGE, summarizeInvoices } from './pickupHelpers';

/**
 * The Payment & Pickup invoice lists: draft / open / paid / editable, filtered by the search box, and the active
 * tab's page of them (12 a page) with its summary and range. Moved verbatim out of page.js (max-lines burn-down).
 */
export function useInvoiceList({ invoices, invoiceSearch, tab, invoicePage }) {
  const draftInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === "draft"),
    [invoices]
  );
  const openInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === "open"),
    [invoices]
  );
  const paidInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === "paid"),
    [invoices]
  );
  const editableInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.paymentStatus !== "paid" && ["draft", "open"].includes(invoice.status)),
    [invoices]
  );

  const filterInvoices = useCallback((invoiceList) => {
    const search = invoiceSearch.trim().toLowerCase();
    if (!search) return invoiceList;

    return invoiceList.filter((invoice) => [
      invoice.invoiceID,
      invoice.customerName,
      invoice.accountID,
      invoice.accountType,
      invoice.paymentStatus,
      ...(invoice.repairIDs || []),
      ...(invoice.repairSnapshots || []).flatMap((repair) => [
        repair.repairID,
        repair.customerName,
      ]),
    ].some((value) => String(value || "").toLowerCase().includes(search)));
  }, [invoiceSearch]);

  const visibleDraftInvoices = useMemo(() => filterInvoices(draftInvoices), [draftInvoices, filterInvoices]);
  const visibleOpenInvoices = useMemo(() => filterInvoices(openInvoices), [openInvoices, filterInvoices]);
  const visiblePaidInvoices = useMemo(() => filterInvoices(paidInvoices), [paidInvoices, filterInvoices]);
  const activeInvoiceList = tab === 1 ? visibleDraftInvoices : tab === 2 ? visibleOpenInvoices : visiblePaidInvoices;
  const activeInvoiceSummary = useMemo(() => summarizeInvoices(activeInvoiceList), [activeInvoiceList]);
  const activeInvoiceTotalPages = Math.max(1, Math.ceil(activeInvoiceList.length / INVOICES_PER_PAGE));
  const activeInvoicePage = Math.min(invoicePage, activeInvoiceTotalPages);
  const paginatedInvoiceList = useMemo(() => {
    const start = (activeInvoicePage - 1) * INVOICES_PER_PAGE;
    return activeInvoiceList.slice(start, start + INVOICES_PER_PAGE);
  }, [activeInvoiceList, activeInvoicePage]);
  const invoicePageStart = activeInvoiceList.length === 0
    ? 0
    : ((activeInvoicePage - 1) * INVOICES_PER_PAGE) + 1;
  const invoicePageEnd = Math.min(activeInvoicePage * INVOICES_PER_PAGE, activeInvoiceList.length);

  return {
    draftInvoices, openInvoices, paidInvoices,
    editableInvoices, visibleDraftInvoices, visibleOpenInvoices, visiblePaidInvoices,
    activeInvoiceList, activeInvoiceSummary, activeInvoiceTotalPages, activeInvoicePage,
    paginatedInvoiceList, invoicePageStart, invoicePageEnd,
  };
}
