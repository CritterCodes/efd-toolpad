"use client";
import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, Button, CircularProgress } from '@mui/material';
import { useParams } from 'next/navigation';
import { metalDisplay, karatLabel, customOrderLabel } from '@/constants/customRequest.constants';

// Mirrors RepairTicketComponent's look so custom bench tickets fit the same bin/scan
// workflow. Scoped to the BENCH work (physical: cleanup/setting/polish) — CAD + GLB
// are remote/no-physical, so they're excluded.
const PAPER = '#ffffff';
const INK = '#111111';
const MUTED = '#4b5563';
const BORDER = '#000000';
const ACCENT = '#d32f2f';
const SLIP_W = '3.6in';
const SLIP_H = '5.5in';
const QR = 64;
const qrSrc = (id) => `https://api.qrserver.com/v1/create-qr-code/?size=${QR}x${QR}&margin=1&data=${encodeURIComponent(id || '')}`;
const LANE = { bench_jewelry: 'Bench', engraving: 'Engraving', gem_cutting: 'Gem Cutting' };
const PHYSICAL = ['bench_jewelry', 'engraving', 'gem_cutting']; // exclude cad (remote)

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

  useEffect(() => {
    if (!loading && order) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [loading, order]);

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (!order) return <Box sx={{ p: 4 }}><Typography color="error">Custom order not found.</Typography></Box>;

  const metal = [metalDisplay(order.metalType, order.goldColor), order.karat ? karatLabel(order.karat) : ''].filter(Boolean).join(' ');
  const desc = [order.description, order.specialRequests].filter((t) => t && t.trim()).join(' — ');
  const image = (order.images || []).find((i) => i.url)?.url || null;
  // Bench work only (physical lanes, not yet finished) — CAD/GLB excluded.
  const benchItems = (workOrders || []).filter(
    (w) => PHYSICAL.includes(w.discipline) && !['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(String(w.status || '').toUpperCase()),
  );

  return (
    <Box className="print-root">
      <style jsx global>{`
        @media print {
          @page { size: ${SLIP_W} ${SLIP_H}; margin: 0; }
          html, body { width: ${SLIP_W} !important; height: ${SLIP_H} !important; margin: 0 !important; padding: 0 !important; background: #fff !important; overflow: hidden !important; }
          nav, header, aside, .MuiDrawer-root, .MuiAppBar-root, .MuiBreadcrumbs-root, .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          .print-slip, .print-slip * { visibility: visible !important; }
          .print-slip { position: fixed !important; top: 0 !important; left: 0 !important; }
        }
      `}</style>

      <Box className="no-print" sx={{ p: 2, textAlign: 'center' }}>
        <Button variant="contained" onClick={() => window.print()} sx={{ mr: 1 }}>Print</Button>
        <Button variant="outlined" onClick={() => window.close()}>Close</Button>
      </Box>

      <Box className="print-slip" sx={{ width: SLIP_W, height: SLIP_H, maxWidth: SLIP_W, maxHeight: SLIP_H, p: '4px', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box', backgroundColor: PAPER, color: INK, m: '0 auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '3px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logos/[efd]LogoBlack.png" alt="Logo" style={{ width: '34px', height: '17px', marginRight: '4px' }} />
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: ACCENT }}>BENCH TICKET</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.44rem', fontWeight: 'bold', textAlign: 'right', color: INK }}>Engel Fine Design · Custom</Typography>
        </Box>

        {/* Info row */}
        <Box sx={{ display: 'flex', mb: '1px' }}>
          {image && (
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <img src={image} alt="Piece" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: '3px' }} />
            </Box>
          )}
          <Box sx={{ flex: 2, pl: image ? '4px' : 0 }}>
            <Typography sx={{ fontSize: '0.52rem', fontWeight: 'bold', mb: '1px', color: INK }}>{order.customerName || customOrderLabel(order)}</Typography>
            <Typography sx={{ fontSize: '0.43rem', mb: '1px', color: INK }}>{customOrderLabel(order)}</Typography>
            <Typography sx={{ fontSize: '0.43rem', mb: '1px', color: INK }}>
              Recv: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'} | Due: {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : (order.timeline || 'N/A')}
            </Typography>
            <Typography sx={{ fontSize: '0.43rem', mb: '1px', color: INK }}>Metal: {metal || 'N/A'}</Typography>
            {order.size && <Typography sx={{ fontSize: '0.43rem', mb: '1px', color: INK }}>Size: {order.size}</Typography>}
            {(order.gemstones || []).length > 0 && <Typography sx={{ fontSize: '0.43rem', mb: '1px', color: INK }}>Stones: {order.gemstones.join(', ')}</Typography>}
            {desc && (
              <Typography sx={{ fontSize: '0.43rem', mb: '1px', color: INK, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{desc}</Typography>
            )}
            {order.isRush && <Typography sx={{ fontSize: '0.43rem', fontWeight: 'bold', color: INK }}>RUSH</Typography>}
            <Box sx={{ mt: '3px', display: 'flex', justifyContent: 'space-between', fontSize: '0.38rem', fontWeight: 'bold', color: INK }}>
              <span>CAST______</span><span>SET______</span><span>C&amp;P______</span><span>QC______</span>
            </Box>
          </Box>
        </Box>

        <Typography sx={{ fontSize: '0.48rem', fontWeight: 'bold', mb: '2px', mt: '2px', color: MUTED }}>Bench Work:</Typography>
        <List dense disablePadding sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {benchItems.length === 0 ? (
            <Typography sx={{ fontSize: '0.43rem', color: MUTED }}>No open bench work orders.</Typography>
          ) : benchItems.map((w, i) => (
            <ListItem key={w.workOrderID || i} sx={{ p: '1px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: INK }}>
              <Typography sx={{ fontSize: '0.43rem', color: INK }}>{LANE[w.discipline] || w.discipline}: {w.title || w.discipline}</Typography>
              <Typography sx={{ fontSize: '0.36rem', color: MUTED }}>Bench ____  C&amp;P ____  QC ____</Typography>
            </ListItem>
          ))}
        </List>

        <Box sx={{ textAlign: 'center', mt: '2px', height: QR, overflow: 'hidden', flexShrink: 0, '& img': { width: QR, height: QR, display: 'block', margin: '0 auto' } }}>
          <img src={qrSrc(order.customID)} alt={`Custom ${order.customID}`} />
        </Box>
      </Box>
    </Box>
  );
}
