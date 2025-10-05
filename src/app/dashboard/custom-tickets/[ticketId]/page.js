/**
 * Constitutional Custom Ticket Detail Page
 * Modular page following constitutional architecture (<250 lines)
 * Uses hooks and components for separation of concerns
 */

'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Typography
} from '@mui/material';
import { PageContainer } from '@toolpad/core/PageContainer';

// Constitutional imports - hooks and components
import {
  useCustomTicketDetail,
  useTicketNotes,
  useTicketStatus,
  useTicketImages,
  useTicketCommunications
} from '@/hooks/custom-tickets';

import CustomTicketHeader from '@/app/components/custom-tickets/CustomTicketHeader';
import CustomTicketOverview from '@/app/components/custom-tickets/CustomTicketOverview';
import CustomTicketStatusTimeline from '@/app/components/custom-tickets/CustomTicketStatusTimeline';
import CustomTicketNotes from '@/app/components/custom-tickets/CustomTicketNotes';
import CustomTicketImages from '@/app/components/custom-tickets/CustomTicketImages';
import CustomTicketQuote from '@/app/components/custom-tickets/CustomTicketQuote';
import CustomTicketCommunications from '@/app/components/custom-tickets/CustomTicketCommunications';
import CustomTicketInvoices from '@/app/components/custom-tickets/CustomTicketInvoices';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ticket-tabpanel-${index}`}
      aria-labelledby={`ticket-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function CustomTicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId;
  const [activeTab, setActiveTab] = useState(0);

  // Main ticket data hook
  const {
    ticket,
    loading,
    error,
    saving,
    updateStatus,
    updateFinancials,
    refreshTicket
  } = useCustomTicketDetail(ticketId);

  // Notes management hook
  const {
    newNote,
    setNewNote,
    noteModal,
    saving: notesSaving,
    openNoteModal,
    closeNoteModal,
    addNote,
    deleteNote,
    notesCount
  } = useTicketNotes(ticket, updateFinancials);

  // Status management hook
  const {
    availableStatuses,
    currentStatusInfo,
    statusLoading,
    statusError,
    updateStatus: handleStatusUpdate,
    clearStatusError,
    requiresAction,
    statusColor
  } = useTicketStatus(ticket, updateStatus);

  // Images management hook
  const {
    imageModal,
    openImageModal,
    closeImageModal,
    hasImages,
    imageCount
  } = useTicketImages(ticket);

  // Communications management hook
  const {
    communicationsLoading,
    communicationsError,
    communicationsCount,
    addCommunication,
    clearCommunicationsError
  } = useTicketCommunications(ticket, refreshTicket);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Loading state
  if (loading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </PageContainer>
    );
  }

  // No ticket found
  if (!ticket) {
    return (
      <PageContainer>
        <Alert severity="warning">
          Ticket not found
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Constitutional Header Component */}
      <CustomTicketHeader
        ticket={ticket}
        loading={loading}
        saving={saving}
        statusColor={statusColor}
        requiresAction={requiresAction}
      />

      {/* Status Timeline - Visual Progress Tracker */}
      <CustomTicketStatusTimeline
        ticket={ticket}
        availableStatuses={availableStatuses}
        statusLoading={statusLoading}
        statusError={statusError}
        onStatusUpdate={handleStatusUpdate}
        allowEditing={true}
      />

      {/* Tab Navigation - Added Invoices Tab */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label={`Notes (${notesCount})`} />
          <Tab label={`Images (${imageCount})`} />
          <Tab label={`Communications (${communicationsCount})`} />
          <Tab label="Quote" />
          <Tab label="Invoices" />
        </Tabs>
      </Box>

      {/* Tab Panels - Adjusted indices */}
      <TabPanel value={activeTab} index={0}>
        <CustomTicketOverview ticket={ticket} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <CustomTicketNotes
          ticket={ticket}
          notes={ticket?.notes || []}
          noteModal={noteModal}
          newNote={newNote}
          saving={notesSaving}
          onNewNoteChange={setNewNote}
          onOpenNoteModal={openNoteModal}
          onCloseNoteModal={closeNoteModal}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <CustomTicketImages
          ticket={ticket}
          images={ticket?.files?.moodBoard || []}
          imageModal={imageModal}
          onOpenImageModal={openImageModal}
          onCloseImageModal={closeImageModal}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <CustomTicketCommunications
          ticket={ticket}
          onAddCommunication={addCommunication}
          loading={communicationsLoading}
          error={communicationsError}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <CustomTicketQuote
          ticket={ticket}
          onUpdateFinancials={updateFinancials}
          saving={saving}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <CustomTicketInvoices
          ticket={ticket}
          onRefresh={refreshTicket}
          saving={saving}
        />
      </TabPanel>
    </PageContainer>
  );
}