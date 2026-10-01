import React from "react";
import { USER_ROLES } from "../unifiedUserService";
import InventoryIcon from "@mui/icons-material/Inventory2";
import ListIcon from "@mui/icons-material/List";
import DiamondIcon from "@mui/icons-material/AutoAwesome";
import RingIcon from "@mui/icons-material/FiberSmartRecord";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";

import { SHARED_NAVIGATION } from "./sharedNavigation";

export const staffNavigation = {
  [USER_ROLES.STAFF]: [
    SHARED_NAVIGATION.dashboard,
    { kind: 'header', title: 'Commerce' },
    {
      segment: 'dashboard/commerce/sales-invoices',
      title: 'Sales Invoices',
      icon: <PointOfSaleIcon />
    },
    {
      segment: 'dashboard/products',
      title: 'Products',
      icon: <InventoryIcon />,
      children: [
        {
          segment: '',
          title: 'All Products',
          icon: <ListIcon />
        },
        {
          segment: 'jewelry',
          title: 'Jewelry',
          icon: <RingIcon />
        },
        {
          segment: 'gemstones',
          title: 'Gemstones',
          icon: <DiamondIcon />
        }
      ]
    },
    SHARED_NAVIGATION.guide
  ]
};
