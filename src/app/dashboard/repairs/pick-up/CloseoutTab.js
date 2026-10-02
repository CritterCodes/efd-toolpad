import { Stack, Alert, Card, CardContent, TextField, Button, Chip, Typography, Grid } from "@mui/material";
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";
import { QrCodeScanner as ScanIcon } from "@mui/icons-material";
import { RepairCloseoutCard } from './RepairCloseoutCard';

export function CloseoutTab({ batchNotes, closeoutNotes, closeoutRepairs, closeoutSearch, handleCloseoutNoteChange, handleCreateInvoice, handleLegacyCloseSelected, handleSaveCloseoutPhoto, legacyClosing, router, savingPhotoRepairID, selectedRepairIDs, setBatchNotes, setCloseoutScannerOpen, setCloseoutSearch, submittingInvoice, tab, toggleRepairSelection, visibleCloseoutRepairs }) {
  return (
    <>
      {tab === 0 && (
        <Stack spacing={2.5}>
          <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
            {/* The after photo stopped being required on 2026-07-31 (owner: "i no longer want to require
                completed photos before invoicing"), in all three places that enforced it. This line went on
                saying it was mandatory — pinned now by afterPhotoCopy.guard.test.js. */}
            Use the repair editor for missed tasks, materials, and custom charges before batching. An after photo is optional — add one if the work is worth showing.
          </Alert>
          <Alert severity="warning" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
            For old repairs that were already paid and delivered outside this invoice workflow, select the cards and use Grace Close Selected. This keeps an audit note and removes them from this queue.
          </Alert>

          <Card sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, boxShadow: REPAIRS_UI.shadow }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                <TextField
                  label="Find Repair"
                  placeholder="Scan or search repair ID, customer, or description"
                  value={closeoutSearch}
                  onChange={(event) => setCloseoutSearch(event.target.value)}
                  autoComplete="off"
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<ScanIcon />}
                  onClick={() => setCloseoutScannerOpen(true)}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Camera Scan
                </Button>
                <Button
                  variant="outlined"
                  disabled={!closeoutSearch}
                  onClick={() => setCloseoutSearch("")}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Clear
                </Button>
                <Chip label={`${visibleCloseoutRepairs.length} shown`} />
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, boxShadow: REPAIRS_UI.shadow }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>Batch Selected Repairs</Typography>
                {/* Manual batches are created as pickup drafts; how they go back (pickup or ship) is decided
                    at Finalize. Hand delivery is no longer offered (owner, 2026-09-21). */}
                <TextField label="Invoice Notes" value={batchNotes} onChange={(event) => setBatchNotes(event.target.value)} multiline minRows={2} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Chip label={`${selectedRepairIDs.length} selected`} />
                  <Button variant="contained" disabled={selectedRepairIDs.length === 0 || submittingInvoice} onClick={handleCreateInvoice} sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}>
                    {submittingInvoice ? "Creating Invoice..." : "Create Invoice Batch"}
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={selectedRepairIDs.length === 0 || legacyClosing}
                    onClick={handleLegacyCloseSelected}
                    sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                  >
                    {legacyClosing ? "Closing..." : `Grace Close Selected (${selectedRepairIDs.length})`}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {closeoutRepairs.length === 0 ? (
            <Alert severity="success" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              No completed repairs are waiting for closeout.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {visibleCloseoutRepairs.map((repair) => (
                <Grid item xs={12} lg={6} key={repair.repairID}>
                  <RepairCloseoutCard
                    repair={repair}
                    isSelected={selectedRepairIDs.includes(repair.repairID)}
                    onToggleSelect={toggleRepairSelection}
                    noteValue={closeoutNotes[repair.repairID] || ""}
                    onNoteChange={handleCloseoutNoteChange}
                    photoState={{ loading: savingPhotoRepairID === repair.repairID }}
                    onConfirmCloseout={handleSaveCloseoutPhoto}
                    onEditRepair={(repairID) => router.push(`/dashboard/repairs/${repairID}/edit?returnTo=closeout`)}
                    highlighted={false}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      )}
    </>
  );
}
