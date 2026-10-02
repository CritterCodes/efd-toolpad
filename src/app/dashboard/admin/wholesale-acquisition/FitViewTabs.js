import { Box } from '@mui/material';
import { TabRail } from '@/components/facelift';
import { FIT_VIEWS } from './leadHelpers';

export function FitViewTabs({ fitView, setFitView, viewCounts }) {
  return (
    <Box sx={{ mb: 2 }}>
      <TabRail
        ariaLabel="Lead fit views"
        value={fitView}
        onChange={setFitView}
        items={FIT_VIEWS.map((view) => ({
          key: view.value,
          label: view.label,
          count: viewCounts[view.value] || 0,
        }))}
      />
    </Box>
  );
}
