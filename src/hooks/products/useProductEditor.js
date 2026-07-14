import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EMPTY_EDITOR_FORM, editorFormToPayload, productToEditorForm } from '@/services/products/productEditorPayload';

export function useProductEditor(productId) {
    const router = useRouter();
    const isNew = productId === 'new';

    const [product, setProduct] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_EDITOR_FORM });
    const [savedForm, setSavedForm] = useState({ ...EMPTY_EDITOR_FORM });
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState('');
    const [saveError, setSaveError] = useState('');
    const [productImages, setProductImages] = useState([]);

    const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

    const loadProduct = useCallback(async () => {
        if (isNew) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/products/${productId}`);
            if (!res.ok) throw new Error('Failed to load product');
            const data = await res.json();
            const p = data.product || data;
            setProduct(p);

            const mapped = productToEditorForm(p);

            setForm(mapped);
            setSavedForm(mapped);
            setProductImages(p.images || []);
        } catch (err) {
            setSaveError(err.message);
        } finally {
            setLoading(false);
        }
    }, [productId, isNew]);

    useEffect(() => { loadProduct(); }, [loadProduct]);

    const refreshImages = useCallback(async () => {
        if (isNew) return;
        try {
            const res = await fetch(`/api/products/${productId}`);
            if (!res.ok) return;
            const data = await res.json();
            const p = data.product || data;
            setProductImages(p.images || []);
        } catch { /* silently ignore */ }
    }, [productId, isNew]);

    const handleChange = useCallback((field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const clearSaveError = useCallback(() => setSaveError(''), []);

    const handleSave = useCallback(async (action) => {
        setSaving(action);
        setSaveError('');

        try {
            if (!['gemstone', 'jewelry'].includes(form.productType)) {
                throw new Error('Choose Gemstone or Jewelry before saving this product.');
            }
            const payload = editorFormToPayload({
                ...form,
                status: action === 'archived' ? 'archived' : (isNew ? 'draft' : form.status),
            });

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

            const saved = await res.json();
            const savedId = String(saved?._id || saved?.product?._id || productId || '');
            let resolvedStatus = payload.status;

            if (action === 'publish') {
                const publish = await fetch(`/api/products/${savedId}/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}',
                });
                if (!publish.ok) {
                    const error = await publish.json().catch(() => ({}));
                    const details = Array.isArray(error.details) ? `: ${error.details.join(', ')}` : '';
                    throw new Error(`${error.error || 'Product saved, but publish failed'}${details}`);
                }
                resolvedStatus = 'published';
            }

            const nextForm = { ...form, status: resolvedStatus };
            setForm(nextForm);
            setSavedForm(nextForm);
            setSaving('saved');
            setTimeout(() => setSaving(''), 1200);
            if (isNew && savedId) router.replace(`/dashboard/products/${savedId}`);
        } catch (err) {
            setSaving('failed');
            setSaveError(err.message);
        }
    }, [form, productId, isNew, router]);

    return {
        form, product, loading, saving, saveError, isDirty,
        productImages, refreshImages,
        handleChange, handleSave, clearSaveError,
    };
}
