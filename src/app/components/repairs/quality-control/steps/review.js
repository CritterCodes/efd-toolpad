import React from 'react';
import { Typography, Box, Divider, List, ListItem, ListItemText } from "@mui/material";

const QCFinalStep = ({ repair, checklist, notes, qcPicture }) => {
    return (
        <Box
            sx={{
                mt: 2,
                padding: "16px",
                borderRadius: "12px",
                boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
                textAlign: "center"
            }}
        >
            <Typography variant="h6" fontWeight="bold" gutterBottom>
                Final Review Summary
            </Typography>

            <Divider sx={{ mb: 2 }} />

            {/* ✅ Repair Information */}
            <List>
                <ListItem>
                    <ListItemText
                        primary="Client Name"
                        secondary={repair.clientName || "N/A"}
                    />
                </ListItem>
                <ListItem>
                    <ListItemText
                        primary="Repair ID"
                        secondary={repair.repairID || "N/A"}
                    />
                </ListItem>
                <ListItem>
                    <ListItemText
                        primary="Notes"
                        secondary={notes || "No notes provided."}
                    />
                </ListItem>
            </List>

            <Divider sx={{ mt: 2, mb: 2 }} />

            {/* ✅ Checklist Summary */}
            <Typography variant="h6" fontWeight="bold">
                Quality Control Checklist
            </Typography>
            <List>
                {Object.entries(checklist).map(([key, value]) => (
                    <ListItem key={key}>
                        <ListItemText
                            primary={key.replace(/([A-Z])/g, ' $1')}
                            secondary={value ? "✅ Passed" : "❌ Failed"}
                        />
                    </ListItem>
                ))}
            </List>

            {/* ✅ Image Preview */}
            {qcPicture && (
                <>
                    <Divider sx={{ mt: 2, mb: 2 }} />
                    <Typography variant="h6" fontWeight="bold">
                        QC Picture Preview
                    </Typography>
                    <Box
                        component="img"
                        src={URL.createObjectURL(qcPicture)}
                        alt="QC Picture"
                        sx={{
                            width: "100%",
                            maxHeight: "300px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            mt: 2
                        }}
                    />
                </>
            )}

            <Typography sx={{ mt: 3 }} variant="body2">
                Confirm the information above and click **Complete QC** to finalize this repair and notify the client.
            </Typography>
        </Box>
    );
};

export default QCFinalStep;
