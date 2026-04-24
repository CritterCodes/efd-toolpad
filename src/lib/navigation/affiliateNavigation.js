import React from 'react';
import { USER_ROLES } from '../unifiedUserService';
import BarChartIcon from '@mui/icons-material/BarChart';
import LinkIcon from '@mui/icons-material/Link';
import PeopleIcon from '@mui/icons-material/People';
import { SHARED_NAVIGATION } from './sharedNavigation';

export const affiliateNavigation = {
  [USER_ROLES.AFFILIATE]: [
    SHARED_NAVIGATION.dashboard,
    {
      segment: 'dashboard/affiliate',
      title: 'Affiliate Dashboard',
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
