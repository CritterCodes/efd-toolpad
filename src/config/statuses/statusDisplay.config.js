import { workflowDisplayConfig } from './display/workflowDisplay.config';
import { productionDisplayConfig } from './display/productionDisplay.config';
import { fulfillmentDisplayConfig } from './display/fulfillmentDisplay.config';
import { clientDisplayConfig } from './display/clientDisplay.config';

export const STATUS_DISPLAY_INFO = {
  ...workflowDisplayConfig,
  ...productionDisplayConfig,
  ...fulfillmentDisplayConfig,
  ...clientDisplayConfig
};
