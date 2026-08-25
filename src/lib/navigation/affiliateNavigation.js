import React from 'react';
import { USER_ROLES } from '../unifiedUserService';
import BarChartIcon from '@mui/icons-material/BarChart';
import LinkIcon from '@mui/icons-material/Link';
import PeopleIcon from '@mui/icons-material/People';
export const affiliateNavigation = {
  [USER_ROLES.AFFILIATE]: [
    // NO shared `dashboard` entry here. /dashboard renders AffiliateDashboardContent —
    // literally the same component as /dashboard/affiliate — so including both listed
    // one page twice under two names ("Dashboard" and "Affiliate Dashboard"), which
    // read as two different destinations.
    {
      segment: 'dashboard/affiliate',
      title: 'Dashboard',
      icon: <BarChartIcon />,
    },
    {
      segment: 'dashboard/affiliate/campaigns',
      title: 'Campaigns',
      icon: <LinkIcon />,
    },
    {
      segment: 'dashboard/affiliate/clients',
      title: 'Referred Clients',
      icon: <PeopleIcon />,
    },
  ],
};
