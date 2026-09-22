import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuBookIcon from "@mui/icons-material/MenuBook";

// Shared Navigation components
export const SHARED_NAVIGATION = {
  dashboard: {
    segment: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon />
  },
  // "How EFD works" — role-aware guide, every rate read from live settings (app/dashboard/guide).
  // Present in EVERY role's nav so nobody has to hunt for how they get paid.
  guide: {
    segment: 'dashboard/guide',
    title: 'How EFD works',
    icon: <MenuBookIcon />
  }
};
