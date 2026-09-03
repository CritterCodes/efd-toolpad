"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Box, Button, Typography, Alert, Snackbar, Stack, useMediaQuery, useTheme } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import NewRepairForm from '@/app/components/repairs/NewRepairForm';
import NewRepairFlow from '@/app/components/repairs/NewRepairFlow';
import { canCreateRepair } from '@/lib/repairAccess';
import { PageHeader, facelift } from '@/components/facelift';

function getProductImageUrl(product) {
  const image = product?.images?.[0]
    || product?.image
    || product?.featuredImage
    || product?.media?.[0]
    || product?.thumbnail
    || product?.imageUrl
    || product?.primaryImage
    || product?.photos?.[0];

  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url
    || image.thumbnail
    || image.secureUrl
    || image.src
    || image.previewUrl
    || image.imageUrl
    || image.originalUrl
    || '';
}

const NewRepairPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  // Stepped flow's save choice: "Create & print ticket" (true) vs
  // "Save without printing" (false). Classic form always prints.
  const printAfterSaveRef = React.useRef(true);
  const [linkedSaleContext, setLinkedSaleContext] = useState(null);
  const [linkedSaleError, setLinkedSaleError] = useState('');

  // Stepped-flow A/B flag (intake redesign step 3): both views render from the
  // same useNewRepairForm hook, so this switch changes arrangement only.
  const useNextUi = searchParams.get('ui') === 'next';

  const scannedWholesaleStoreId = searchParams.get('wholesaleStoreId');
  const scannedWholesaleStoreName = searchParams.get('wholesaleStoreName');
  const salesInvoiceID = searchParams.get('salesInvoiceID');
  const salesLineID = searchParams.get('salesLineID');

  // Derive wholesale context synchronously so NewRepairForm always gets the correct
  // value on first render (avoids a race condition where the form would load EFD
  // clients before the useEffect could flip isWholesaler to true).
  const isWholesalerRole = status === 'authenticated' && session?.user?.role === 'wholesaler';
  const isWholesaler = isWholesalerRole || !!scannedWholesaleStoreId;
  const wholesalerStoreId = isWholesalerRole
    ? (session.user.userID || session.user.id || session.user.email)
    : (scannedWholesaleStoreId || null);
  const wholesalerStoreName = isWholesalerRole
    ? (session.user.name || session.user.email)
    : (scannedWholesaleStoreName || scannedWholesaleStoreId || null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    if (!canCreateRepair(session)) {
      router.push('/dashboard');
    }
  }, [router, session, status]);

  useEffect(() => {
    const loadLinkedSale = async () => {
      if (!salesInvoiceID || !salesLineID) {
        setLinkedSaleContext(null);
        setLinkedSaleError('');
        return;
      }

      try {
        setLinkedSaleError('');
        const response = await fetch(`/api/sales-invoices/${salesInvoiceID}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load linked sales invoice.');

        const invoice = data.invoice;
        const line = (invoice.lineItems || []).find((item) => item.lineID === salesLineID);
        if (!line) throw new Error('Sales invoice line was not found.');

        const repairItem = line.repairItem || {};
        const isRing = Boolean(repairItem.ringSize || String(line.title || '').toLowerCase().includes('ring'));
        const description = `Included work for ${line.title || 'jewelry item'} from sale ${invoice.invoiceID}`;
        let productImageUrl = line.imageUrl || line.productImageUrl || '';

        if (!productImageUrl && line.productID) {
          try {
            const productResponse = await fetch(`/api/products/jewelry/${line.productID}`);
            const productData = await productResponse.json();
            if (productResponse.ok) {
              productImageUrl = getProductImageUrl(productData.jewelry || productData);
            }
          } catch (productError) {
            console.warn('Failed to load linked product image for repair form:', productError);
          }
        }

        setLinkedSaleContext({
          invoice,
          line,
          clientInfo: {
            userID: invoice.clientID,
            name: invoice.clientName,
          },
          initialData: {
            userID: invoice.clientID,
            clientName: invoice.clientName,
            description,
            smartIntakeInput: description,
            promiseDate: '',
            picture: productImageUrl,
            metalType: repairItem.metalType || '',
            karat: repairItem.karat || '',
            goldColor: repairItem.goldColor || '',
            isRing,
            currentRingSize: repairItem.ringSize || '',
            desiredRingSize: '',
            notes: `Included with sales invoice ${invoice.invoiceID}.`,
            internalNotes: `Comped repair linked to sales invoice ${invoice.invoiceID}, line ${line.lineID}.`,
            compRepair: true,
            includedWithSale: true,
            includeTax: false,
            includeDelivery: false,
            sourceType: 'sales_invoice',
            salesInvoiceID: invoice.invoiceID,
            salesLineID: line.lineID,
            productID: line.productID || '',
          },
        });
      } catch (error) {
        setLinkedSaleContext(null);
        setLinkedSaleError(error.message);
      }
    };

    loadLinkedSale();
  }, [salesInvoiceID, salesLineID]);

  if (status === 'loading') return null;

  const showToast = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleSubmit = async (result) => {
    try {
      console.log('Final repair data:', result);
      console.log('Repair created successfully:', result);
      showToast?.('Repair created successfully!', 'success');

      const repairId = result.newRepair?.repairID
        || result.repair?.repairID
        || result.repairID
        || result.newRepair?._id
        || result._id;

      console.log('Redirecting to print page for repair ID:', repairId);

      if (repairId && linkedSaleContext?.invoice?.invoiceID && linkedSaleContext?.line?.lineID) {
        const linkResponse = await fetch(`/api/sales-invoices/${linkedSaleContext.invoice.invoiceID}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'link_repair',
            lineID: linkedSaleContext.line.lineID,
            repairID: repairId,
          }),
        });
        const linkData = await linkResponse.json();
        if (!linkResponse.ok) {
          showToast?.(`Repair created, but invoice link failed: ${linkData.error || 'Unknown error'}`, 'warning');
        }
      }

      if (repairId && !printAfterSaveRef.current) {
        // "Save without printing" (stepped flow) — straight to the queue.
        router.push('/dashboard/repairs/ready-for-work');
      } else if (repairId) {
        router.push(`/dashboard/repairs/${repairId}/print`);
      } else {
        console.error('No repair ID found in response:', result);
        showToast?.('Repair created but redirect failed - check console', 'warning');
        router.push('/dashboard/repairs/ready-for-work');
      }
    } catch (error) {
      console.error('Error handling repair creation result:', error);
      showToast?.('Failed to process repair creation. Please try again.', 'error');
    }
  };

  const handleCancel = () => {
    if (session?.user?.role === 'wholesaler' && isWholesaler) {
      router.push('/dashboard/repairs/my-repairs');
    } else {
      router.push('/dashboard/repairs/ready-for-work');
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Stack spacing={2.5}>
        {useNextUi ? (
          /* The stepped flow renders its own per-step header (✕/‹ + title +
             dots). The page adds only linked-sale / preset context if any. */
          (linkedSaleContext || (scannedWholesaleStoreId && session?.user?.role !== 'wholesaler')) && (
            <Typography variant="caption" sx={{ color: facelift.gold, fontWeight: 600 }}>
              {linkedSaleContext
                ? `Linked sale: ${linkedSaleContext.invoice.invoiceID}`
                : `Store preset: ${wholesalerStoreName || scannedWholesaleStoreId}`}
            </Typography>
          )
        ) : (
        <PageHeader
          badge={linkedSaleContext ? 'Sales-linked repair' : isWholesaler ? 'Wholesale intake' : 'Repair intake'}
          title="Create a new repair"
          subtitle={linkedSaleContext
            ? 'Create a comped repair ticket from the selected sales invoice line, then print the ticket for bench work.'
            : 'Intake client details, capture item information, assign services and pricing, then generate the repair ticket.'}
          actions={(
            <Button
              startIcon={<ArrowBack />}
              onClick={handleCancel}
              variant="outlined"
              fullWidth={isMobile}
            >
              Back to Repairs
            </Button>
          )}
        >
          {linkedSaleContext && (
            <Typography sx={{ color: facelift.gold, mt: 1, fontWeight: 600 }}>
              Linked sale: {linkedSaleContext.invoice.invoiceID} / {linkedSaleContext.line.title}
            </Typography>
          )}
          {scannedWholesaleStoreId && session?.user?.role !== 'wholesaler' && (
            <Typography sx={{ color: facelift.gold, mt: 1, fontWeight: 600 }}>
              Store preset: {wholesalerStoreName || scannedWholesaleStoreId}
            </Typography>
          )}
        </PageHeader>
        )}

        <Box>
          {linkedSaleError && <Alert severity="error" sx={{ mb: 2 }}>{linkedSaleError}</Alert>}
          {useNextUi ? (
            <NewRepairFlow
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onPrintChoice={(print) => { printAfterSaveRef.current = print; }}
              initialData={linkedSaleContext?.initialData || null}
              clientInfo={linkedSaleContext?.clientInfo || null}
              isWholesale={isWholesaler}
              wholesalerStoreId={wholesalerStoreId}
              wholesalerStoreName={wholesalerStoreName}
            />
          ) : (
            <NewRepairForm
              onSubmit={handleSubmit}
              initialData={linkedSaleContext?.initialData || null}
              clientInfo={linkedSaleContext?.clientInfo || null}
              isWholesale={isWholesaler}
              wholesalerStoreId={wholesalerStoreId}
              wholesalerStoreName={wholesalerStoreName}
            />
          )}
        </Box>
      </Stack>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NewRepairPage;
