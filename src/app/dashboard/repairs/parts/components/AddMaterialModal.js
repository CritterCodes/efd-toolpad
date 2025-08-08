import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Autocomplete,
    Alert,
    CircularProgress,
    InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { MATERIAL_TYPES, PRICING_METHODS } from '../constants';

const AddMaterialModal = ({ 
    open, 
    onClose, 
    onSave, 
    repairID, 
    initialMaterial = null,
    onStullerLookup = null 
}) => {
    const [formData, setFormData] = useState({
        sku: '',
        partName: '',
        materialType: 'finding',
        quantity: 1,
        cost: '',
        price: '',
        markup: 2.5,
        pricingMethod: 'stuller',
        description: '',
        supplier: 'Stuller'
    });

    const [isStullerLoading, setIsStullerLoading] = useState(false);
    const [stullerError, setStullerError] = useState('');
    const [stullerData, setStullerData] = useState(null);

    useEffect(() => {
        if (initialMaterial) {
            setFormData({
                sku: initialMaterial.sku || '',
                partName: initialMaterial.partName || initialMaterial.name || '',
                materialType: initialMaterial.materialType || 'finding',
                quantity: initialMaterial.quantity || 1,
                cost: initialMaterial.cost || '',
                price: initialMaterial.price || '',
                markup: initialMaterial.markup || 2.5,
                pricingMethod: initialMaterial.pricingMethod || 'stuller',
                description: initialMaterial.description || '',
                supplier: initialMaterial.supplier || 'Stuller'
            });
        } else {
            // Reset form for new material
            setFormData({
                sku: '',
                partName: '',
                materialType: 'finding',
                quantity: 1,
                cost: '',
                price: '',
                markup: 2.5,
                pricingMethod: 'stuller',
                description: '',
                supplier: 'Stuller'
            });
        }
        setStullerError('');
        setStullerData(null);
    }, [initialMaterial, open]);

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            
            // Auto-calculate price when cost or markup changes
            if (field === 'cost' || field === 'markup') {
                if (updated.pricingMethod === 'markup' && updated.cost && updated.markup) {
                    updated.price = (parseFloat(updated.cost) * parseFloat(updated.markup)).toFixed(2);
                }
            }
            
            return updated;
        });
    };

    const handleStullerLookup = async () => {
        if (!formData.sku.trim()) {
            setStullerError('Please enter a Stuller SKU');
            return;
        }

        setIsStullerLoading(true);
        setStullerError('');

        try {
            // This should call your Stuller API service
            const response = await fetch(`/api/stuller/lookup?sku=${formData.sku}`);
            const data = await response.json();

            if (data.success) {
                setStullerData(data.item);
                setFormData(prev => ({
                    ...prev,
                    partName: data.item.description || prev.partName,
                    cost: data.item.price || prev.cost,
                    price: data.item.retailPrice || (data.item.price * 2.5).toFixed(2),
                    description: data.item.longDescription || prev.description,
                    supplier: 'Stuller'
                }));
            } else {
                setStullerError(data.error || 'Item not found');
            }
        } catch (error) {
            setStullerError('Error looking up Stuller item');
        } finally {
            setIsStullerLoading(false);
        }
    };

    const handleSave = () => {
        if (!formData.sku || !formData.partName) {
            setStullerError('SKU and Part Name are required');
            return;
        }

        const materialData = {
            ...formData,
            quantity: parseInt(formData.quantity),
            cost: parseFloat(formData.cost) || 0,
            price: parseFloat(formData.price) || 0,
            markup: parseFloat(formData.markup) || 0,
            id: formData.sku // Use SKU as ID for uniqueness
        };

        onSave(repairID, materialData);
        onClose();
    };

    const handleClose = () => {
        setStullerError('');
        setStullerData(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {initialMaterial ? 'Edit Material' : 'Add Material'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Grid container spacing={3}>
                        {/* Stuller SKU Lookup */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                                <TextField
                                    fullWidth
                                    label="Stuller SKU"
                                    value={formData.sku}
                                    onChange={(e) => handleInputChange('sku', e.target.value)}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Button
                                                    onClick={handleStullerLookup}
                                                    disabled={isStullerLoading}
                                                    startIcon={isStullerLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                                                >
                                                    Lookup
                                                </Button>
                                            </InputAdornment>
                                        )
                                    }}
                                    helperText="Enter Stuller SKU and click Lookup to auto-populate"
                                />
                            </Box>
                            {stullerError && (
                                <Alert severity="error" sx={{ mt: 1 }}>
                                    {stullerError}
                                </Alert>
                            )}
                            {stullerData && (
                                <Alert severity="success" sx={{ mt: 1 }}>
                                    Found: {stullerData.description}
                                </Alert>
                            )}
                        </Grid>

                        {/* Material Details */}
                        <Grid item xs={12} md={8}>
                            <TextField
                                fullWidth
                                label="Material/Part Name"
                                value={formData.partName}
                                onChange={(e) => handleInputChange('partName', e.target.value)}
                                required
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Material Type</InputLabel>
                                <Select
                                    value={formData.materialType}
                                    onChange={(e) => handleInputChange('materialType', e.target.value)}
                                    label="Material Type"
                                >
                                    {MATERIAL_TYPES.map((type) => (
                                        <MenuItem key={type.value} value={type.value}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Quantity"
                                value={formData.quantity}
                                onChange={(e) => handleInputChange('quantity', e.target.value)}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>

                        {/* Pricing Section */}
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Pricing Method</InputLabel>
                                <Select
                                    value={formData.pricingMethod}
                                    onChange={(e) => handleInputChange('pricingMethod', e.target.value)}
                                    label="Pricing Method"
                                >
                                    {PRICING_METHODS.map((method) => (
                                        <MenuItem key={method.value} value={method.value}>
                                            {method.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Cost"
                                value={formData.cost}
                                onChange={(e) => handleInputChange('cost', e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                                }}
                                inputProps={{ min: 0, step: 0.01 }}
                            />
                        </Grid>

                        {formData.pricingMethod === 'markup' && (
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Markup Multiplier"
                                    value={formData.markup}
                                    onChange={(e) => handleInputChange('markup', e.target.value)}
                                    inputProps={{ min: 1, step: 0.1 }}
                                    helperText="e.g., 2.5 for 250% markup"
                                />
                            </Grid>
                        )}

                        <Grid item xs={12} md={formData.pricingMethod === 'markup' ? 4 : 8}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Selling Price"
                                value={formData.price}
                                onChange={(e) => handleInputChange('price', e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                                }}
                                inputProps={{ min: 0, step: 0.01 }}
                                disabled={formData.pricingMethod === 'markup' && formData.cost && formData.markup}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Description/Notes"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Additional details about this material..."
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Supplier"
                                value={formData.supplier}
                                onChange={(e) => handleInputChange('supplier', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained"
                    disabled={!formData.sku || !formData.partName}
                >
                    {initialMaterial ? 'Update Material' : 'Add Material'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddMaterialModal;
