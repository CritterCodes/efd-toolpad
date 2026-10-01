import { Dialog, DialogTitle, DialogContent, Stack, TextField, DialogActions, Button } from '@mui/material';
import { LoadingButton } from '@mui/lab';

export function NewRepairFlowClientDialog({ formatPhoneNumber, handleAddNewClient, isMobile, newClientData, newClientLoading, setNewClientData, setShowNewClientDialog, showNewClientDialog }) {
  return (
    <>
      {/* New Client Dialog — same fields and handler as the classic form. */}
      <Dialog
        open={showNewClientDialog}
        onClose={newClientLoading ? undefined : () => setShowNewClientDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>New client at this store</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="First Name"
              value={newClientData.firstName}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, firstName: e.target.value }))}
              required
              inputProps={{ style: { fontSize: 16 } }}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={newClientData.lastName}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, lastName: e.target.value }))}
              required
              inputProps={{ style: { fontSize: 16 } }}
            />
            <TextField
              fullWidth
              label="Phone"
              type="tel"
              value={newClientData.phone}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
              placeholder="(555) 123-4567"
              required
              inputProps={{ style: { fontSize: 16 } }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newClientData.email}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, email: e.target.value }))}
              helperText="Optional"
              inputProps={{ style: { fontSize: 16 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewClientDialog(false)} disabled={newClientLoading}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleAddNewClient}
            loading={newClientLoading}
            variant="contained"
            disabled={!newClientData.firstName.trim() || !newClientData.lastName.trim() || !newClientData.phone.trim()}
          >
            {newClientLoading ? 'Creating…' : 'Add Client'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
