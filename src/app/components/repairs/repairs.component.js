"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Pagination from '@mui/material/Pagination';
import { PageContainer } from '@toolpad/core/PageContainer';
import NewRepairStepper from './newRepairStepper.component';
import Image from 'next/image';
import RepairFilters from './filters.component';

export default function RepairsPage() {
    const [repairs, setRepairs] = React.useState([]);
    const [filteredRepairs, setFilteredRepairs] = React.useState([]);
    const [open, setOpen] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [statusFilter, setStatusFilter] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [sortOrder, setSortOrder] = React.useState('newest');
    const rowsPerPage = 6;

    // ✅ Fetch repairs from the database
    const fetchRepairs = async () => {
        try {
            const response = await fetch(`/api/repairs`);
            const data = await response.json();
            setRepairs(data);
            setFilteredRepairs(data);
        } catch (error) {
            console.error("Failed to fetch repairs:", error);
        }
    };

    React.useEffect(() => {
        fetchRepairs();
    }, []);

    // ✅ Handle filters, search, and sorting
    React.useEffect(() => {
        let updatedRepairs = [...repairs];

        if (statusFilter) {
            updatedRepairs = updatedRepairs.filter(repair => repair.status === statusFilter);
        }

        if (searchQuery) {
            updatedRepairs = updatedRepairs.filter(repair =>
                repair.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                repair.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        updatedRepairs.sort((a, b) => {
            const dateA = new Date(a.promiseDate || a.createdAt);
            const dateB = new Date(b.promiseDate || b.createdAt);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        setFilteredRepairs(updatedRepairs);
    }, [statusFilter, searchQuery, repairs, sortOrder]);

    const handleAddRepair = async (newRepair) => {
        try {
            const response = await fetch('/api/repairs', {
                method: 'POST',
                body: newRepair,
            });
            if (response.ok) {
                fetchRepairs();
            }
        } catch (error) {
            console.error("Failed to add repair:", error);
        }
    };

    return (
        <PageContainer
            title="Repairs"
            breadcrumbs={[
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'Repairs', path: '/repairs' }
            ]}
        >
            {/* ✅ Extracted Filter Component */}
            <RepairFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                onOpenNewRepair={() => setOpen(true)}
            />

            {/* ✅ Display Repairs with Modern Cards */}
            <Box 
                sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: 3 
                }}
            >
                {filteredRepairs.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((repair) => (
                    <Card 
                        key={repair.repairID}
                        sx={{
                            borderRadius: '16px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            overflow: 'hidden',
                            transition: 'transform 0.2s ease-in-out',
                            '&:hover': {
                                transform: 'scale(1.02)',
                                boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                            }
                        }}
                    >
                        {repair.picture && (
                            <Image
                                src={repair.picture.startsWith('/') ? repair.picture : `/uploads/${repair.picture}`}
                                alt="Repair Image"
                                width={300}
                                height={200}
                                style={{ objectFit: 'cover', width: '100%', height: '200px' }}
                            />
                        )}
                        <CardContent>
                            <Typography variant="h6" fontWeight="600">
                                {repair.description}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary' }}>
                                <strong>Client:</strong> {repair.clientName}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary' }}>
                                <strong>Due Date:</strong> {repair.promiseDate || 'N/A'}
                            </Typography>
                            <Typography 
                                sx={{
                                    mt: 2, 
                                    fontSize: '0.875rem', 
                                    color: repair.status === "COMPLETED" ? 'green' : 
                                           repair.status === "RECEIVED" ? 'orange' : 
                                           'blue',
                                    fontWeight: 'bold'
                                }}
                            >
                                {repair.status}
                            </Typography>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* ✅ Pagination Controls */}
            <Pagination
                count={Math.ceil(filteredRepairs.length / rowsPerPage)}
                page={page}
                onChange={(event, value) => setPage(value)}
                sx={{ mt: 3 }}
            />

            {/* ✅ New Repair Stepper */}
            <NewRepairStepper
                open={open}
                onClose={() => setOpen(false)}
                onSubmit={handleAddRepair}
            />
        </PageContainer>
    );
}

RepairsPage.propTypes = {
    pathname: PropTypes.string,
};
