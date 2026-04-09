const API_BASE = '/api/wholesale/account-settings';

class WholesaleAccountSettingsAPIClient {
  async fetchSettings() {
    const response = await fetch(API_BASE, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Failed to fetch wholesale account settings');
    }

    return payload.data;
  }

  async updateSettings({ wholesalerPricingSettings, businessProfile, retailMarkups, ticketLogoFile = null, removeTicketLogo = false } = {}) {
    const hasLogoFile = typeof File !== 'undefined' && ticketLogoFile instanceof File;
    const shouldUseMultipart = hasLogoFile || removeTicketLogo;

    const requestOptions = {
      method: 'PUT'
    };

    if (shouldUseMultipart) {
      const formData = new FormData();
      formData.append('retailMarkups', JSON.stringify(retailMarkups || {}));
      formData.append('wholesalerPricingSettings', JSON.stringify(wholesalerPricingSettings || {}));
      formData.append('businessProfile', JSON.stringify(businessProfile || {}));
      formData.append('removeTicketLogo', String(Boolean(removeTicketLogo)));

      if (hasLogoFile) {
        formData.append('ticketLogoFile', ticketLogoFile);
      }

      requestOptions.body = formData;
    } else {
      requestOptions.headers = { 'Content-Type': 'application/json' };
      requestOptions.body = JSON.stringify({
        wholesalerPricingSettings,
        businessProfile,
        retailMarkups,
        removeTicketLogo: Boolean(removeTicketLogo)
      });
    }

    const response = await fetch(API_BASE, requestOptions);

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Failed to update wholesale account settings');
    }

    return payload.data;
  }
}

const wholesaleAccountSettingsAPIClient = new WholesaleAccountSettingsAPIClient();

export default wholesaleAccountSettingsAPIClient;
