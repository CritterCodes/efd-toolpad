
"use client";
import * as React from "react";
import { Container, Typography, Box, TextField, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import useCadDesign from "@/hooks/products/useCadDesign";
import CadDesignList from "./components/CadDesignList";

export default function CADDesignPage() {
    const { 
        requests, users, loading, error,
        statusFilter, setStatusFilter, priorityFilter, setPriorityFilter,
        searchQuery, setSearchQuery 
    } = useCadDesign();

    if (loading) return <Container><Typography>Loading...</Typography></Container>;
    if (error) return <Container><Typography color="error">{error}</Typography></Container>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>CAD Design Management</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField 
                    label="Search" variant="outlined" size="small"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="PENDING">Pending</MenuItem>
                        <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                        <MenuItem value="COMPLETED">Completed</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Priority</InputLabel>
                    <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="LOW">Low</MenuItem>
                        <MenuItem value="MEDIUM">Medium</MenuItem>
                        <MenuItem value="HIGH">High</MenuItem>
                    </Select>
                </FormControl>
            </Box>
            <CadDesignList requests={requests} users={users} />
        </Container>
    );
}
