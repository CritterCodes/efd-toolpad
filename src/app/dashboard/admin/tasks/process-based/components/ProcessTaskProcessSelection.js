import {
  Grid,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  Autocomplete,
  Alert
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export default function ProcessTaskProcessSelection({
  formData,
  availableProcesses,
  addProcess,
  updateProcess,
  removeProcess
}) {
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">⚙️ Process Selection</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<AddIcon />}
            onClick={addProcess}
            variant="outlined"
            size="small"
          >
            Add Process
          </Button>
        </Box>

        {formData.processes.map((process, index) => (
          <Card key={index} sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={availableProcesses}
                    getOptionLabel={(option) => option.displayName || ''}
                    value={availableProcesses.find(p => p._id === process.processId) || null}
                    onChange={(event, newValue) => {
                      updateProcess(index, 'processId', newValue?._id || '');
                    }}
                    filterOptions={(options, { inputValue }) => {
                      const filtered = options.filter(option => {
                        const searchText = inputValue.toLowerCase();
                        return (
                          option.displayName?.toLowerCase().includes(searchText) ||
                          option.processType?.toLowerCase().includes(searchText) ||
                          option.skillLevel?.toLowerCase().includes(searchText) ||
                          option.description?.toLowerCase().includes(searchText)
                        );
                      });
                      return filtered;
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Process"
                        placeholder="Search processes..."
                        required
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={key} {...otherProps}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {option.displayName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.laborHours}hrs • ${option.pricing?.totalCost || 0} total • {option.skillLevel}
                            </Typography>
                            {option.processType && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                • {option.processType}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    }}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                    noOptionsText="No processes found"
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={process.quantity}
                    onChange={(e) => updateProcess(index, 'quantity', parseFloat(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 10, step: 1 }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  {process.processId && (
                    <Box>
                      {(() => {
                        const proc = availableProcesses.find(p => p._id === process.processId);
                        const complexity = proc?.metalComplexity?.[formData.metalType] || 1.0;
                        const adjustedTime = proc ? proc.laborHours * complexity * process.quantity : 0;
                        return (
                          <Typography variant="caption" color="primary">
                            {Math.round(adjustedTime * 100) / 100} hrs
                          </Typography>
                        );
                      })()}
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={1}>
                  <IconButton
                    onClick={() => removeProcess(index)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}

        {formData.processes.length === 0 && (
          <Alert severity="info">
            Add at least one process to calculate pricing.
          </Alert>
        )}
      </AccordionDetails>
    </Accordion>
  );
}