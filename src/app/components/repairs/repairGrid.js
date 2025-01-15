"use client";
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Card, CardContent, Pagination } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';

const RepairsGrid = ({ repairs, rowsPerPage = 6 }) => {
    const [page, setPage] = useState(1);
    const [filteredRepairs, setFilteredRepairs] = useState(repairs);

    useEffect(() => {
        setFilteredRepairs(repairs);
    }, [repairs]);

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    return (
        <Box>
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
                                        src={repair.picture}
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

            {/* Pagination */}
            <Pagination
                count={Math.ceil(filteredRepairs.length / rowsPerPage)}
                page={page}
                onChange={handlePageChange}
                sx={{ mt: 3 }}
            />
        </Box>
    );
};

RepairsGrid.propTypes = {
    repairs: PropTypes.array.isRequired,
    rowsPerPage: PropTypes.number
};

export default RepairsGrid;
