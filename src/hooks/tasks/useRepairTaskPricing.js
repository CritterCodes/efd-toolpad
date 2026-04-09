import * as React from 'react';

export const useRepairTaskPricing = (laborHours, materialCost) => {
  const [calculatedPrice, setCalculatedPrice] = React.useState(0);

  React.useEffect(() => {
    if (!laborHours || !materialCost) return;
    
    const calculatePrice = async () => {
      try {
        const settingsResponse = await fetch('/api/admin/settings');
        let wage = 45;
        let materialMarkup = 1.5;
        let businessMultiplier = 1.48;
        
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          wage = settings.pricing?.wage || 45;
          materialMarkup = settings.pricing?.materialMarkup || 1.5;
          businessMultiplier = (settings.pricing?.administrativeFee || 0.15) + 
                              (settings.pricing?.businessFee || 0.25) + 
                              (settings.pricing?.consumablesFee || 0.08) + 1;
        }
        
        const laborCost = laborHours * wage;
        const materialCostNum = materialCost * materialMarkup;
        const subtotal = laborCost + materialCostNum;
        const estimatedPrice = subtotal * businessMultiplier;
        
        setCalculatedPrice(Math.round(estimatedPrice * 100) / 100);
      } catch (error) {
        console.error('Price calculation error:', error);
      }
    };
    
    calculatePrice();
  }, [laborHours, materialCost]);

  return { calculatedPrice, setCalculatedPrice };
};
