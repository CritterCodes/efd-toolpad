'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { PageContainer } from '@toolpad/core/PageContainer';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

export default function CustomTicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId;

  const [ticket, setTicket] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  // Financial form state
  const [financials, setFinancials] = React.useState({
    materialCosts: [],
    castingCost: 0,
    shippingCost: 0,
    laborCost: 0,
    designFee: 100,
    paymentReceived: false,
    paymentDate: null,
    cardUsed: '',
    amountPaidToCard: 0
  });

  // New material cost item
  const [newMaterial, setNewMaterial] = React.useState({ name: '', cost: 0 });

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
      
      // Initialize financial form with existing data
      setFinancials({
        materialCosts: ticketData.materialCosts || [],
        castingCost: ticketData.castingCost || 0,
        shippingCost: ticketData.shippingCost || 0,
        laborCost: ticketData.laborCost || 0,
        designFee: ticketData.designFee || 100,
        paymentReceived: ticketData.paymentReceived || false,
        paymentDate: ticketData.paymentDate || null,
        cardUsed: ticketData.cardUsed || '',
        amountPaidToCard: ticketData.amountPaidToCard || 0
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Calculate totals
  const calculateTotals = () => {
    const materialTotal = financials.materialCosts.reduce((sum, item) => sum + (item.cost || 0), 0);
    const laborWithMarkup = financials.laborCost * 1.25;
    const quoteTotal = (materialTotal * 2) + financials.castingCost + laborWithMarkup + financials.shippingCost + financials.designFee;
    const amountOwedToCard = materialTotal + financials.castingCost + financials.shippingCost + financials.laborCost;
    
    return { materialTotal, quoteTotal, amountOwedToCard };
  };

  // Add material cost
  const addMaterialCost = () => {
    if (newMaterial.name && newMaterial.cost > 0) {
      setFinancials(prev => ({
        ...prev,
        materialCosts: [...prev.materialCosts, { ...newMaterial, id: Date.now() }]
      }));
      setNewMaterial({ name: '', cost: 0 });
    }
  };

  // Remove material cost
  const removeMaterialCost = (index) => {
    setFinancials(prev => ({
      ...prev,
      materialCosts: prev.materialCosts.filter((_, i) => i !== index)
    }));
  };

  // Save financial updates
  const saveFinancials = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/custom-tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(financials)
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setTicket(result.data);
      setSuccess('Financial information saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(`Error saving: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Create Shopify orders
  const createShopifyOrder = async (orderType) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/custom-tickets/${ticketId}/create-${orderType}-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setTicket(prev => ({
        ...prev,
        [`shopify${orderType.charAt(0).toUpperCase() + orderType.slice(1)}OrderId`]: result.data.orderId
      }));
      
      setSuccess(`${orderType} order created successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(`Error creating ${orderType} order: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'primary';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const { materialTotal, quoteTotal, amountOwedToCard } = calculateTotals();

  if (loading) {
    return (
      <PageContainer
        title="Custom Ticket Details"
        breadcrumbs={[
          { title: 'Dashboard', path: '/dashboard' },
          { title: 'Custom Tickets', path: '/dashboard/custom-tickets' },
          { title: 'Details', path: `/dashboard/custom-tickets/${ticketId}` }
        ]}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error && !ticket) {
    return (
      <PageContainer
        title="Custom Ticket Details"
        breadcrumbs={[
          { title: 'Dashboard', path: '/dashboard' },
          { title: 'Custom Tickets', path: '/dashboard/custom-tickets' },
          { title: 'Details', path: `/dashboard/custom-tickets/${ticketId}` }
        ]}
      >
        <Alert severity="error" sx={{ mt: 2 }}>
          Error loading ticket: {error}
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`Ticket: ${ticket?.title || ticketId}`}
      breadcrumbs={[
        { title: 'Dashboard', path: '/dashboard' },
        { title: 'Custom Tickets', path: '/dashboard/custom-tickets' },
        { title: ticket?.title || 'Details', path: `/dashboard/custom-tickets/${ticketId}` }
      ]}
    >
      {/* Action Bar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          variant="outlined"
        >
          Back to Tickets
        </Button>
        
        <Button
          startIcon={<SaveIcon />}
          onClick={saveFinancials}
          variant="contained"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
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

      <Grid container spacing={3}>
        {/* Left Column - Ticket Information */}
        <Grid item xs={12} md={6}>
          {/* Basic Information */}
          <Card sx={{ mb: 3, borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="600">
                Ticket Information
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Ticket ID
                </Typography>
                <Typography variant="body1" fontWeight="500">
                  {ticket?.ticketID}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1" fontWeight="500">
                  {ticket?.title}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1">
                  {ticket?.description}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Type
                </Typography>
                <Chip 
                  label={ticket?.type} 
                  color="secondary" 
                  size="small"
                  sx={{ textTransform: 'capitalize', mt: 0.5 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={ticket?.status} 
                  color={getStatusColor(ticket?.status)}
                  size="small"
                  sx={{ textTransform: 'capitalize', mt: 0.5 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Client
                </Typography>
                <Typography variant="body1" fontWeight="500">
                  {ticket?.clientInfo?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {ticket?.clientInfo?.email}
                </Typography>
                {ticket?.clientInfo?.phone && (
                  <Typography variant="body2" color="text.secondary">
                    {ticket?.clientInfo?.phone}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {new Date(ticket?.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Shopify Orders */}
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="600">
                Shopify Orders
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1" fontWeight="500">
                      Deposit Order
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ticket?.shopifyDepositOrderId ? `Order ID: ${ticket.shopifyDepositOrderId}` : 'Not created yet'}
                    </Typography>
                  </Box>
                  {!ticket?.shopifyDepositOrderId ? (
                    <Button
                      variant="contained"
                      startIcon={<ShoppingCartIcon />}
                      onClick={() => createShopifyOrder('deposit')}
                      disabled={saving}
                      size="small"
                    >
                      Create Deposit Order
                    </Button>
                  ) : (
                    <Chip label="Created" color="success" />
                  )}
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1" fontWeight="500">
                      Final Order
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ticket?.shopifyFinalOrderId ? `Order ID: ${ticket.shopifyFinalOrderId}` : 'Not created yet'}
                    </Typography>
                  </Box>
                  {!ticket?.shopifyFinalOrderId ? (
                    <Button
                      variant="contained"
                      startIcon={<ShoppingCartIcon />}
                      onClick={() => createShopifyOrder('final')}
                      disabled={saving}
                      size="small"
                    >
                      Create Final Order
                    </Button>
                  ) : (
                    <Chip label="Created" color="success" />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Financial Management */}
        <Grid item xs={12} md={6}>
          {/* Quote Summary */}
          <Card sx={{ mb: 3, borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MonetizationOnIcon color="primary" />
                Quote Summary
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Materials (×2):</Typography>
                  <Typography variant="body2">${(materialTotal * 2).toFixed(2)}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Casting:</Typography>
                  <Typography variant="body2">${financials.castingCost.toFixed(2)}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Labor (×1.25):</Typography>
                  <Typography variant="body2">${(financials.laborCost * 1.25).toFixed(2)}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Shipping:</Typography>
                  <Typography variant="body2">${financials.shippingCost.toFixed(2)}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Design Fee:</Typography>
                  <Typography variant="body2">${financials.designFee.toFixed(2)}</Typography>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight="bold">Quote Total:</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    ${quoteTotal.toFixed(2)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="error.main">Amount Owed to Card:</Typography>
                  <Typography variant="body2" color="error.main" fontWeight="500">
                    ${amountOwedToCard.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Financial Details Accordion */}
          <Accordion sx={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoneyIcon color="primary" />
                Financial Management
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Material Costs */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    Material Costs
                  </Typography>
                  
                  {financials.materialCosts.length > 0 && (
                    <TableContainer component={Paper} sx={{ mb: 2, borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Material</TableCell>
                            <TableCell align="right">Cost</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {financials.materialCosts.map((material, index) => (
                            <TableRow key={index}>
                              <TableCell>{material.name}</TableCell>
                              <TableCell align="right">${material.cost.toFixed(2)}</TableCell>
                              <TableCell align="center">
                                <IconButton 
                                  size="small" 
                                  onClick={() => removeMaterialCost(index)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      label="Material Name"
                      value={newMaterial.name}
                      onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      label="Cost"
                      type="number"
                      value={newMaterial.cost}
                      onChange={(e) => setNewMaterial(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                      sx={{ width: 100 }}
                    />
                    <IconButton 
                      onClick={addMaterialCost}
                      color="primary"
                      disabled={!newMaterial.name || newMaterial.cost <= 0}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                </Box>

                {/* Other Costs */}
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Casting Cost"
                      type="number"
                      value={financials.castingCost}
                      onChange={(e) => setFinancials(prev => ({ ...prev, castingCost: parseFloat(e.target.value) || 0 }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Shipping Cost"
                      type="number"
                      value={financials.shippingCost}
                      onChange={(e) => setFinancials(prev => ({ ...prev, shippingCost: parseFloat(e.target.value) || 0 }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Labor Cost"
                      type="number"
                      value={financials.laborCost}
                      onChange={(e) => setFinancials(prev => ({ ...prev, laborCost: parseFloat(e.target.value) || 0 }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Design Fee"
                      type="number"
                      value={financials.designFee}
                      onChange={(e) => setFinancials(prev => ({ ...prev, designFee: parseFloat(e.target.value) || 0 }))}
                    />
                  </Grid>
                </Grid>

                {/* Payment Information */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    Payment Information
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={financials.paymentReceived}
                            onChange={(e) => setFinancials(prev => ({ ...prev, paymentReceived: e.target.checked }))}
                          />
                        }
                        label="Payment Received"
                      />
                    </Grid>
                    
                    {financials.paymentReceived && (
                      <>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Payment Date"
                            type="date"
                            value={financials.paymentDate || ''}
                            onChange={(e) => setFinancials(prev => ({ ...prev, paymentDate: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Card Used"
                            value={financials.cardUsed}
                            onChange={(e) => setFinancials(prev => ({ ...prev, cardUsed: e.target.value }))}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Amount Paid to Card"
                            type="number"
                            value={financials.amountPaidToCard}
                            onChange={(e) => setFinancials(prev => ({ ...prev, amountPaidToCard: parseFloat(e.target.value) || 0 }))}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
