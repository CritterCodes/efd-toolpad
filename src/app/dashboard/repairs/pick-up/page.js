"use client";
import React, { use, useContext } from "react";
import { RepairsContext } from "@/app/context/repairs.context";
import { Box, Typography, Paper, Grid, Divider } from "@mui/material";
import { useRepairs } from "@/app/context/repairs.context";

const NeedsPickup = () => {
    const { repairs, setRepairs, loading } = useRepairs();

    // Filter repairs with NEEDS PICKUP status
    const needsPickupRepairs = repairs.filter((repair) => repair.status === "NEEDS PICKUP");

    // Group repairs by storeID
    const groupedRepairs = needsPickupRepairs.reduce((acc, repair) => {
        if (!acc[repair.storeID]) {
            acc[repair.storeID] = [];
        }
        acc[repair.storeID].push(repair);
        return acc;
    }, {});

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
                Needs Pickup
            </Typography>
            {Object.keys(groupedRepairs).length === 0 ? (
                <Typography>No repairs need pickup at this time.</Typography>
            ) : (
                Object.entries(groupedRepairs).map(([storeID, repairs]) => {
                    // Calculate total repairs and cost
                    const totalRepairs = repairs.length;
                    const totalCost = repairs.reduce((sum, repair) => sum + repair.totalCost, 0);

                    return (
                        <Paper
                            key={storeID}
                            elevation={3}
                            sx={{ mb: 3, p: 2, borderRadius: 2 }}
                        >
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="h6">
                                        Store: {repairs[0].storeName || "Unknown Store"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Store ID: {storeID}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="body1">
                                        Repairs to Pickup: {totalRepairs}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="body1">
                                        Total Cost: ${totalCost.toFixed(2)}
                                    </Typography>
                                </Grid>
                            </Grid>
                            <Divider sx={{ my: 2 }} />
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Repair Details:
                                </Typography>
                                {repairs.map((repair) => (
                                    <Typography key={repair.repairID} variant="body2">
                                        • {repair.description} (${repair.totalCost.toFixed(2)})
                                    </Typography>
                                ))}
                            </Box>
                        </Paper>
                    );
                })
            )}
        </Box>
    );
};

export default NeedsPickup;
