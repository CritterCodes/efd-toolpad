import React from "react";
import { USER_ROLES } from "../unifiedUserService";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuildIcon from "@mui/icons-material/Handyman";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ListIcon from "@mui/icons-material/List";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { SHARED_NAVIGATION } from "./sharedNavigation";

export const wholesalerNavigation = {
  [USER_ROLES.WHOLESALER]: [
    SHARED_NAVIGATION.dashboard,
    {
      segment: 'dashboard/wholesaler/repairs',
      title: 'Repairs',
      icon: <BuildIcon />,
      children: [
        {
          segment: 'new',
          title: 'Create Repair',
          icon: <AddIcon />
        },
        {
          segment: 'schedule-pickup',
          title: 'Schedule Pickup',
          icon: <LocalShippingIcon />
        },
        {
          segment: 'current',
          title: 'Current Repairs',
          icon: <ListIcon />
        },
        {
          segment: 'completed',
          title: 'Completed Repairs',
          icon: <CheckCircleIcon />
        }
      ]
    },
    {
      segment: 'dashboard/wholesaler/clients',
      title: 'Clients',
      icon: <PeopleIcon />
    },
    {
      segment: 'dashboard/wholesaler/account-settings',
      title: 'Account Settings',
      icon: <SettingsIcon />
    }
  ]
};
