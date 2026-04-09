'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export const useAwaitingApproval = () => {
    const { data: session } = useSession();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    
    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [artisanFilter, setArtisanFilter] = useState('all');

    // Dialog states
    const [approvalDialog, setApprovalDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [approvalAction, setApprovalAction] = useState(null);
    
    // Detail view state
    const [detailView, setDetailView] = useState(false);
    const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);

    // Load products awaiting approval
    useEffect(() => {
        loadProducts();
    }, []);

    // Apply filters
    useEffect(() => {
        let filtered = products;
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.title?.toLowerCase().includes(query) ||
                p.artisanInfo?.businessName?.toLowerCase().includes(query) ||
                p.artisanInfo?.name?.toLowerCase().includes(query)
            );
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.designInfo?.status === statusFilter);
        }
        
        // Artisan filter
        if (artisanFilter !== 'all') {
            filtered = filtered.filter(p => p.artisanInfo?._id === artisanFilter);
        }
        
        setFilteredProducts(filtered);
        setPage(0); // Reset to first page
    }, [products, searchQuery, statusFilter, artisanFilter]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/products/awaiting-approval');

            if (!response.ok) {
                throw new Error('Failed to load products');
            }

            const data = await response.json();
            setProducts(data.products || []);
            setError('');
        } catch (err) {
            console.error('❌ Error loading products:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprovalClick = (product, action) => {
        setSelectedProduct(product);
        setApprovalAction(action);
        setApprovalNotes('');
        setApprovalDialog(true);
    };

    const handleSubmitApproval = async () => {
        if (!selectedProduct) return;

        try {
            setActionLoading(true);
            const endpoint = approvalAction === 'approve'
                ? `/api/products/${selectedProduct._id}/approve`
                : `/api/products/${selectedProduct._id}/reject`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: approvalNotes.trim() || undefined,
                    approvedBy: session?.user?.userID
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${approvalAction} product`);
            }

            const responseData = await response.json();
            
            // If approved, also publish the product automatically
            if (approvalAction === 'approve' && responseData.product) {
                const publishResponse = await fetch(`/api/products/${selectedProduct._id}/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notes: 'Published automatically after admin approval'
                    })
                });

                if (!publishResponse.ok) {
                    console.warn('⚠️ Product approved but publish failed:', await publishResponse.json());
                }
            }

            // Reload products list
            await loadProducts();
            setApprovalDialog(false);
            setSelectedProduct(null);
            setApprovalNotes('');
        } catch (err) {
            console.error('❌ Approval error:', err);
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const getUniqueArtisans = () => {
        const artisans = {};
        products.forEach(p => {
            if (p.artisanInfo?._id) {
                artisans[p.artisanInfo._id] = p.artisanInfo.businessName || p.artisanInfo.name;
            }
        });
        return artisans;
    };

    const getUniqueStatuses = () => {
        const statuses = new Set();
        products.forEach(p => {
            if (p.designInfo?.status) {
                statuses.add(p.designInfo.status);
            }
        });
        return Array.from(statuses);
    };

    const paginatedProducts = filteredProducts.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return {
        session,
        products,
        filteredProducts,
        loading,
        error,
        setError,
        actionLoading,
        page,
        rowsPerPage,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        artisanFilter,
        setArtisanFilter,
        approvalDialog,
        setApprovalDialog,
        selectedProduct,
        approvalNotes,
        setApprovalNotes,
        approvalAction,
        detailView,
        setDetailView,
        selectedDetailProduct,
        setSelectedDetailProduct,
        handleApprovalClick,
        handleSubmitApproval,
        getUniqueArtisans,
        getUniqueStatuses,
        paginatedProducts,
        handleChangePage,
        handleChangeRowsPerPage
    };
};
