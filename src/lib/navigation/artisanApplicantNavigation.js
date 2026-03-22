import React from "react";
import { USER_ROLES } from "../unifiedUserService";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuildIcon from "@mui/icons-material/Handyman";
import BarChartIcon from "@mui/icons-material/Insights";
import PeopleIcon from "@mui/icons-material/People";
import InventoryIcon from "@mui/icons-material/Inventory2";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SettingsIcon from "@mui/icons-material/Settings";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HandymanIcon from "@mui/icons-material/Handyman";
import ListIcon from "@mui/icons-material/List";
import ReceivingIcon from "@mui/icons-material/Inbox";
import MoveUpIcon from "@mui/icons-material/DriveFileMove";
import PickupIcon from "@mui/icons-material/LocalShipping";
import QualityIcon from "@mui/icons-material/VerifiedUser";
import PartsIcon from "@mui/icons-material/Category";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HistoryIcon from "@mui/icons-material/History";
import DiamondIcon from "@mui/icons-material/AutoAwesome";
import RingIcon from "@mui/icons-material/FiberSmartRecord";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import BusinessIcon from "@mui/icons-material/Business";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import PaymentIcon from "@mui/icons-material/Payment";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import PrintIcon from "@mui/icons-material/Print";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";

import { SHARED_NAVIGATION } from "./sharedNavigation";

export const artisanApplicantNavigation = {
  [USER_ROLES.ARTISAN_APPLICANT]: [
    SHARED_NAVIGATION.dashboard,
    {
      segment: 'dashboard/application',
      title: 'Application Status',
      icon: <RequestQuoteIcon />
    },
    {
      segment: 'dashboard/profile',
      title: 'Profile',
      icon: <PersonIcon />
    }
  ]
};
