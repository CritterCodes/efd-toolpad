import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CardActions from '@mui/material/CardActions';
import { LoadingButton } from '@mui/lab';

export function StullerApiSettingsCard({ saveStullerSettings, setSettings, settings, testConnection, testing, updating }) {
  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Stuller API Configuration</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enabled}
                    onChange={(e) => setSettings((current) => ({ ...current, enabled: e.target.checked }))}
                  />
                }
                label="Enable Stuller Integration"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={settings.username}
                onChange={(e) => setSettings((current) => ({ ...current, username: e.target.value }))}
                disabled={!settings.enabled}
                helperText="Use the Stuller username that has API access."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={settings.password}
                onChange={(e) => setSettings((current) => ({ ...current, password: e.target.value }))}
                disabled={!settings.enabled}
                helperText={settings.hasPassword ? 'Enter a new password to replace the stored one.' : 'Your Stuller API password.'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="API URL"
                value={settings.apiUrl}
                onChange={(e) => setSettings((current) => ({ ...current, apiUrl: e.target.value }))}
                disabled={!settings.enabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!settings.enabled}>
                <InputLabel>Update Frequency</InputLabel>
                <Select
                  value={settings.updateFrequency}
                  label="Update Frequency"
                  onChange={(e) => setSettings((current) => ({ ...current, updateFrequency: e.target.value }))}
                >
                  <MenuItem value="hourly">Hourly</MenuItem>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="manual">Manual Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
        <CardActions>
          <LoadingButton variant="contained" loading={updating} onClick={saveStullerSettings} disabled={!settings.enabled}>
            Save Settings
          </LoadingButton>
          <LoadingButton variant="outlined" loading={testing} onClick={testConnection} disabled={!settings.enabled || !settings.username}>
            Test Connection
          </LoadingButton>
        </CardActions>
      </Card>
    </>
  );
}
