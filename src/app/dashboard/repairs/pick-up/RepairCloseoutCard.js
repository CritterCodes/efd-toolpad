import { useState, useRef, useEffect } from "react";
import { Card, CardContent, Stack, Box, Typography, Checkbox, Chip, Grid, Alert, Button, TextField } from "@mui/material";
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";
import RepairThumbnail from "@/app/dashboard/repairs/components/RepairThumbnail";
import { PhotoCamera as PhotoCameraIcon } from "@mui/icons-material";
import { getRepairDisplayTotal, hasAfterPhoto } from './invoicePrint';
import { clearPendingCloseoutPhoto, formatCurrency, loadPendingCloseoutPhoto, savePendingCloseoutPhoto } from './pickupHelpers';
export function RepairCloseoutCard({
  repair,
  isSelected,
  onToggleSelect,
  noteValue,
  onNoteChange,
  photoState,
  onConfirmCloseout,
  onEditRepair,
  highlighted,
}) {
  const [inputKey, setInputKey] = useState(0);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState("");
  const fileInputRef = useRef(null);
  const flaggedForReview = repair.requiresLaborReview === true;
  const photoOnFile = hasAfterPhoto(repair);

  useEffect(() => {
    return () => {
      if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview);
    };
  }, [pendingPhotoPreview]);

  useEffect(() => {
    let cancelled = false;

    const restorePendingPhoto = async () => {
      try {
        const record = await loadPendingCloseoutPhoto(repair.repairID);
        if (cancelled || !record?.file) return;

        setPendingPhoto(record.file);
        setPendingPhotoPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(record.file);
        });
      } catch (error) {
        console.warn("Unable to restore pending closeout photo:", error);
      }
    };

    restorePendingPhoto();

    return () => {
      cancelled = true;
    };
  }, [repair.repairID]);

  const handlePhotoTaken = (event) => {
    const file = event.target.files?.[0];
    setInputKey((k) => k + 1);
    if (!file) return;
    setPendingPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPendingPhoto(file);
    savePendingCloseoutPhoto(repair.repairID, file).catch((error) => {
      console.warn("Unable to persist pending closeout photo:", error);
    });
  };

  const openCamera = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleConfirmCloseout = async () => {
    // NO precondition beyond not-already-saving. Confirm means "this repair is finished, bill it" —
    // a photo and notes are both optional. (Requiring notes instead of a photo would just be the same
    // block wearing a different hat, which is not what was asked for.)
    if (photoState.loading) return;

    // Confirming now ALWAYS raises the invoice, which moves the repair out of this queue — and the
    // closeout route is the only writer of afterPhotos, so a photo can't be attached afterwards without
    // pulling the repair back off the invoice first. The photo requirement used to make a mis-tap
    // structurally impossible; with it gone, these cards sit one per grid tile next to "Edit Repair", so
    // an explicit confirm takes its place. Same pattern as Grace Close below.
    const withoutPhoto = !pendingPhoto && !hasAfterPhoto(repair);
    const confirmed = window.confirm(
      `Close out and invoice ${repair.repairID}?\n\n`
      + `This bills the repair and moves it out of Payment & Pickup.`
      + (withoutPhoto
        ? `\n\nThere is no after photo. That's allowed — but to add one later you'd have to remove the repair from its invoice first.`
        : '')
    );
    if (!confirmed) return;
    const saved = await onConfirmCloseout(repair.repairID, pendingPhoto, noteValue);
    if (saved) {
      clearPendingCloseoutPhoto(repair.repairID).catch((error) => {
        console.warn("Unable to clear pending closeout photo:", error);
      });
      setPendingPhoto(null);
      setPendingPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    }
  };

  return (
    <Card
      sx={{
        backgroundColor: REPAIRS_UI.bgPanel,
        border: `1px solid ${highlighted ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
        boxShadow: highlighted ? `0 0 0 2px ${REPAIRS_UI.accent}33` : REPAIRS_UI.shadow,
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start" }}>
            <Box sx={{ display: "flex", gap: 1.5, minWidth: 0, flex: 1 }}>
              <RepairThumbnail repair={repair} size={76} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>
                  {repair.clientName || repair.businessName || repair.repairID}
                </Typography>
                <Typography sx={{ color: REPAIRS_UI.textMuted, fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {repair.repairID}
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Checkbox checked={isSelected} onChange={() => onToggleSelect(repair.repairID)} />
              <Chip label={repair.isWholesale ? "Wholesale" : "Retail"} size="small" />
            </Stack>
          </Box>

          <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: "0.92rem" }}>
            {repair.description || "No description"}
          </Typography>

          {/* After-photo count and its "no photo yet" reminder used to sit here.
              The shop retired after-pics (CLOSEOUT-FRICTION.md): a zero is the
              normal case, and styling it amber taught staff to ignore amber.
              The capture control below stays for the repairs that do warrant
              a photo. */}
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Current total</Typography>
              <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600 }}>{formatCurrency(getRepairDisplayTotal(repair))}</Typography>
            </Grid>
          </Grid>

          {flaggedForReview && (
            <Alert severity="warning" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              Labor review is flagged for weekly review. This repair can still be batched into an invoice now.
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
            <input
              key={inputKey}
              ref={fileInputRef}
              id={`after-photo-${repair.repairID}`}
              type="file"
              accept="image/*"
              capture="environment"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
              }}
              onChange={handlePhotoTaken}
              onInput={handlePhotoTaken}
            />
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              disabled={photoState.loading}
              onClick={openCamera}
              sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            >
              {pendingPhoto ? "Retake After Photo" : "Take After Photo"}
            </Button>
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: "0.8rem", flex: 1 }}>
              {pendingPhoto ? "Photo ready. Add notes, then confirm." : "Use the device camera, then confirm when closeout is ready."}
            </Typography>
          </Stack>

          {pendingPhoto && (
            <Alert severity="success" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {pendingPhotoPreview && (
                  <Box
                    component="img"
                    src={pendingPhotoPreview}
                    alt="Captured after photo preview"
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 1,
                      objectFit: "cover",
                      border: `1px solid ${REPAIRS_UI.border}`,
                    }}
                  />
                )}
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>After photo captured</Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>
                    {pendingPhoto.name || "Camera photo"} · {Math.max(1, Math.round((pendingPhoto.size || 0) / 1024))} KB
                  </Typography>
                </Box>
              </Stack>
            </Alert>
          )}

          <TextField
            label="Closeout Notes"
            value={noteValue}
            onChange={(event) => onNoteChange(repair.repairID, event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => onEditRepair(repair.repairID)}
              sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            >
              Edit Repair for Missed Tasks / Materials
            </Button>
            <Button
              variant="contained"
              disabled={photoState.loading}
              onClick={handleConfirmCloseout}
              sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}
            >
              {photoState.loading ? "Saving..." : "Confirm / Move to Invoice"}
            </Button>
            <Chip
              label={photoOnFile ? "Photo on file" : pendingPhoto ? "Ready to confirm" : "No after photo"}
              color={photoOnFile ? "success" : "default"}
              variant={photoOnFile ? "filled" : "outlined"}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

