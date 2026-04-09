import { useState, useEffect } from 'react';

export const useAddMaterialModal = ({
    initialMaterial,
    open,
    onClose,
    onSave,
    repairID,
    onStullerLookup
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

        if (onSave) onSave(repairID, materialData);
        if (onClose) onClose();
    };

    const handleClose = () => {
        setStullerError('');
        setStullerData(null);
        if (onClose) onClose();
    };

    return {
        formData,
        isStullerLoading,
        stullerError,
        stullerData,
        handleInputChange,
        handleStullerLookup,
        handleSave,
        handleClose
    };
};
