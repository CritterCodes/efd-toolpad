"use client";
import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { useParams } from 'next/navigation';
import { metalDisplay, karatLabel, customOrderLabel } from '@/constants/customRequest.constants';

const SLIP_W = '3.6in';
const SLIP_H = '5.5in';
const QR = 64;
const qrSrc = (id) => `https://api.qrserver.com/v1/create-qr-code/?size=${QR}x${QR}&margin=1&data=${encodeURIComponent(id || '')}`;
const LANE = { bench_jewelry: 'Bench', cad: 'CAD', engraving: 'Engraving', gem_cutting: 'Gem Cutting' };

/**
 * Bench "ready for work" ticket for a custom piece — printed when the cast/mounting
 * is received, so the physical piece can be binned with its work list. Mirrors the
 * repair ticket's print-isolation pattern (single 3.6×5.5in slip, auto window.print).
 */
export default function CustomBenchTicketPrint() {
  const { customID } = useParams();
  const [order, setOrder] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [oRes, wRes] = await Promise.all([
          fetch(`/api/custom-orders/${customID}`),
          fetch(`/api/custom-orders/${customID}/work-orders`),
        ]);
        const oData = oRes.ok ? await oRes.json() : null;
        const wData = wRes.ok ? await wRes.json() : [];
        if (cancelled) return;
        setOrder(oData?.order || null);
        setWorkOrders(Array.isArray(wData) ? wData : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customID]);

  // Auto-print once the ticket has rendered.
  useEffect(() => {
    if (!loading && order) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [loading, order]);

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (!order) return <Box sx={{ p: 4 }}><Typography color="error">Custom order not found.</Typography></Box>;

  const metal = [metalDisplay(order.metalType, order.goldColor), order.karat ? karatLabel(order.karat) : ''].filter(Boolean).join(' · ');
  const gems = (order.gemstones || []).join(', ');
  const request = [order.description, order.specialRequests].filter((t) => t && t.trim()).join(' — ');
  // Bench-relevant work (exclude completed/cancelled + CAD design which happens pre-cast).
  const tasks = (workOrders || []).filter((w) => !['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(String(w.status || '').toUpperCase()));

  return (
    <Box className="print-root">
      <style jsx global>{`
        @media print {
          @page { size: ${SLIP_W} ${SLIP_H}; margin: 0; }
          html, body { width: ${SLIP_W} !important; height: ${SLIP_H} !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #111 !important; overflow: hidden !important; }
          nav, header, aside, .MuiDrawer-root, .MuiAppBar-root, .MuiBreadcrumbs-root, .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          .print-slip, .print-slip * { visibility: visible !important; }
          .print-slip { position: fixed !important; top: 0 !important; left: 0 !important; width: ${SLIP_W} !important; height: ${SLIP_H} !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <Box className="no-print" sx={{ p: 2, textAlign: 'center' }}>
        <Button variant="contained" onClick={() => window.print()} sx={{ mr: 1 }}>Print</Button>
        <Button variant="outlined" onClick={() => window.close()}>Close</Button>
      </Box>

      <Box
        className="print-slip"
        sx={{ width: SLIP_W, height: SLIP_H, m: '0 auto', p: '0.2in', boxSizing: 'border-box', color: '#111', bgcolor: '#fff', fontFamily: 'Arial, sans-serif', border: '1px solid #ccc' }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111', pb: '4px' }}>
          <Box>
            <div style={{ fontSize: 9, letterSpacing: 1, fontWeight: 700 }}>ENGEL FINE DESIGN</div>
            <div style={{ fontSize: 11, fontWeight: 800 }}>CUSTOM · READY FOR WORK</div>
          </Box>
          <img src={qrSrc(order.customID)} alt={order.customID} width={QR} height={QR} style={{ flexShrink: 0 }} />
        </Box>

        <div style={{ fontFamily: 'monospace', fontSize: 10, marginTop: 4 }}>{order.customID}</div>
        <div style={{ fontSize: 14, fontWeight: 800, margin: '2px 0 4px' }}>{customOrderLabel(order)}</div>

        <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
          <tbody>
            <Row k="Customer" v={order.customerName || '—'} />
            <Row k="Metal" v={metal || '—'} />
            {order.size && <Row k="Size" v={order.size} />}
            {gems && <Row k="Gemstones" v={gems} />}
          </tbody>
        </table>

        <div style={{ fontSize: 9, fontWeight: 700, marginTop: 6, borderBottom: '1px solid #999' }}>WORK TO DO</div>
        {tasks.length === 0 ? (
          <div style={{ fontSize: 10, color: '#666' }}>No open work orders.</div>
        ) : (
          <ul style={{ margin: '2px 0', paddingLeft: 16, fontSize: 10 }}>
            {tasks.map((w) => (
              <li key={w.workOrderID}>
                <strong>{LANE[w.discipline] || w.discipline}:</strong> {w.title || w.discipline}
              </li>
            ))}
          </ul>
        )}

        {request && (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, marginTop: 6, borderBottom: '1px solid #999' }}>NOTES</div>
            <div style={{ fontSize: 9, whiteSpace: 'pre-wrap', maxHeight: '1in', overflow: 'hidden' }}>{request}</div>
          </>
        )}

        <div style={{ position: 'absolute', bottom: '0.15in', fontSize: 8, color: '#666' }}>
          Printed {new Date().toLocaleString('en-US')}
        </div>
      </Box>
    </Box>
  );
}

function Row({ k, v }) {
  return (
    <tr>
      <td style={{ fontWeight: 700, padding: '1px 6px 1px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{k}</td>
      <td style={{ padding: '1px 0' }}>{v}</td>
    </tr>
  );
}
