'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Avatar from '@mui/material/Avatar';
import { PageContainer } from '@toolpad/core/PageContainer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import MessageIcon from '@mui/icons-material/Message';
import NotesIcon from '@mui/icons-material/Notes';
import ImageIcon from '@mui/icons-material/Image';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import ChatIcon from '@mui/icons-material/Chat';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import MessageInterface from '../../../../components/MessageInterface';
import VisualWorkflowManager from '../../../../components/VisualWorkflowManager';
import { 
  getInternalStatusInfo, 
  getClientStatusInfo, 
  getClientStatusDisplay,
  getAdminStatuses,
  getNextPossibleStatuses,
  isStatusTransitionAllowed,
  STATUS_CATEGORIES
} from '../../../../config/customTicketStatuses';

export default function CustomTicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId;

  const [ticket, setTicket] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  
  // Tab state
  const [activeTab, setActiveTab] = React.useState(0);

  // Communication state
  const [communicationDialog, setCommunicationDialog] = React.useState(false);
  const [noteDialog, setNoteDialog] = React.useState(false);
  const [newCommunication, setNewCommunication] = React.useState({
    message: '',
    type: 'email',
    from: 'admin',
    to: 'client'
  });
  const [newNote, setNewNote] = React.useState('');

  // Image modal
  const [imageModal, setImageModal] = React.useState({ open: false, image: null });

  // Load ticket data
  const loadTicket = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/custom-tickets/${ticketId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const ticketData = result.data;
      setTicket(ticketData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Status management
  const handleStatusChange = async (status) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/custom-tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setTicket(prev => ({ ...prev, status }));
      setSuccess(`Status updated to: ${getInternalStatusInfo(status).label}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Add communication via MessageInterface
  const handleAddCommunication = async (communicationData) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/custom-tickets/${ticketId}/communication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(communicationData)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh ticket data
      await loadTicket();
      setSuccess('Message sent successfully');
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Add communication
  const addCommunication = async () => {
    if (!newCommunication.message.trim()) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/custom-tickets/${ticketId}/communication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCommunication,
          date: new Date().toISOString()
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh ticket data
      await loadTicket();
      setNewCommunication({ message: '', type: 'email', from: 'admin', to: 'client' });
      setCommunicationDialog(false);
      setSuccess('Communication added successfully');
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Add note
  const addNote = async () => {
    if (!newNote.trim()) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/custom-tickets/${ticketId}/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: newNote,
          date: new Date().toISOString(),
          author: 'admin'
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh ticket data
      await loadTicket();
      setNewNote('');
      setNoteDialog(false);
      setSuccess('Note added successfully');
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const statusInfo = getInternalStatusInfo(status);
    return statusInfo.color || 'default';
  };

  const getStatusIcon = (status) => {
    const statusInfo = getInternalStatusInfo(status);
    return statusInfo.icon || '📋';
  };

  const getClientStatusDisplay = (internalStatus) => {
    const clientStatusInfo = getClientStatusInfo(internalStatus);
    return {
      label: clientStatusInfo.label,
      description: clientStatusInfo.description,
      color: clientStatusInfo.color,
      icon: clientStatusInfo.icon
    };
  };

  const getCommunicationIcon = (type) => {
    switch (type) {
      case 'email':
        return <EmailIcon fontSize="small" />;
      case 'phone':
        return <PhoneIcon fontSize="small" />;
      case 'in-person':
        return <PersonIcon fontSize="small" />;
      default:
        return <ChatIcon fontSize="small" />;
    }
  };

  if (loading) {
    return (
      <PageContainer title="Loading...">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error && !ticket) {
    return (
      <PageContainer title="Error">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          variant="outlined"
        >
          Back to Tickets
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={ticket?.title || 'Custom Ticket Details'}
      breadcrumbs={[
        { title: 'Dashboard', path: '/dashboard' },
        { title: 'Custom Tickets', path: '/dashboard/custom-tickets' },
        { title: ticket?.title || 'Details', path: `/dashboard/custom-tickets/${ticketId}` }
      ]}
    >
      {/* Header Actions */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          variant="outlined"
        >
          Back to Tickets
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<MessageIcon />}
            onClick={() => setCommunicationDialog(true)}
            disabled={saving}
          >
            Add Communication
          </Button>
          <Button
            variant="outlined"
            startIcon={<NotesIcon />}
            onClick={() => setNoteDialog(true)}
            disabled={saving}
          >
            Add Note
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Visual Workflow Manager */}
      <VisualWorkflowManager
        currentStatus={ticket?.status}
        onStatusChange={handleStatusChange}
        ticketHistory={ticket?.workHistory || []}
        disabled={saving}
      />

      {/* Main Content Card */}
      <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
        {/* Ticket Header */}
        <CardContent sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {ticket?.title || 'Custom Design Request'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Chip
                    label={`${getStatusIcon(ticket?.status)} ${getInternalStatusInfo(ticket?.status).label}`}
                    color={getStatusColor(ticket?.status)}
                    size="medium"
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Client sees:
                    </Typography>
                    <Chip
                      label={getClientStatusDisplay(ticket?.status).label}
                      color={getClientStatusDisplay(ticket?.status).color}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  ID: {ticket?.ticketID}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Created: {ticket?.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Unknown'}
                {ticket?.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                  <> • Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</>
                )}
              </Typography>
            </Box>
            
            {/* Customer Info Card */}
            <Card variant="outlined" sx={{ minWidth: 250, maxWidth: 300 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Customer Information
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="600">
                      {ticket?.customer?.name || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ticket?.customer?.email || 'No email'}
                    </Typography>
                  </Box>
                </Box>
                {ticket?.customer?.phone && (
                  <Typography variant="caption" color="text.secondary">
                    📞 {ticket.customer.phone}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </CardContent>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              label="Overview" 
              icon={<VisibilityIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Files & Images ${ticket?.files?.moodBoard?.length ? `(${ticket.files.moodBoard.length})` : ''}`}
              icon={<ImageIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Communication ${ticket?.communications?.length ? `(${ticket.communications.length})` : ''}`}
              icon={<MessageIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Notes ${ticket?.adminNotes?.length ? `(${ticket.adminNotes.length})` : ''}`}
              icon={<NotesIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <CardContent sx={{ p: 3 }}>
          {/* Overview Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Request Details
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {ticket?.description || 'No description provided'}
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Jewelry Type
                      </Typography>
                      <Typography variant="body2">
                        {ticket?.requestDetails?.jewelryType || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Metal Type
                      </Typography>
                      <Typography variant="body2">
                        {ticket?.requestDetails?.metalType || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Budget Range
                      </Typography>
                      <Typography variant="body2">
                        {ticket?.requestDetails?.budget || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Timeline
                      </Typography>
                      <Typography variant="body2">
                        {ticket?.requestDetails?.timeline || 'Not specified'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  {ticket?.requestDetails?.gemstones?.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Gemstones
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {ticket.requestDetails.gemstones.map((gemstone, index) => (
                          <Chip key={index} label={gemstone} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  {ticket?.requestDetails?.specialRequests && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Special Requests
                      </Typography>
                      <Typography variant="body2">
                        {ticket.requestDetails.specialRequests}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Files & Images Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Files & Attachments
              </Typography>
              
              {ticket?.files?.moodBoard?.length > 0 ? (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    📋 Mood Board Images ({ticket.files.moodBoard.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {ticket.files.moodBoard.map((file, index) => (
                      <Grid item xs={6} sm={4} md={3} key={index}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { boxShadow: 2 }
                          }}
                          onClick={() => setImageModal({ open: true, image: file })}
                        >
                          <Box sx={{ p: 2, textAlign: 'center' }}>
                            <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                              {typeof file === 'string' ? file.split('/').pop() : `Image ${index + 1}`}
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No files or images attached to this request.
                </Typography>
              )}
            </Box>
          )}

          {/* Communication Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Customer Communication
              </Typography>
              <MessageInterface 
                ticket={ticket}
                onAddCommunication={handleAddCommunication}
                isSubmitting={saving}
              />
            </Box>
          )}

          {/* Notes Tab */}
          {activeTab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Admin Notes
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<NotesIcon />}
                  onClick={() => setNoteDialog(true)}
                  size="small"
                >
                  Add Note
                </Button>
              </Box>
              
              {ticket?.adminNotes?.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {ticket.adminNotes
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((note, index) => (
                    <Card key={index} variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                              <AdminPanelSettingsIcon fontSize="small" />
                            </Avatar>
                            <Typography variant="subtitle2" fontWeight="600">
                              {note.author || 'Admin'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {note.date ? new Date(note.date).toLocaleString() : 'No date'}
                          </Typography>
                        </Box>
                        <Typography variant="body2">
                          {note.note || note.content || 'No note content'}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No admin notes yet. Add internal notes to track progress and important information.
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Communication Dialog */}
      <Dialog 
        open={communicationDialog} 
        onClose={() => setCommunicationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Communication</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Communication Type</InputLabel>
              <Select
                value={newCommunication.type}
                onChange={(e) => setNewCommunication({...newCommunication, type: e.target.value})}
              >
                <MenuItem value="email">📧 Email</MenuItem>
                <MenuItem value="phone">📞 Phone Call</MenuItem>
                <MenuItem value="in-person">👥 In-Person</MenuItem>
                <MenuItem value="chat">💬 Chat/Message</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Message"
              multiline
              rows={4}
              value={newCommunication.message}
              onChange={(e) => setNewCommunication({...newCommunication, message: e.target.value})}
              placeholder="Enter communication details..."
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommunicationDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={addCommunication} 
            variant="contained"
            disabled={!newCommunication.message.trim() || saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Add Communication'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Note Dialog */}
      <Dialog 
        open={noteDialog} 
        onClose={() => setNoteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Admin Note</DialogTitle>
        <DialogContent>
          <TextField
            label="Note"
            multiline
            rows={4}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter internal notes, progress updates, or important information..."
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={addNote} 
            variant="contained"
            disabled={!newNote.trim() || saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Modal */}
      <Dialog 
        open={imageModal.open} 
        onClose={() => setImageModal({ open: false, image: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Image Preview</DialogTitle>
        <DialogContent>
          {imageModal.image && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {typeof imageModal.image === 'string' ? imageModal.image.split('/').pop() : 'Image'}
              </Typography>
              {/* You would typically show the actual image here */}
              <Box sx={{ 
                height: 400, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'grey.100',
                borderRadius: 1
              }}>
                <ImageIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageModal({ open: false, image: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
