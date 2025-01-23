import React from "react";
import {
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
} from "@mui/material";

/**
 * QC Checklist Step Component
 * Modernized with a mobile-first design and better spacing.
 */
const QCChecklistStep = ({
  checklist,
  handleChecklistChange,
  notes,
  setNotes,
  handleSendToOven,
  repair, // New prop for repair information
}) => {
  return (
    <Box
      sx={{
        padding: "16px",
      }}
    >
      {/* ✅ Title Section */}
      <Typography
        variant="h6"
        fontWeight="bold"
        sx={{ mb: 2, textAlign: "center" }}
      >
        Quality Control Checklist
      </Typography>

      {/* ✅ Repair Details */}
      {repair && (
        <Card
          sx={{
            mb: 2,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {repair.picture && (
            <CardMedia
              component="img"
              height="200"
              image={repair.picture}
              alt="Repair Image"
            />
          )}
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Repair ID: {repair.repairID}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tasks:
            </Typography>
            <List>
              {repair.repairTasks.map((task, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <Typography variant="body2">
                    • {task.title} - Qty: {task.quantity}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* ✅ Checklist Items */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          mb: 2,
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              name="cleanAndPolish"
              checked={checklist.cleanAndPolish}
              onChange={handleChecklistChange}
            />
          }
          label="✅ Clean and Polish Completed"
        />
        <FormControlLabel
          control={
            <Checkbox
              name="allRepairTasks"
              checked={checklist.allRepairTasks}
              onChange={handleChecklistChange}
            />
          }
          label="✅ All Repair Tasks Completed"
        />
        <FormControlLabel
          control={
            <Checkbox
              name="stonesTightened"
              checked={checklist.stonesTightened}
              onChange={handleChecklistChange}
            />
          }
          label="✅ Stones Tightened"
        />
      </Box>

      {/* ✅ Notes Section */}
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Additional Notes (Optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        sx={{
          mt: 2,
          borderRadius: "8px",
          "& .MuiInputBase-root": {
            borderRadius: "8px",
          },
        }}
      />

      {/* ✅ Send to Oven Button */}
      <Button
        variant="contained"
        color="error"
        onClick={handleSendToOven}
        sx={{
          mt: 3,
          padding: "12px",
          fontWeight: "bold",
          borderRadius: "8px",
          textTransform: "none",
          width: "100%",
          boxShadow: "0 2px 8px rgba(255,0,0,0.3)",
        }}
      >
        🔥 Send to the Oven
      </Button>
    </Box>
  );
};

export default QCChecklistStep;
