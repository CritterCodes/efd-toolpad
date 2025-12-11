'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getStatusDisplayName } from '@/lib/statusMapping';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Grid,
    Button,
    Chip,
    Paper,
    IconButton,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    CircularProgress,
    Alert,
    Pagination,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Search as SearchIcon,
    Diamond as DiamondIcon
} from '@mui/icons-material';

export default function GemstonesPage() {
    const { data: session } = useSession();
    const router = useRouter();
    
    const [gemstones, setGemstones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12); // Increased to 12 for better grid view
    
    // Filtering and sorting state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSpecies, setFilterSpecies] = useState('');
    const [sortBy, setSortBy] = useState('date'); // Default to newest
    const [sortOrder, setSortOrder] = useState('desc');

    // Fetch gemstones from API
    useEffect(() => {
        fetchGemstones();
    }, []);

    const fetchGemstones = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/products/gemstones');
            if (!response.ok) {
                throw new Error('Failed to fetch gemstones');
            }
            const data = await response.json();
            setGemstones(data.gemstones || []);
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGemstone = async (gemstoneId) => {
        if (!confirm('Are you sure you want to delete this gemstone?')) {
            return;
        }

        try {
            const response = await fetch(`/api/products/gemstones?id=${gemstoneId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete gemstone');
            }

            await fetchGemstones(); // Refresh the list
        } catch (err) {
            console.error('Delete error:', err);
            setError(err.message);
        }
    };

    // Filter and sort gemstones
    const getFilteredAndSortedGemstones = () => {
        let filtered = gemstones.filter(gem => {
            const title = (gem.title || '').toLowerCase();
            const species = ((gem.gemstone?.species) || (gem.species) || '').toLowerCase();
            const subspecies = ((gem.gemstone?.subspecies) || (gem.subspecies) || '').toLowerCase();
            const query = searchQuery.toLowerCase();

            // Search by title, species, or subspecies
            const matchesSearch = !query || title.includes(query) || species.includes(query) || subspecies.includes(query);

            // Filter by species if selected
            const matchesSpecies = !filterSpecies || species === filterSpecies.toLowerCase();

            return matchesSearch && matchesSpecies;
        });

        // Sort gemstones
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'title':
                    aValue = (a.title || '').toLowerCase();
                    bValue = (b.title || '').toLowerCase();
                    break;
                case 'species':
                    aValue = ((a.gemstone?.species) || (a.species) || '').toLowerCase();
                    bValue = ((b.gemstone?.species) || (b.species) || '').toLowerCase();
                    break;
                case 'carat':
                    aValue = Number(a.gemstone?.carat || a.carat || 0);
                    bValue = Number(b.gemstone?.carat || b.carat || 0);
                    break;
                case 'price':
                    aValue = Number(a.gemstone?.retailPrice || a.retailPrice || 0);
                    bValue = Number(b.gemstone?.retailPrice || b.retailPrice || 0);
                    break;
                case 'date':
                    aValue = new Date(a.createdAt || 0).getTime();
                    bValue = new Date(b.createdAt || 0).getTime();
                    break;
                default:
                    aValue = a.title;
                    bValue = b.title;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    };

    const filteredGemstones = getFilteredAndSortedGemstones();
    const uniqueSpecies = [...new Set(gemstones.map(g => (g.gemstone?.species) || (g.species) || '').filter(Boolean))].sort();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button variant="contained" onClick={fetchGemstones}>
                    Retry
                </Button>
            </Box>
        );
    }

     return (
         <Box sx={{ p: 3 }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                 <Box>
                     <Typography variant="h4" gutterBottom>
                         Gemstones
                     </Typography>
                     <Typography variant="subtitle1" color="text.secondary">
                         Your personal gemstone inventory
                     </Typography>
                 </Box>
                 <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => router.push('/dashboard/products/gemstones/new')}
                 >
                     Add Gemstone
                 </Button>
             </Box>

             <Grid container spacing={3} sx={{ mb: 4 }}>
                 <Grid item xs={12} sm={6} md={3}>
                     <Card>
                         <CardContent>
                             <Typography color="text.secondary" gutterBottom>
                                 Total Gemstones
                             </Typography>
                             <Typography variant="h4">{gemstones.length}</Typography>
                         </CardContent>
                     </Card>
                 </Grid>
                 <Grid item xs={12} sm={6} md={3}>
                     <Card>
                         <CardContent>
                             <Typography color="text.secondary" gutterBottom>
                                 Available
                             </Typography>
                             <Typography variant="h4" color="success.main">
                                 {gemstones.filter((g) => g.status === 'active' || g.status === 'Available').length}
                             </Typography>
                         </CardContent>
                     </Card>
                 </Grid>
                 <Grid item xs={12} sm={6} md={3}>
                     <Card>
                         <CardContent>
                             <Typography color="text.secondary" gutterBottom>
                                 Total Value
                             </Typography>
                             <Typography variant="h4">
                                 ${gemstones.reduce((sum, g) => sum + (Number(g.gemstone?.retailPrice || g.price) || 0), 0).toLocaleString()}
                             </Typography>
                         </CardContent>
                     </Card>
                 </Grid>
                 <Grid item xs={12} sm={6} md={3}>
                     <Card>
                         <CardContent>
                             <Typography color="text.secondary" gutterBottom>
                                 Avg. Carat
                             </Typography>
                             <Typography variant="h4">
                                 {gemstones.length > 0 
                                     ? (gemstones.reduce((sum, g) => sum + (Number(g.gemstone?.carat || g.carat) || 0), 0) / gemstones.length).toFixed(1)
                                     : '0.0'
                                 }ct
                             </Typography>
                         </CardContent>
                     </Card>
                 </Grid>
             </Grid>

             <Card>
                 <CardContent>
                     <Typography variant="h6" gutterBottom>
                         Your Gemstones
                     </Typography>
                     {gemstones.length === 0 ? (
                         <Box sx={{ textAlign: 'center', py: 4 }}>
                             <Typography variant="h6" color="text.secondary" gutterBottom>
                                 No gemstones added yet
                             </Typography>
                             <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                 Add your first gemstone to start building your collection.
                             </Typography>
                             <Button 
                                 variant="contained" 
                                 startIcon={<AddIcon />} 
                                 onClick={() => router.push('/dashboard/products/gemstones/new')}
                             >
                                 Add Your First Gemstone
                             </Button>
                         </Box>
                     ) : (
                         <>
                             {/* Search and Filter Bar */}
                             <Paper sx={{ p: 2.5, mb: 3, backgroundColor: '#f8f9fa' }}>
                                 <Grid container spacing={2} alignItems="center">
                                     <Grid item xs={12} sm={6} md={4}>
                                         <TextField
                                             fullWidth
                                             size="small"
                                             placeholder="Search by title, species..."
                                             value={searchQuery}
                                             onChange={(e) => {
                                                 setSearchQuery(e.target.value);
                                                 setCurrentPage(1);
                                             }}
                                             InputProps={{
                                                 startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                             }}
                                             variant="outlined"
                                         />
                                     </Grid>
                                     <Grid item xs={12} sm={6} md={3}>
                                         <FormControl fullWidth size="small">
                                             <InputLabel>Species</InputLabel>
                                             <Select
                                                 value={filterSpecies}
                                                 label="Species"
                                                 onChange={(e) => {
                                                     setFilterSpecies(e.target.value);
                                                     setCurrentPage(1);
                                                 }}
                                             >
                                                 <MenuItem value="">All Species</MenuItem>
                                                 {uniqueSpecies.map(species => (
                                                     <MenuItem key={species} value={species}>
                                                         {species}
                                                     </MenuItem>
                                                 ))}
                                             </Select>
                                         </FormControl>
                                     </Grid>
                                     <Grid item xs={12} sm={6} md={2.5}>
                                         <FormControl fullWidth size="small">
                                             <InputLabel>Sort By</InputLabel>
                                             <Select
                                                 value={sortBy}
                                                 label="Sort By"
                                                 onChange={(e) => setSortBy(e.target.value)}
                                             >
                                                 <MenuItem value="title">Title</MenuItem>
                                                 <MenuItem value="species">Species</MenuItem>
                                                 <MenuItem value="carat">Carat Weight</MenuItem>
                                                 <MenuItem value="price">Price</MenuItem>
                                                 <MenuItem value="date">Date Created</MenuItem>
                                             </Select>
                                         </FormControl>
                                     </Grid>
                                     <Grid item xs={12} sm={6} md={2.5}>
                                         <FormControl fullWidth size="small">
                                             <InputLabel>Order</InputLabel>
                                             <Select
                                                 value={sortOrder}
                                                 label="Order"
                                                 onChange={(e) => setSortOrder(e.target.value)}
                                             >
                                                 <MenuItem value="asc">Ascending</MenuItem>
                                                 <MenuItem value="desc">Descending</MenuItem>
                                             </Select>
                                         </FormControl>
                                     </Grid>
                                 </Grid>
                                 <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                     Showing {filteredGemstones.length} of {gemstones.length} gemstones
                                 </Typography>
                             </Paper>

                             {/* Gemstone Cards Grid */}
                             {filteredGemstones.length === 0 ? (
                                 <Paper sx={{ p: 4, textAlign: 'center' }}>
                                     <DiamondIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                     <Typography variant="h6" color="text.secondary" gutterBottom>
                                         No gemstones found
                                     </Typography>
                                     <Typography variant="body2" color="text.secondary">
                                         {searchQuery || filterSpecies ? 'Try adjusting your filters' : 'Start by adding your first gemstone'}
                                     </Typography>
                                 </Paper>
                             ) : (
                                 <>
                                     <Grid container spacing={2.5} sx={{ mb: 3 }}>
                                         {filteredGemstones
                                             .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                             .map((gemstone) => (
                                             <Grid item xs={12} sm={6} md={4} lg={3} key={gemstone.productId || gemstone.id}>
                                                 <Card 
                                                     sx={{ 
                                                         height: '100%', 
                                                         display: 'flex', 
                                                         flexDirection: 'column',
                                                         transition: 'all 0.3s ease',
                                                         '&:hover': {
                                                             transform: 'translateY(-4px)',
                                                             boxShadow: 4
                                                         },
                                                         cursor: 'pointer'
                                                     }}
                                                     onClick={() => router.push(`/dashboard/products/gemstones/${gemstone.productId || gemstone.id}`)}
                                                 >
                                                     {/* Image Area */}
                                                     <CardMedia
                                                         component="div"
                                                         sx={{
                                                             height: 160,
                                                             background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             justifyContent: 'center',
                                                             position: 'relative',
                                                             overflow: 'hidden'
                                                         }}
                                                     >
                                                         {gemstone.images && gemstone.images.length > 0 ? (
                                                             <img 
                                                                 src={gemstone.images[0]} 
                                                                 alt={gemstone.title}
                                                                 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                             />
                                                         ) : (
                                                             <DiamondIcon sx={{ fontSize: 60, color: 'rgba(255,255,255,0.3)' }} />
                                                         )}
                                                         
                                                         {/* Status Badge */}
                                                         <Box
                                                             sx={{
                                                                 position: 'absolute',
                                                                 top: 8,
                                                                 right: 8,
                                                                 backgroundColor: 'rgba(0,0,0,0.6)',
                                                                 color: 'white',
                                                                 px: 1.5,
                                                                 py: 0.5,
                                                                 borderRadius: 1,
                                                                 fontSize: '0.75rem',
                                                                 fontWeight: 'bold'
                                                             }}
                                                         >
                                                             {getStatusDisplayName(gemstone.status) || 'Active'}
                                                         </Box>
                                                     </CardMedia>

                                                     <CardContent sx={{ flexGrow: 1 }}>
                                                         {/* Title */}
                                                         <Typography 
                                                             variant="h6" 
                                                             component="h2" 
                                                             gutterBottom
                                                             sx={{ 
                                                                 fontWeight: 'bold',
                                                                 overflow: 'hidden',
                                                                 textOverflow: 'ellipsis',
                                                                 whiteSpace: 'nowrap'
                                                             }}
                                                         >
                                                             {gemstone.title || 'Untitled Gemstone'}
                                                         </Typography>

                                                         {/* Species and Subspecies */}
                                                         <Typography variant="body2" color="text.secondary" gutterBottom>
                                                             <strong>{((gemstone.gemstone?.species) || (gemstone.species)) || 'Unknown'}</strong>
                                                             {((gemstone.gemstone?.subspecies) || (gemstone.subspecies)) && (
                                                                 <> - {((gemstone.gemstone?.subspecies) || (gemstone.subspecies))}</>
                                                             )}
                                                         </Typography>

                                                         {/* Key Properties */}
                                                         <Box sx={{ my: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                             {(gemstone.gemstone?.carat || gemstone.carat) && (
                                                                 <Chip 
                                                                     label={`${gemstone.gemstone?.carat || gemstone.carat}ct`}
                                                                     size="small"
                                                                     color="primary"
                                                                     variant="outlined"
                                                                 />
                                                             )}
                                                             <Chip 
                                                                 label={((gemstone.gemstone?.naturalSynthetic) || (gemstone.naturalSynthetic)) === 'natural' ? 'Natural' : 'Synthetic'}
                                                                 size="small"
                                                                 color={((gemstone.gemstone?.naturalSynthetic) || (gemstone.naturalSynthetic)) === 'natural' ? 'success' : 'info'}
                                                             />
                                                         </Box>

                                                         {/* Price */}
                                                         {((gemstone.gemstone?.retailPrice) || (gemstone.retailPrice)) && (
                                                             <Typography 
                                                                 variant="h6" 
                                                                 color="primary" 
                                                                 sx={{ 
                                                                     mt: 2,
                                                                     fontWeight: 'bold',
                                                                     fontSize: '1.1rem'
                                                                 }}
                                                             >
                                                                 ${(((gemstone.gemstone?.retailPrice) || (gemstone.retailPrice)) || 0).toLocaleString()}
                                                             </Typography>
                                                         )}
                                                     </CardContent>

                                                     {/* Actions */}
                                                     <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
                                                         <Tooltip title="Delete">
                                                             <IconButton 
                                                                 size="small" 
                                                                 color="error" 
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     handleDeleteGemstone(gemstone.productId || gemstone.id);
                                                                 }}
                                                             >
                                                                 <DeleteIcon fontSize="small" />
                                                             </IconButton>
                                                         </Tooltip>
                                                     </CardActions>
                                                 </Card>
                                             </Grid>
                                         ))}
                                     </Grid>

                                     {/* Pagination */}
                                     {Math.ceil(filteredGemstones.length / itemsPerPage) > 1 && (
                                         <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                             <Pagination
                                                 count={Math.ceil(filteredGemstones.length / itemsPerPage)}
                                                 page={currentPage}
                                                 onChange={(event, page) => {
                                                     setCurrentPage(page);
                                                     window.scrollTo({ top: 0, behavior: 'smooth' });
                                                 }}
                                                 color="primary"
                                                 size="large"
                                             />
                                         </Box>
                                     )}
                                 </>
                             )}
                         </>
                     )}
                 </CardContent>
             </Card>
         </Box>
     );
}
