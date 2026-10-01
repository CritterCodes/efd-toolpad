import { Paper, Tabs, Tab } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { FIT_VIEWS } from './leadHelpers';

export function FitViewTabs({ fitView, setFitView, viewCounts }) {
  return (
    <>
      <Paper variant="outlined" sx={{ mb: 2, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgPanel }}>
        <Tabs
          value={fitView}
          onChange={(event, value) => setFitView(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 700 },
          }}
        >
          {FIT_VIEWS.map((view) => (
            <Tab
              key={view.value}
              value={view.value}
              label={`${view.label} (${viewCounts[view.value] || 0})`}
            />
          ))}
        </Tabs>
      </Paper>
    </>
  );
}
