import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export const useJewelryData = (jewelryId) => {
    const { data: session } = useSession();
    const isNew = jewelryId === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [error, setError] = useState('');
    const [availableGemstones, setAvailableGemstones] = useState([]);
    const [metalPrices, setMetalPrices] = useState(null);

    const [cadRequests, setCadRequests] = useState([]);
    const [designs, setDesigns] = useState([]);

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

    return { 
        isNew, session, formData, setFormData, 
        loading, setLoading, error, setError, 
        availableGemstones, metalPrices, 
        cadRequests, setCadRequests, designs, setDesigns 
    };
};
