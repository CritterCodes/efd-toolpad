import React from "react";
import { USER_ROLES } from "../unifiedUserService";
import PersonIcon from "@mui/icons-material/Person";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import LinkIcon from "@mui/icons-material/Link";
import PaymentIcon from "@mui/icons-material/Payment";

import { SHARED_NAVIGATION } from "./sharedNavigation";

export const artisanNavigationConfig = {
  [USER_ROLES.ARTISAN]: [
    SHARED_NAVIGATION.dashboard,
    { kind: 'header', title: 'Studio' },
    {
      segment: 'dashboard/profile',
      title: 'Profile',
      icon: <PersonIcon />
    },
    {
      segment: 'dashboard/gallery',
      title: 'Gallery',
      icon: <PhotoLibraryIcon />
    },
    {
      segment: 'dashboard/artisan/affiliate',
      title: 'Affiliate',
      icon: <LinkIcon />
    },
    { kind: 'header', title: 'Finance' },
    {
      segment: 'dashboard/artisan/payroll',
      title: 'Payroll',
      icon: <PaymentIcon />
    }
  ]
};
