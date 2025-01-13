"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Pagination from '@mui/material/Pagination';
import { PageContainer } from '@toolpad/core/PageContainer';
import NewRepairStepper from '@/app/components/repairs/newRepairStepper.component';
import Image from 'next/image';
import RepairFilters from '@/app/components/repairs/filters.component';
import { useRepairs } from '@/app/context/repairs.context';
import Link from 'next/link';
import Button from '@mui/material/Button';

export default function RepairsPage() {
    const { repairs, loading, setRepairs } = useRepairs();
    const router = useRouter();  // ✅ Import and Initialize Router
    const [filteredRepairs, setFilteredRepairs] = React.useState([]);
    const [open, setOpen] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [statusFilter, setStatusFilter] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [sortOrder, setSortOrder] = React.useState('newest');
    const rowsPerPage = 6;

    // ✅ Sync repairs with filtered repairs
    React.useEffect(() => {
        if (!loading) {
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
        }
    }, [statusFilter, searchQuery, repairs, sortOrder, loading]);

    return (
        <PageContainer
            title="Repairs"
            breadcrumbs={[
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'Repairs', path: '/repairs' }
            ]}
        >
            <RepairFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                onOpenNewRepair={() => setOpen(true)}
            />

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 3
                }}
            >
                {filteredRepairs
                    .slice((page - 1) * rowsPerPage, page * rowsPerPage)
                    .map((repair) => (
                        <Link href={`/dashboard/repairs/${repair.repairID}`} key={repair.repairID} passHref>
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
                                                repair.status === "RECEIVING" ? 'orange' :
                                                    'blue',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {repair.status}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
            </Box>

            <Pagination
                count={Math.ceil(filteredRepairs.length / rowsPerPage)}
                page={page}
                onChange={(event, value) => setPage(value)}
                sx={{ mt: 3 }}
            />

            <NewRepairStepper
                open={open}
                onClose={() => setOpen(false)}
                onSubmit={(newRepair) => {
                    setRepairs((prevRepairs) => [...prevRepairs, newRepair]);
                    setFilteredRepairs((prevFiltered) => [...prevFiltered, newRepair]);
                }}
            />
        </PageContainer>
    );
}

RepairsPage.propTypes = {
    pathname: PropTypes.string,
};
