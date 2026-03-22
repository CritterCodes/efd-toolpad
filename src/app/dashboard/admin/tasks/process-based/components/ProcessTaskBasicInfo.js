import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

const categories = [
  { value: 'shanks', label: '💍 Shanks', emoji: '💍' },
  { value: 'prongs', label: '🔧 Prongs', emoji: '🔧' },
  { value: 'chains', label: '🔗 Chains', emoji: '🔗' },
  { value: 'stone_setting', label: '💎 Stone Setting', emoji: '💎' },
  { value: 'misc', label: '🛠️ Misc', emoji: '🛠️' },
  { value: 'watches', label: '⌚ Watches', emoji: '⌚' },
  { value: 'engraving', label: '✍️ Engraving', emoji: '✍️' },
  { value: 'bracelets', label: '📿 Bracelets', emoji: '📿' }
];

const metalTypes = [
  { value: 'yellow_gold', label: 'Yellow Gold', color: '#FFD700' },
  { value: 'white_gold', label: 'White Gold', color: '#E8E8E8' },
  { value: 'rose_gold', label: 'Rose Gold', color: '#E8B4A0' },
  { value: 'sterling_silver', label: 'Sterling Silver', color: '#C0C0C0' },
  { value: 'fine_silver', label: 'Fine Silver', color: '#E5E5E5' },
  { value: 'platinum', label: 'Platinum', color: '#E5E4E2' },
  { value: 'mixed', label: 'Mixed Metals', color: '#A0A0A0' },
  { value: 'n_a', label: 'N/A', color: '#808080' }
];

const karatOptions = [
  '10k', '14k', '18k', '22k', '24k', // Gold
  '925', '999', // Silver
  '950', '900', // Platinum
  'N/A' // For mixed or non-precious metals
];

export default function ProcessTaskBasicInfo({ formData, setFormData }) {
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">📝 Basic Information</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Task Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="e.g., Ring Sizing Down - Silver"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                label="Category"
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Metal Type</InputLabel>
              <Select
                value={formData.metalType}
                onChange={(e) => setFormData(prev => ({ ...prev, metalType: e.target.value }))}
                label="Metal Type"
              >
                {metalTypes.map((metal) => (
                  <MenuItem key={metal.value} value={metal.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          bgcolor: metal.color,
                          borderRadius: '50%',
                          mr: 1,
                          border: '1px solid #ccc'
                        }}
                      />
                      {metal.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Karat/Purity</InputLabel>
              <Select
                value={formData.karat}
                onChange={(e) => setFormData(prev => ({ ...prev, karat: e.target.value }))}
                label="Karat/Purity"
              >
                {karatOptions.map((karat) => (
                  <MenuItem key={karat} value={karat}>
                    {karat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Subcategory (Optional)"
              value={formData.subcategory}
              onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
              placeholder="e.g., ring_sizing"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              placeholder="Detailed description of the repair service..."
            />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}