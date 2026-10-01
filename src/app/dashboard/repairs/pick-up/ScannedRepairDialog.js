import { Dialog, DialogTitle, Typography, IconButton, DialogContent, Box, Alert, DialogActions, Button } from "@mui/material";
import { setSessionValue, CLOSEOUT_ACTIVE_REPAIR_KEY } from './pickupHelpers';
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";
import { Close as CloseIcon, QrCodeScanner as ScanIcon } from "@mui/icons-material";
import { RepairCloseoutCard } from './RepairCloseoutCard';

export function ScannedRepairDialog({ closeoutNotes, handleCloseoutNoteChange, handleSaveCloseoutPhoto, router, savingPhotoRepairID, scannedRepair, scannedRepairID, selectedRepairIDs, setCloseoutScannerOpen, setScannedRepairID, toggleRepairSelection }) {
  return (
    <>
      <Dialog
        open={Boolean(scannedRepairID)}
        onClose={() => {
          setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, "");
          setScannedRepairID("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>
            {scannedRepair ? (scannedRepair.clientName || scannedRepair.businessName || scannedRepair.repairID) : scannedRepairID}
          </Typography>
          <IconButton
            onClick={() => {
              setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, "");
              setScannedRepairID("");
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {scannedRepair ? (
            <RepairCloseoutCard
              repair={scannedRepair}
              isSelected={selectedRepairIDs.includes(scannedRepair.repairID)}
              onToggleSelect={toggleRepairSelection}
              noteValue={closeoutNotes[scannedRepair.repairID] || ""}
              onNoteChange={handleCloseoutNoteChange}
              photoState={{ loading: savingPhotoRepairID === scannedRepair.repairID }}
              onConfirmCloseout={handleSaveCloseoutPhoto}
              onEditRepair={(repairID) => router.push(`/dashboard/repairs/${repairID}/edit?returnTo=closeout`)}
              highlighted={false}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Alert severity="warning">
                {scannedRepairID} is no longer in the Payment & Pickup queue.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, "");
              setScannedRepairID("");
            }}
            sx={{ color: REPAIRS_UI.textSecondary }}
          >
            Done
          </Button>
          <Button
            variant="contained"
            startIcon={<ScanIcon />}
            onClick={() => {
              setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, "");
              setScannedRepairID("");
              setCloseoutScannerOpen(true);
            }}
            sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}
          >
            Scan Next Repair
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
