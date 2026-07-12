import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const EMPTY_FORM = {
    title: '', description: '', sku: '', productType: 'gemstone',
    species: '', variety: '', cut: '', dimensions: '', carat: '', color: '', clarity: '', origin: '', treatment: '', certNumber: '', certFile: '',
    jewelryCategory: '', size: '', metalType: '', karat: '', metalWeight: '', linkedGemstones: '', findings: '', hallmark: '',
    costBasis: '', laborHours: '', laborRate: '', markupPct: '', salePrice: '', compareAtPrice: '',
    handle: '', metaTitle: '', metaDescription: '', tags: '',
    status: 'draft',
    channels: [],
    artisan: '', collections: [], vendor: '',
    onHandQty: '', location: '', continueSelling: false,
    weight: '', shippingClass: '',
    related: [],
};

export function useProductEditor(productId) {
    const { data: session } = useSession();
    const isNew = productId === 'new';

    const [product, setProduct] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [savedForm, setSavedForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState('');
    const [saveError, setSaveError] = useState('');
    const [images, setImages] = useState([]);
    const [imageUrls, setImageUrls] = useState([]);

    const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

    useEffect(() => {
        if (isNew) return;

        const load = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/products/${productId}`);
                if (!res.ok) throw new Error('Failed to load product');
                const data = await res.json();
                const p = data.product || data;
                setProduct(p);

                const gem = p.gemstone || {};
                const jew = p.jewelry || {};
                const pricing = p.pricing || {};
                const seo = p.seo || {};
                const inventory = p.inventory || {};
                const fulfillment = p.fulfillment || {};

                const mapped = {
                    title: p.title || '',
                    description: p.description || '',
                    sku: p.sku || '',
                    productType: p.productType || 'gemstone',
                    species: gem.species || p.species || '',
                    variety: gem.variety || p.variety || '',
                    cut: gem.cut || p.cut || '',
                    dimensions: gem.dimensions || p.dimensions || '',
                    carat: gem.carat || p.carat || '',
                    color: gem.color || p.color || '',
                    clarity: gem.clarity || p.clarity || '',
                    origin: gem.origin || p.origin || '',
                    treatment: gem.treatment || p.treatment || '',
                    certNumber: gem.certNumber || p.certNumber || '',
                    certFile: gem.certFile || p.certFile || '',
                    jewelryCategory: jew.jewelryCategory || p.jewelryCategory || '',
                    size: jew.size || p.size || '',
                    metalType: jew.metalType || p.metalType || '',
                    karat: jew.karat || p.karat || '',
                    metalWeight: jew.metalWeight || p.metalWeight || '',
                    linkedGemstones: jew.linkedGemstones || p.linkedGemstones || '',
                    findings: jew.findings || p.findings || '',
                    hallmark: jew.hallmark || p.hallmark || '',
                    costBasis: pricing.costBasis || p.costBasis || '',
                    laborHours: pricing.laborHours || p.laborHours || '',
                    laborRate: pricing.laborRate || p.laborRate || '',
                    markupPct: pricing.markupPct || p.markupPct || '',
                    salePrice: pricing.salePrice || p.salePrice || p.price || '',
                    compareAtPrice: pricing.compareAtPrice || p.compareAtPrice || '',
                    handle: seo.handle || p.handle || '',
                    metaTitle: seo.metaTitle || p.metaTitle || '',
                    metaDescription: seo.metaDescription || p.metaDescription || '',
                    tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
                    status: p.status || 'draft',
                    channels: p.channels || [],
                    artisan: p.artisan || p.userId || '',
                    collections: p.collections || [],
                    vendor: p.vendor || '',
                    onHandQty: inventory.onHandQty !== undefined ? inventory.onHandQty : (p.onHandQty || ''),
                    location: inventory.location || p.location || '',
                    continueSelling: inventory.continueSelling || p.continueSelling || false,
                    weight: fulfillment.weight || p.weight || '',
                    shippingClass: fulfillment.shippingClass || p.shippingClass || '',
                    related: p.related || [],
                    updatedAt: p.updatedAt || '',
                    createdAt: p.createdAt || '',
                };

                setForm(mapped);
                setSavedForm(mapped);
                setImageUrls(p.images || []);
            } catch (err) {
                setSaveError(err.message);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [productId, isNew]);

    const handleChange = useCallback((field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSave = useCallback(async (targetStatus) => {
        setSaving(targetStatus);
        setSaveError('');

        try {
            let finalImageUrls = [...imageUrls];

            if (images.length > 0) {
                const fd = new FormData();
                images.forEach(f => fd.append('images', f));
                fd.append('productId', productId);
                const upRes = await fetch('/api/products/upload', { method: 'POST', body: fd });
                if (upRes.ok) {
                    const upData = await upRes.json();
                    const newUrls = upData.urls || upData.imageUrls || [];
                    finalImageUrls = [...finalImageUrls, ...newUrls];
                    setImageUrls(finalImageUrls);
                    setImages([]);
                }
            }

            const resolvedStatus =
                targetStatus === 'publish' ? 'active'
                : targetStatus === 'archived' ? 'archived'
                : form.status === 'archived' ? 'archived'
                : 'draft';

            const payload = {
                ...form,
                status: resolvedStatus,
                imageUrls: finalImageUrls,
            };

            const url = isNew ? '/api/products' : `/api/products/${productId}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }

            setSavedForm({ ...form });
            setSaving('');
        } catch (err) {
            setSaving('failed');
            setSaveError(err.message);
        }
    }, [form, images, imageUrls, productId, isNew]);

    const handleImageAdd = useCallback((files) => {
        const arr = Array.from(files);
        setImages(prev => [...prev, ...arr]);
    }, []);

    const handleImageRemove = useCallback((index) => {
        if (index < imageUrls.length) {
            setImageUrls(prev => prev.filter((_, i) => i !== index));
        } else {
            const pendingIdx = index - imageUrls.length;
            setImages(prev => prev.filter((_, i) => i !== pendingIdx));
        }
    }, [imageUrls.length]);

    const handleImageReorder = useCallback((fromIdx, toIdx) => {
        setImageUrls(prev => {
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
        });
    }, []);

    return {
        form, product, loading, saving, saveError, isDirty,
        images, imageUrls,
        handleChange, handleSave,
        handleImageAdd, handleImageRemove, handleImageReorder,
    };
}
