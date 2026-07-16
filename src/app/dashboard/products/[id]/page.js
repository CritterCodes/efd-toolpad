'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Grid, Alert, Skeleton, CircularProgress, Card, CardContent } from '@mui/material';
import { useProductEditor } from '@/hooks/products/useProductEditor';
import ProductTopBar from './components/ProductTopBar';
import ProductBasicInfo from './components/ProductBasicInfo';
import ProductMediaPanel from './components/ProductMediaPanel';
import GemstoneTypePanel from './components/GemstoneTypePanel';
import JewelryTypePanel from './components/JewelryTypePanel';
import ProductPricingPanel from './components/ProductPricingPanel';
import ProductSeoPanel from './components/ProductSeoPanel';
import ProductStatusRail from './components/ProductStatusRail';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { editorFormToPayload, productToEditorForm } from '@/services/products/productEditorPayload';

function LeftSkeleton() {
    return (
        <Box>
            {[120, 200, 180, 140, 100].map((h, i) => (
                <Skeleton key={i} variant="rectangular" height={h} sx={{ mb: 2, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }} />
            ))}
        </Box>
    );
}

function RightSkeleton() {
    return (
        <Box>
            {[150, 80, 80, 80].map((h, i) => (
                <Skeleton key={i} variant="rectangular" height={h} sx={{ mb: 1, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }} />
            ))}
        </Box>
    );
}

export default function ProductEditorPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params?.id;

    const {
        form, product, loading, saving, saveError, isDirty,
        productImages, refreshImages,
        handleChange, handleSave, clearSaveError,
    } = useProductEditor(productId);

    useEffect(() => {
        if (!isDirty) return;
        const handler = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const handleBack = () => {
        if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
        router.push('/dashboard/products');
    };

    const handleArchive = async () => {
        if (!window.confirm('Archive this product?')) return;
        if (!productId || productId === 'new') return;
        const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (res.ok) router.push('/dashboard/products');
    };

    const handleDelete = async () => {
        if (!productId || productId === 'new') return;
        if (!window.confirm('Remove this product from the active catalog? The product will be archived.')) return;
        const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (res.ok) router.push('/dashboard/products');
    };

    const handleDuplicate = async () => {
        if (!productId || productId === 'new') return;
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) return;
        const data = await res.json();
        const src = data.product || data;
        const payload = editorFormToPayload({
            ...productToEditorForm(src), title: `${src.title} (copy)`, status: 'draft',
        });
        const cr = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (cr.ok) {
            const created = await cr.json();
            const newId = created._id || created.product?._id || created.productId;
            if (newId) router.push(`/dashboard/products/${newId}`);
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}><LeftSkeleton /></Grid>
                    <Grid item xs={12} md={4}><RightSkeleton /></Grid>
                </Grid>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 6, minHeight: '100vh', backgroundColor: REPAIRS_UI.bgPrimary }}>
            <ProductTopBar
                title={form.title}
                isNew={productId === 'new'}
                isDirty={isDirty}
                saving={saving}
                onBack={handleBack}
                onSaveDraft={() => handleSave('draft')}
                onPublish={() => handleSave('publish')}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDelete={handleDelete}
            />

            <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                {saveError && (
                    <Alert severity="error" sx={{ mb: 2, backgroundColor: '#4A1D1D', color: '#F8BBBB', border: '1px solid #7A2E2E' }} onClose={clearSaveError}>
                        {saveError}
                    </Alert>
                )}

                <Grid container spacing={3} alignItems="flex-start">
                    <Grid item xs={12} md={8}>
                        <ProductBasicInfo form={form} onChange={handleChange} />

                        <Card sx={{ mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                            <CardContent>
                                <ProductMediaPanel
                                    productId={productId}
                                    images={productImages}
                                    onChanged={refreshImages}
                                    productType={form.productType}
                                    salesMedia={product?.salesMedia}
                                />
                            </CardContent>
                        </Card>

                        {form.productType === 'gemstone' ? (
                            <GemstoneTypePanel form={form} onChange={handleChange} productId={productId} />
                        ) : (
                            <JewelryTypePanel form={form} onChange={handleChange} />
                        )}

                        <ProductPricingPanel form={form} onChange={handleChange} />
                        <ProductSeoPanel form={form} onChange={handleChange} />
                    </Grid>

                    <Grid
                        item xs={12} md={4}
                        sx={{ position: { md: 'sticky' }, top: { md: 72 } }}
                    >
                        <ProductStatusRail form={form} onChange={handleChange} />
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}
