import wholesaleClientsAPIClient from '@/api-clients/wholesaleClients.client';
import UsersService from '@/services/users';

/**
 * New-client and photo handlers for the repair intake (useNewRepairForm). Moved verbatim; state arrives as deps.
 */
export function intakeClientPhotoActions({ formData, newClientData, onWholesaleChange, recalculateAllItemPrices, setAvailableUsers, setFormData, setGeneratingImageDescription, setImageDescriptionError, setNewClientData, setNewClientLoading, setShowNewClientDialog, smartIntakeLogIDsRef }) {
  // Format phone number as (555) 123-4567
  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // Handle adding a new client
  const handleAddNewClient = async () => {
    setNewClientLoading(true);
    try {

      const clientToCreate = {
        firstName: newClientData.firstName.trim(),
        lastName: newClientData.lastName.trim(),
        email: newClientData.email.trim(),
        phoneNumber: newClientData.phone.trim() || ''
      };

      // Determine if we're creating for a wholesale store
      const isCreatingForWholesale = formData.isWholesale;

      let createdClientResponse;
      if (isCreatingForWholesale) {
        // Pass store ownership info so backend assigns parentWholesalerId correctly
        createdClientResponse = await wholesaleClientsAPIClient.createClient({
          ...clientToCreate,
          wholesalerId: formData.storeId,
          wholesalerName: formData.storeName
        });
      } else {
        createdClientResponse = await UsersService.createUser({
          ...clientToCreate,
          name: `${newClientData.firstName.trim()} ${newClientData.lastName.trim()}`,
          role: newClientData.role || 'customer',
          status: 'unverified'
        });
      }

      const createdClient = createdClientResponse?.data || createdClientResponse.user || createdClientResponse;

      // Check if client is wholesale
      const isWholesaleClient = !!formData.isWholesale;

      // Add to available users list
      setAvailableUsers(prev => [...prev, createdClient]);

      // Auto-select the newly created client
      const clientName = createdClient.name || `${createdClient.firstName} ${createdClient.lastName}`.trim();
      setFormData(prev => ({
        ...prev,
        clientName: clientName,
        userID: createdClient.userID || createdClient._id || createdClient.id
      }));

      // Trigger price recalculation for current store pricing mode
      if (formData.isWholesale) {
        setTimeout(() => {
          recalculateAllItemPrices(true);
        }, 0);
      }

      // Trigger callback if provided
      if (onWholesaleChange) {
        onWholesaleChange(isWholesaleClient);
      }

      // Reset form and close dialog
      setNewClientData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'customer'
      });
      setShowNewClientDialog(false);

    } catch (error) {
      console.error('❌ Error creating new client:', error);
      alert('Failed to create new client: ' + (error.message || 'Unknown error'));
    } finally {
      setNewClientLoading(false);
    }
  };

  // Handle image capture
  const handleImageCapture = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageDescriptionError('');
      setFormData(prev => ({ ...prev, picture: file }));
    }
  };

  const handleGenerateDescriptionFromImage = async (imageFile) => {
    const file = imageFile || formData.picture;
    if (!file) {
      setImageDescriptionError('Please upload an item photo first.');
      return;
    }

    setGeneratingImageDescription(true);
    setImageDescriptionError('');

    try {
      const payload = new FormData();
      payload.append('image', file);

      const response = await fetch('/api/ai/describe-item-image', {
        method: 'POST',
        body: payload
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to generate description from image');
      }

      const generatedDescription = String(data?.data?.description || '').trim();
      if (data?.data?.intakeLogID) smartIntakeLogIDsRef.current.push(data.data.intakeLogID);
      if (!generatedDescription) {
        throw new Error('Gemini did not return a description.');
      }

      setFormData((prev) => ({
        ...prev,
        description: String(prev.description || '').trim()
          ? `${prev.description.trim()}\n${generatedDescription}`
          : generatedDescription
      }));
    } catch (error) {
      setImageDescriptionError(error.message || 'Unable to generate description from image.');
    } finally {
      setGeneratingImageDescription(false);
    }
  };

  return {
    formatPhoneNumber,
    handleAddNewClient,
    handleImageCapture,
    handleGenerateDescriptionFromImage,
  };
}
