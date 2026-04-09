'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { LoadingButton } from '@mui/lab';
import { PageContainer } from '@toolpad/core/PageContainer';

export default function StullerSettingsPage() {
  const [loading, setLoading] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [materials, setMaterials] = React.useState([]);
  
  // Settings state
  const [settings, setSettings] = React.useState({
    enabled: false,
    username: '',
    password: '',
    apiUrl: 'https://api.stuller.com',
    updateFrequency: 'daily',
    hasPassword: false
  });

  const loadStullerSettings = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/stuller');
      
      if (!response.ok) {
        throw new Error('Failed to load Stuller settings');
      }
      
      const data = await response.json();
      setSettings({
        enabled: data.stuller.enabled,
        username: data.stuller.username,
        password: data.stuller.hasPassword ? '********' : '',
        apiUrl: data.stuller.apiUrl,
        updateFrequency: data.stuller.updateFrequency,
        hasPassword: data.stuller.hasPassword
      });
      setError(null);
    } catch (error) {
      console.error('Error loading Stuller settings:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveStullerSettings = async () => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/settings/stuller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      setSuccess('Stuller settings saved successfully');
      loadStullerSettings(); // Reload to get masked password

    } catch (error) {
      console.error('Error saving Stuller settings:', error);
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      const testData = {
        username: settings.username,
        password: settings.password === '********' ? '' : settings.password,
        apiUrl: settings.apiUrl
      };

      if (!testData.username || (!testData.password && !settings.hasPassword)) {
        throw new Error('Username and password are required for testing');
      }

      const response = await fetch('/api/admin/settings/stuller', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.error);
      }

    } catch (error) {
      console.error('Error testing connection:', error);
      setError(error.message);
    } finally {
      setTesting(false);
    }
  };

  const loadStullerMaterials = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stuller/update-prices');
      
      if (!response.ok) {
        throw new Error('Failed to load Stuller materials');
      }
      
      const data = await response.json();
      setMaterials(data.materials || []);
      setError(null);
    } catch (error) {
      console.error('Error loading Stuller materials:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePrices = async (force = false) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/stuller/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update prices');
      }

      const result = await response.json();
      setSuccess(`${result.message}. Updated ${result.updated} of ${result.total} materials.`);
      
      if (result.errors && result.errors.length > 0) {
        setError(`Some errors occurred: ${result.errors.join(', ')}`);
      }

      // Reload materials to show updated data
      loadStullerMaterials();

    } catch (error) {
      console.error('Error updating prices:', error);
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  React.useEffect(() => {
    loadStullerSettings();
    loadStullerMaterials();
  }, [loadStullerSettings, loadStullerMaterials]);

  return (
    <PageContainer title="Stuller Integration Settings">
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {/* Stuller Credentials Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Stuller API Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enabled}
                      onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
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
                  onChange={(e) => setSettings({...settings, username: e.target.value})}
                  disabled={!settings.enabled}
                  helperText="Your Stuller account username"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Password"
                  value={settings.password}
                  onChange={(e) => setSettings({...settings, password: e.target.value})}
                  disabled={!settings.enabled}
                  helperText={settings.hasPassword ? "Enter new password to change" : "Your Stuller account password"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="API URL"
                  value={settings.apiUrl}
                  onChange={(e) => setSettings({...settings, apiUrl: e.target.value})}
                  disabled={!settings.enabled}
                  helperText="Stuller API endpoint URL"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!settings.enabled}>
                  <InputLabel>Update Frequency</InputLabel>
                  <Select
                    value={settings.updateFrequency}
                    label="Update Frequency"
                    onChange={(e) => setSettings({...settings, updateFrequency: e.target.value})}
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
            <LoadingButton
              variant="contained"
              loading={updating}
              onClick={saveStullerSettings}
              disabled={!settings.enabled}
            >
              Save Settings
            </LoadingButton>
            <LoadingButton
              variant="outlined"
              loading={testing}
              onClick={testConnection}
              disabled={!settings.enabled || !settings.username}
            >
              Test Connection
            </LoadingButton>
          </CardActions>
        </Card>

        {/* Price Update Settings Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Price Update Controls
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Materials with &quot;Auto-update pricing&quot; enabled will be updated according to the frequency set above.
              Use manual updates to refresh prices on demand.
            </Typography>
          </CardContent>
          <CardActions>
            <LoadingButton
              variant="contained"
              loading={updating}
              onClick={() => updatePrices(false)}
              disabled={!settings.enabled}
            >
              Update Prices Now
            </LoadingButton>
            <LoadingButton
              variant="outlined"
              loading={updating}
              onClick={() => updatePrices(true)}
              disabled={!settings.enabled}
            >
              Force Update All
            </LoadingButton>
          </CardActions>
        </Card>

        {/* Stuller Materials Overview */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Materials with Stuller Integration
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress />
              </Box>
            ) : materials.length === 0 ? (
              <Typography color="text.secondary">
                No materials found with Stuller integration enabled.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {materials.map((material) => (
                  <Grid item xs={12} sm={6} md={4} key={material._id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          {material.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Stuller #: {material.stuller_item_number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Current Price: ${material.unitCost}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last Updated: {material.last_price_update 
                            ? new Date(material.last_price_update).toLocaleDateString()
                            : 'Never'
                          }
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* API Configuration Info */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              API Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              To enable Stuller integration, you need to set the following environment variables:
            </Typography>
            <Box component="pre" sx={{ 
              backgroundColor: 'grey.100', 
              p: 2, 
              borderRadius: 1, 
              overflow: 'auto',
              fontSize: '0.875rem'
            }}>
{`STULLER_API_URL=https://api.stuller.com
STULLER_API_KEY=your_api_key_here`}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Contact Stuller to obtain your API credentials and configure these in your environment.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
