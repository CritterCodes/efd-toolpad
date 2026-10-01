import React from "react";
import { USER_ROLES } from "../unifiedUserService";
import PersonIcon from "@mui/icons-material/Person";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";

import { SHARED_NAVIGATION } from "./sharedNavigation";

export const artisanApplicantNavigation = {
  [USER_ROLES.ARTISAN_APPLICANT]: [
    SHARED_NAVIGATION.dashboard,
    {
      segment: 'dashboard/pending',
      title: 'Application Status',
      icon: <RequestQuoteIcon />
    },
    {
      segment: 'dashboard/profile',
      title: 'Profile',
      icon: <PersonIcon />
    },
    SHARED_NAVIGATION.guide
  ]
};
