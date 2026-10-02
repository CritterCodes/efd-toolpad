/**
 * Materials Category Tabs Component
 * Tab-based navigation for material categories with counts
 */

import * as React from 'react';
import { Box } from '@mui/material';
import {
  Category as CategoryIcon,
  ViewModule as ViewModuleIcon
} from '@mui/icons-material';
import { TabRail } from '@/components/facelift';

export default function MaterialsCategoryTabs({
  materialTabs,
  selectedTab,
  onTabChange
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <TabRail
        ariaLabel="Material categories"
        value={selectedTab}
        onChange={onTabChange}
        items={materialTabs.map((tab) => ({
          key: tab.value,
          label: tab.label,
          count: tab.count,
          icon: tab.value === 'all' ? <ViewModuleIcon /> : <CategoryIcon />,
        }))}
      />
    </Box>
  );
}
