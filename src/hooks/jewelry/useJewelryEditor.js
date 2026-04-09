'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export const useJewelryEditor = (jewelryId) => {
    const { data: session } = useSession();
    const router = useRouter();
    const isNew = jewelryId === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [availableGemstones, setAvailableGemstones] = useState([]);
    const [metalPrices, setMetalPrices] = useState(null);

    // CAD Request State
    const [cadRequests, setCadRequests] = useState([]);
    const [designs, setDesigns] = useState([]);
    const [cadDialogOpen, setCadDialogOpen] = useState(false);
    const [editingCadRequest, setEditingCadRequest] = useState(null);
    const [cadFormData, setCadFormData] = useState({
        mountingType: '',
        styleDescription: '',
        ringSize: '',
        specialRequests: '',
        assignedDesigner: ''
    });

    const [formData, setFormData] = useState({
        title: '', type: '', price: '', status: 'draft',
        availability: 'ready-to-ship', classification: 'signature',
        images: [], existingImages: [], userId: '', vendor: '', notes: '',
        metals: [], centerStones: [], accentStones: [], gemstoneLinks: [],
        ringSize: '', canBeSized: false, sizingRangeUp: '', sizingRangeDown: '',
        chainIncluded: false, chainMaterial: '', chainLength: '', chainStyle: '',
        length: '', claspType: '', dimensions: '',
        objFile: null, stlFile: null, glbFile: null,
        dynamicPricing: {
            enabled: false, stlVolume: 0, cadLabor: 0, productionLabor: 0,
            mountingLabor: 0, otherCosts: 0, selectedMetals: []
        }
    });

    useEffect(() => {
        const fetchMetalPrices = async () => {
            try {
                const response = await fetch('/api/metal-prices');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) setMetalPrices(data.prices);
                }
            } catch (error) {
                console.error('Error fetching metal prices:', error);
            }
        };
        fetchMetalPrices();
    }, []);

    useEffect(() => {
        const fetchGemstones = async () => {
            try {
                const res = await fetch('/api/products/gemstones');
                if (res.ok) {
                    const data = await res.json();
                    setAvailableGemstones(data.gemstones || []);
                }
            } catch (e) {
                console.error("Failed to fetch gemstones", e);
            }
        };
        fetchGemstones();
    }, []);

    useEffect(() => {
        if (isNew) {
            if (session?.user) {
                setFormData(prev => ({
                    ...prev,
                    userId: session.user.id || session.user.email,
                    vendor: session.user.businessName || session.user.slug || session.user.name || 'Current Artisan'
                }));
            }
            return;
        }

        const fetchJewelry = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/products/jewelry/${jewelryId}`);
                if (!response.ok) throw new Error('Failed to fetch jewelry');
                const data = await response.json();
                const jewelry = data.jewelry || data;
                const jDetails = jewelry.jewelry || {};

                setFormData({
                    title: jewelry.title || '',
                    type: jDetails.type || '',
                    price: jewelry.price || '',
                    status: jewelry.status || 'draft',
                    availability: jewelry.availability || 'ready-to-ship',
                    classification: jewelry.classification || 'signature',
                    images: [],
                    existingImages: jewelry.images || [],
                    userId: jewelry.userId || session?.user?.id,
                    vendor: jewelry.vendor || '',
                    notes: jewelry.notes || '',
                    metals: jDetails.metals || [],
                    centerStones: jDetails.centerStones || [],
                    accentStones: jDetails.accentStones || [],
                    gemstoneLinks: jDetails.gemstoneLinks || [],
                    ringSize: jDetails.ringSize || '',
                    canBeSized: jDetails.canBeSized || false,
                    sizingRangeUp: jDetails.sizingRangeUp || '',
                    sizingRangeDown: jDetails.sizingRangeDown || '',
                    chainIncluded: jDetails.chainIncluded || false,
                    chainMaterial: jDetails.chainMaterial || '',
                    chainLength: jDetails.chainLength || '',
                    chainStyle: jDetails.chainStyle || '',
                    length: jDetails.length || '',
                    claspType: jDetails.claspType || '',
                    dimensions: jDetails.dimensions || '',
                    objFile: jDetails.objFile || null,
                    stlFile: jDetails.stlFile || null,
                    glbFile: jDetails.glbFile || null,
                    dynamicPricing: jDetails.dynamicPricing || {
                        enabled: false, stlVolume: 0, cadLabor: 0, productionLabor: 0,
                        mountingLabor: 0, otherCosts: 0, selectedMetals: []
                    }
                });

                setCadRequests(jewelry.cadRequests || []);
                setDesigns(jewelry.designs || []);
            } catch (err) {
                console.error('Error fetching jewelry:', err);
                setError('Failed to load jewelry details');
            } finally {
                setLoading(false);
            }
        };

        if (session?.user) fetchJewelry();
    }, [jewelryId, isNew, session]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files);
        const validImages = files.filter(file => file.type.startsWith('image/'));
        if (validImages.length > 0) {
            setFormData(prev => ({ ...prev, images: [...prev.images, ...validImages] }));
        }
    };

    const handleRemoveNewImage = (index) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const handleRemoveExistingImage = (index) => {
        setFormData(prev => ({ ...prev, existingImages: prev.existingImages.filter((_, i) => i !== index) }));
    };

    const handleFileUpload = async (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        if (isNew) {
            alert("Please save the jewelry item first before uploading 3D files.");
            return;
        }

        try {
            setSaving(true);
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('type', type);

            const res = await fetch(`/api/products/jewelry/${jewelryId}/files`, {
                method: 'POST',
                body: uploadFormData
            });

            if (!res.ok) throw new Error('Upload failed');
            
            const result = await res.json();
            setFormData(prev => ({ ...prev, [`${type}File`]: result.fileUrl }));
        } catch (e) {
            console.error(e);
            alert(`Failed to upload ${type.toUpperCase()} file`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFile = async (type) => {
        if (!confirm(`Delete ${type.toUpperCase()} file?`)) return;
        try {
            setSaving(true);
            setFormData(prev => ({ ...prev, [`${type}File`]: null }));
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (targetStatus) => {
        try {
            setSaving(true);
            setError('');

            const method = isNew ? 'POST' : 'PUT';
            const url = isNew ? '/api/products/jewelry' : `/api/products/jewelry/${jewelryId}`;
            
            const { 
                objFile, stlFile, glbFile, images, existingImages, 
                metals, centerStones, accentStones, gemstoneLinks,
                ringSize, canBeSized, sizingRangeUp, sizingRangeDown,
                chainIncluded, chainMaterial, chainLength, chainStyle,
                length, claspType, dimensions, classification, ...metadata 
            } = formData;
            
            const dataToSend = {
                ...metadata,
                status: targetStatus || formData.status,
                classification,
                images: existingImages,
                productId: !isNew ? jewelryId : undefined,
                metals, centerStones, accentStones, gemstoneLinks,
                ringSize, canBeSized, sizingRangeUp, sizingRangeDown,
                chainIncluded, chainMaterial, chainLength, chainStyle,
                length, claspType, dimensions,
                objFile: typeof objFile === 'string' ? objFile : undefined,
                stlFile: typeof stlFile === 'string' ? stlFile : undefined,
                glbFile: typeof glbFile === 'string' ? glbFile : undefined
            };

            const response = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save jewelry');

            const productId = result.productId || jewelryId;

            if (images && images.length > 0) {
                const imageFormData = new FormData();
                images.forEach(file => imageFormData.append('images', file));
                imageFormData.append('productId', productId);
                imageFormData.append('productType', 'jewelry');

                await fetch('/api/products/upload', {
                    method: 'POST', body: imageFormData,
                });
            }

            if (isNew) {
                router.push(`/dashboard/products/jewelry/${productId}`);
            } else {
                window.location.reload();
            }
        } catch (err) {
            console.error('Save error:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleOpenCadDialog = (request = null) => {
        if (request) {
            setEditingCadRequest(request);
            setCadFormData({
                mountingType: request.mountingDetails?.mountingType || '',
                styleDescription: request.mountingDetails?.styleDescription || '',
                ringSize: request.mountingDetails?.ringSize || '',
                specialRequests: request.mountingDetails?.specialRequests || '',
                assignedDesigner: request.assignedDesigner || ''
            });
        } else {
            setEditingCadRequest(null);
            setCadFormData({
                mountingType: '', styleDescription: '', ringSize: '',
                specialRequests: '', assignedDesigner: ''
            });
        }
        setCadDialogOpen(true);
    };

    const handleCloseCadDialog = () => {
        setCadDialogOpen(false);
        setEditingCadRequest(null);
    };

    return {
        formData, handleInputChange, loading, saving, error, isNew,
        availableGemstones, metalPrices, cadRequests, cadDialogOpen,
        editingCadRequest, handleImageUpload, handleRemoveNewImage,
        handleRemoveExistingImage, handleFileUpload, handleDeleteFile,
        handleSave, handleOpenCadDialog, handleCloseCadDialog
    };
};
