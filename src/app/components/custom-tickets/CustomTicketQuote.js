import React from 'react';
import { Box, Paper, Typography, CircularProgress, Divider } from '@mui/material';
import { useCustomTicketQuote } from '@/hooks/custom-tickets/useCustomTicketQuote';
import { QuoteHeader } from './quote-components/QuoteHeader';
import { MaterialsSection } from './quote-components/MaterialsSection';
import { LaborSection } from './quote-components/LaborSection';
import { ShippingSection } from './quote-components/ShippingSection';
import { AdditionalOptionsSection } from './quote-components/AdditionalOptionsSection';
import { QuoteSummary } from './quote-components/QuoteSummary';
import { AnalyticsSummary } from './quote-components/AnalyticsSummary';

export default function CustomTicketQuote({ ticket, onUpdateFinancials }) {
  const {
    editMode,
    setEditMode,
    isPublished,
    financialSettings,
    loadingSettings,
    saving,
    formData,
    analytics,
    handleItemChange,
    updateField,
    updateNestedField,
    handleSave,
    handlePublishQuote,
    handleUnpublishQuote,
    handleCancel
  } = useCustomTicketQuote(ticket, onUpdateFinancials);

  if (loadingSettings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <QuoteHeader
        editMode={editMode}
        setEditMode={setEditMode}
        isPublished={isPublished}
        saving={saving}
        analyticsTotal={analytics.total}
        handleCancel={handleCancel}
        handleSave={handleSave}
        handlePublishQuote={handlePublishQuote}
        handleUnpublishQuote={handleUnpublishQuote}
      />

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" color="primary" gutterBottom>
          Phase 1: Materials
        </Typography>
        <MaterialsSection
          formData={formData}
          editMode={editMode}
          updateNestedField={updateNestedField}
          handleItemChange={handleItemChange}
        />

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" color="primary" gutterBottom>
          Phase 2: Labor & Processes
        </Typography>
        <LaborSection
          laborTasks={formData.laborTasks}
          editMode={editMode}
          handleItemChange={handleItemChange}
        />

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" color="primary" gutterBottom>
          Phase 3: Additional Services
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <ShippingSection
            shippingCosts={formData.shippingCosts}
            editMode={editMode}
            handleItemChange={handleItemChange}
          />
          <AdditionalOptionsSection
            formData={formData}
            editMode={editMode}
            updateField={updateField}
          />
        </Box>
      </Paper>

      {/* Breakdowns */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Quote Summary
          </Typography>
          <QuoteSummary analytics={analytics} formData={formData} />
        </Paper>

        <Paper sx={{ p: 4, borderRadius: 2, bgcolor: 'primary.50' }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Financial Analytics
          </Typography>
          <AnalyticsSummary analytics={analytics} />
        </Paper>
      </Box>
    </Box>
  );
}
