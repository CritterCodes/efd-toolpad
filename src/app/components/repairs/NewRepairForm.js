import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Autocomplete,
  Grid,
  Paper,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
  Stack,
  Card,
  CardContent,
  CardHeader,
  Fab,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

// Services
import tasksService from '@/services/tasks.service';
import processesService from '@/services/processes.service';
import materialsService from '@/services/materials.service';
import RepairsService from '@/services/repairs';
import UsersService from '@/services/users';

// Context
import { useRepairs } from '@/app/context/repairs.context';

// Utils
import { getMetalSpecificPrice, supportsMetalType } from '@/utils/repair-pricing.util';

// Metal configuration
const METAL_TYPES = [
  { value: 'yellow-gold', label: 'Yellow Gold', karatOptions: ['10k', '14k', '18k', '22k'] },
  { value: 'white-gold', label: 'White Gold', karatOptions: ['10k', '14k', '18k'] },
  { value: 'rose-gold', label: 'Rose Gold', karatOptions: ['10k', '14k', '18k'] },
  { value: 'silver', label: 'Silver', karatOptions: ['925', '999'] },
  { value: 'platinum', label: 'Platinum', karatOptions: ['950', '999'] },
  { value: 'palladium', label: 'Palladium', karatOptions: ['950', '999'] },
  { value: 'stainless', label: 'Stainless Steel', karatOptions: [] },
  { value: 'brass', label: 'Brass', karatOptions: [] },
  { value: 'copper', label: 'Copper', karatOptions: [] },
  { value: 'titanium', label: 'Titanium', karatOptions: [] },
  { value: 'other', label: 'Other', karatOptions: [] }
];

// Ring sizes (US standard)
const RING_SIZES = [
  '3', '3.25', '3.5', '3.75', '4', '4.25', '4.5', '4.75', '5', '5.25', 
  '5.5', '5.75', '6', '6.25', '6.5', '6.75', '7', '7.25', '7.5', '7.75', 
  '8', '8.25', '8.5', '8.75', '9', '9.25', '9.5', '9.75', '10', '10.25', 
  '10.5', '10.75', '11', '11.25', '11.5', '11.75', '12', '12.25', '12.5', 
  '12.75', '13', '13.25', '13.5', '13.75', '14', '14.25', '14.5', '14.75', '15'
];

// Item categories that might have sizes
const SIZEABLE_CATEGORIES = ['ring', 'band', 'wedding-ring', 'engagement-ring'];

export default function NewRepairForm({ 
  onSubmit, 
  initialData = null,
  clientInfo = null,
  isWholesale = false,
  onWholesaleChange = null
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Repairs context for updating the repairs list
  const { addRepair } = useRepairs();
  
  // Form state
  const [formData, setFormData] = useState({
    // Client info
    userID: clientInfo?.userID || '',
    clientName: clientInfo?.name || '',
    
    // Repair details
    description: '',
    promiseDate: '',
    isRush: false,
    
    // Item details
    metalType: '',
    karat: '',
    
    // Ring sizing (only shown for rings)
    isRing: false,
    currentRingSize: '',
    desiredRingSize: '',
    
    // Notes
    notes: '',
    internalNotes: '',
    
    // Repair items
    tasks: [],
    processes: [],
    materials: [],
    customLineItems: [],
    
    // Pricing
    isWholesale: false,
    includeDelivery: false,
    includeTax: true, // Tax enabled by default
    
    // Image
    picture: null
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [expandedSection, setExpandedSection] = useState('details');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'customer' // Default role
  });
  const [newClientLoading, setNewClientLoading] = useState(false);
  
  // Data lists
  const [availableTasks, setAvailableTasks] = useState([]);
  const [availableProcesses, setAvailableProcesses] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  
  // Rush job state
  const [rushJobInfo, setRushJobInfo] = useState({
    canCreate: true,
    currentRushJobs: 0,
    maxRushJobs: 0,
    remainingSlots: 0
  });

  // Stuller integration state
  const [stullerSku, setStullerSku] = useState('');
  const [loadingStuller, setLoadingStuller] = useState(false);
  const [stullerError, setStullerError] = useState('');

  // Admin settings for pricing display
  const [adminSettings, setAdminSettings] = useState(null);
  const [adminSettingsError, setAdminSettingsError] = useState(null);
  const [adminSettingsLoading, setAdminSettingsLoading] = useState(true);
  
  // Load admin settings for pricing display
  useEffect(() => {
    const loadAdminSettings = async () => {
      setAdminSettingsLoading(true);
      setAdminSettingsError(null);
      
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) {
          throw new Error(`Failed to load admin settings: ${response.status} ${response.statusText}`);
        }
        
        const settings = await response.json();
        
        // Validate required pricing structure
        if (!settings.pricing) {
          throw new Error('Admin settings missing pricing configuration');
        }
        
        const { administrativeFee, businessFee, consumablesFee } = settings.pricing;
        if (administrativeFee === undefined || businessFee === undefined || consumablesFee === undefined) {
          throw new Error('Admin settings pricing configuration is incomplete. Missing: ' + 
            [
              administrativeFee === undefined ? 'administrativeFee' : null,
              businessFee === undefined ? 'businessFee' : null,
              consumablesFee === undefined ? 'consumablesFee' : null
            ].filter(Boolean).join(', '));
        }
        
        setAdminSettings({
          rushMultiplier: settings.pricing.rushMultiplier,
          deliveryFee: settings.pricing.deliveryFee,
          taxRate: settings.pricing.taxRate,
          pricing: {
            administrativeFee: settings.pricing.administrativeFee,
            businessFee: settings.pricing.businessFee,
            consumablesFee: settings.pricing.consumablesFee
          }
        });
      } catch (error) {
        console.error('Failed to load admin settings:', error);
        setAdminSettingsError(error.message);
      } finally {
        setAdminSettingsLoading(false);
      }
    };

    loadAdminSettings();
  }, []);
  
  // Load initial data
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Handle client info and set wholesale status
  useEffect(() => {
    if (clientInfo) {
      const clientName = clientInfo.name || `${clientInfo.firstName || ''} ${clientInfo.lastName || ''}`.trim();
      const isClientWholesale = clientInfo.role === 'wholesaler';
      
      setFormData(prev => ({ 
        ...prev, 
        clientName,
        userID: clientInfo._id || clientInfo.id || clientInfo.userID || '',
        isWholesale: isClientWholesale
      }));

      // Trigger price recalculation if wholesale status changed
      // Use a timeout to avoid dependency loop
      setTimeout(() => {
        recalculateAllItemPrices(isClientWholesale);
      }, 0);
    }
  }, [clientInfo]); // Removed formData.isWholesale dependency to avoid loop

  // Load available items for selection and rush job info
  useEffect(() => {
    const loadData = async () => {
      try {
        
        const [tasks, processes, materials, users] = await Promise.all([
          tasksService.getTasks(),
          processesService.getProcesses(),
          materialsService.getMaterials(),
          UsersService.getAllUsers(),
          // Temporarily disable rush jobs API call due to MongoDB import issues
          // fetch('/api/rush-jobs?action=canCreate').then(res => res.json())
        ]);
        
        
        setAvailableTasks(tasks.data || tasks || []);
        setAvailableProcesses(processes.data || processes || []);
        setAvailableMaterials(materials.data || materials || []);
        
        // Fix: Handle users response format properly
        const usersData = users?.users || users?.data || users || [];
        setAvailableUsers(usersData);
        
        // Temporarily disable rush job functionality
        setRushJobInfo({
          canCreate: true,
          currentRushJobs: 0,
          maxRushJobs: 10
        });
      } catch (error) {
        setRushJobInfo({
          canCreate: true,
          currentRushJobs: 0,
          maxRushJobs: 10
        });
      }
    };
    
    loadData();
  }, []);

  // Auto-detect if item is a ring based on description
  useEffect(() => {
    const isRingCategory = SIZEABLE_CATEGORIES.some(cat => 
      formData.description?.toLowerCase().includes(cat) || 
      formData.description?.toLowerCase().includes('ring')
    );
    
    setFormData(prev => ({ ...prev, isRing: isRingCategory }));
  }, [formData.description]);

  // Sync wholesale status from props and recalculate prices
  const prevWholesaleProp = useRef(isWholesale);
  useEffect(() => {
    // Only update if the prop actually changed, not the form state
    if (prevWholesaleProp.current !== isWholesale) {
      prevWholesaleProp.current = isWholesale;
      setFormData(prev => ({
        ...prev,
        isWholesale: isWholesale
      }));
      // Recalculate prices with new wholesale status
      setTimeout(() => {
        recalculateAllItemPrices(isWholesale);
      }, 0);
    }
  }, [isWholesale]); // Only depend on the prop, not the form state

  // Recalculate prices when metal type or karat changes
  const prevMetalType = useRef(formData.metalType);
  const prevKarat = useRef(formData.karat);
  useEffect(() => {
    const metalTypeChanged = prevMetalType.current !== formData.metalType;
    const karatChanged = prevKarat.current !== formData.karat;
    
    if ((metalTypeChanged || karatChanged) && formData.metalType && formData.karat) {
      // Update refs
      prevMetalType.current = formData.metalType;
      prevKarat.current = formData.karat;
      
      // Recalculate prices for all existing items
      if (formData.tasks.length > 0 || formData.processes.length > 0 || formData.materials.length > 0) {
        setTimeout(() => {
          recalculateItemPricesForMetal(formData.metalType, formData.karat);
        }, 0);
      }
    }
  }, [formData.metalType, formData.karat, formData.tasks.length, formData.processes.length, formData.materials.length]);

  // Get karat options based on selected metal
  const getKaratOptions = () => {
    const metalConfig = METAL_TYPES.find(m => m.value === formData.metalType);
    return metalConfig?.karatOptions || [];
  };

  // Calculate total cost with admin settings
  const calculateTotalCost = useCallback(async () => {
    // If admin settings aren't loaded yet, throw error
    if (adminSettingsLoading) {
      throw new Error('Admin settings are still loading. Please wait.');
    }
    
    if (adminSettingsError) {
      throw new Error(`Cannot calculate total cost: ${adminSettingsError}`);
    }
    
    if (!adminSettings) {
      throw new Error('Admin settings are not available. Cannot calculate total cost.');
    }
    
    const tasksCost = formData.tasks.reduce((sum, item) => 
      sum + (parseFloat(item.price || item.basePrice || 0) * (item.quantity || 1)), 0);
    const processesCost = formData.processes.reduce((sum, item) => 
      sum + (parseFloat(item.price || item.pricing?.totalCost || 0) * (item.quantity || 1)), 0);
    const materialsCost = formData.materials.reduce((sum, item) => 
      sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
    const customCost = formData.customLineItems.reduce((sum, item) => 
      sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
    
    let subtotal = tasksCost + processesCost + materialsCost + customCost;
    
    // Note: Individual item prices are already discounted by recalculateAllItemPrices()
    // for wholesale clients, so no additional discount needed here

    // Apply rush job markup if applicable
    if (formData.isRush && adminSettings.rushMultiplier) {
      subtotal = subtotal * adminSettings.rushMultiplier;
    }

    // Add delivery fee if applicable (not subject to wholesale discount)
    if (formData.includeDelivery && adminSettings.deliveryFee) {
      subtotal = subtotal + adminSettings.deliveryFee;
    }

    // Add tax if applicable (wholesale clients don't pay taxes)
    if (formData.includeTax && !formData.isWholesale && adminSettings.taxRate) {
      subtotal = subtotal * (1 + adminSettings.taxRate);
    }
    
    return subtotal;
  }, [formData.tasks, formData.processes, formData.materials, formData.customLineItems, formData.isWholesale, formData.isRush, formData.includeDelivery, formData.includeTax, adminSettings, adminSettingsLoading, adminSettingsError]);

  // Add item handlers
  const addTask = (task) => {
    // Get metal-specific price based on repair's metal type and karat
    const price = getMetalSpecificPrice(task, formData.metalType, formData.karat, formData.isWholesale, adminSettings);
    
    const newTask = {
      ...task,
      id: Date.now(),
      quantity: 1,
      price: price,
      metalType: formData.metalType,
      karat: formData.karat,
      isMetalSpecific: !!task.universalPricing
    };
    
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
  };

  const addProcess = (process) => {
    // Get metal-specific price based on repair's metal type and karat
    const price = getMetalSpecificPrice(process, formData.metalType, formData.karat, formData.isWholesale, adminSettings);
    
    const newProcess = {
      ...process,
      id: Date.now(),
      quantity: 1,
      price: price,
      metalType: formData.metalType,
      karat: formData.karat,
      isMetalSpecific: !!process.pricing?.totalCost && typeof process.pricing.totalCost === 'object'
    };
    
    setFormData(prev => ({
      ...prev,
      processes: [...prev.processes, newProcess]
    }));
  };

  const addMaterial = (material) => {
    // Get metal-specific price based on repair's metal type and karat
    const price = getMetalSpecificPrice(material, formData.metalType, formData.karat, formData.isWholesale, adminSettings);
    
    const newMaterial = {
      ...material,
      id: Date.now(),
      quantity: 1,
      price: price,
      metalType: formData.metalType,
      karat: formData.karat,
      isMetalSpecific: material.isMetalDependent || !!material.stullerProducts?.length
    };
    
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial]
    }));
  };

  const addCustomLineItem = () => {
    const newItem = {
      id: Date.now(),
      description: '',
      quantity: 1,
      price: 0
    };
    setFormData(prev => ({
      ...prev,
      customLineItems: [...prev.customLineItems, newItem]
    }));
  };

  // Recalculate all item prices when wholesale status changes
  const recalculateAllItemPrices = (isWholesale) => {
    
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, index) => {
        const newPrice = getMetalSpecificPrice(task, prev.metalType, prev.karat, isWholesale, adminSettings);
        return {
          ...task,
          price: newPrice
        };
      }),
      processes: prev.processes.map((process, index) => {
        const newPrice = getMetalSpecificPrice(process, prev.metalType, prev.karat, isWholesale, adminSettings);
        return {
          ...process,
          price: newPrice
        };
      }),
      materials: prev.materials.map((material, index) => {
        const newPrice = getMetalSpecificPrice(material, prev.metalType, prev.karat, isWholesale, adminSettings);
        return {
          ...material,
          price: newPrice
        };
      })
    }));
  };

  // Recalculate all item prices when metal type or karat changes
  const recalculateItemPricesForMetal = (metalType, karat) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, index) => {
        const newPrice = getMetalSpecificPrice(task, metalType, karat, prev.isWholesale, adminSettings);
        return {
          ...task,
          price: newPrice,
          metalType: metalType,
          karat: karat
        };
      }),
      processes: prev.processes.map((process, index) => {
        const newPrice = getMetalSpecificPrice(process, metalType, karat, prev.isWholesale, adminSettings);
        return {
          ...process,
          price: newPrice,
          metalType: metalType,
          karat: karat
        };
      }),
      materials: prev.materials.map((material, index) => {
        const newPrice = getMetalSpecificPrice(material, metalType, karat, prev.isWholesale, adminSettings);
        return {
          ...material,
          price: newPrice,
          metalType: metalType,
          karat: karat
        };
      })
    }));
  };

  // Stuller material integration
  const addStullerMaterial = async () => {
    if (!stullerSku.trim()) {
      setStullerError('Please enter a Stuller SKU');
      return;
    }

    setLoadingStuller(true);
    setStullerError('');

    try {
      // Fetch Stuller data
      const response = await fetch('/api/stuller/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemNumber: stullerSku.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Stuller data');
      }

      const stullerData = await response.json();

      // Get admin settings for markup calculation
      const settingsResponse = await fetch('/api/admin/settings');
      let adminSettings = {};
      let materialMarkup = 0; // No default markup - force proper admin settings
      
      if (settingsResponse.ok) {
        adminSettings = await settingsResponse.json();
        if (!adminSettings.pricing?.materialMarkup) {
          throw new Error('Admin settings missing material markup configuration');
        }
        materialMarkup = adminSettings.pricing.materialMarkup;
      } else {
        throw new Error('Failed to load admin settings for material pricing');
      }

      // Calculate marked up price
      const basePrice = stullerData.data.price || 0;
      const markedUpPrice = basePrice * materialMarkup;

      // Create material item for the repair
      const newMaterial = {
        id: Date.now(),
        name: stullerData.data.description,
        displayName: stullerData.data.description,
        description: `${stullerData.data.longDescription || stullerData.data.description} (Stuller: ${stullerSku})`,
        quantity: 1,
        price: markedUpPrice,
        unitCost: markedUpPrice,
        category: 'stuller_gemstone',
        supplier: 'Stuller',
        stuller_item_number: stullerSku,
        isStullerItem: true,
        stullerData: {
          originalPrice: basePrice,
          markup: materialMarkup,
          itemNumber: stullerSku,
          weight: stullerData.data.weight,
          dimensions: stullerData.data.dimensions,
          metal: stullerData.data.metal
        }
      };

      // Add to repair materials
      setFormData(prev => ({
        ...prev,
        materials: [...prev.materials, newMaterial]
      }));

      // Clear the SKU input
      setStullerSku('');

    } catch (error) {
      setStullerError(error.message);
    } finally {
      setLoadingStuller(false);
    }
  };

  // Remove item handlers
  const removeItem = (type, id) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  // Update item quantity/price
  const updateItem = (type, id, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      // Validation
      if (!formData.clientName.trim()) {
        throw new Error('Client name is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.promiseDate) {
        throw new Error('Promise date is required');
      }
      
      // Ring sizing validation
      if (formData.isRing) {
        if (!formData.currentRingSize) {
          throw new Error('Current ring size is required for ring repairs');
        }
        if (!formData.desiredRingSize) {
          throw new Error('Desired ring size is required for ring repairs');
        }
      }
      
      // Rush job validation
      if (formData.isRush && !rushJobInfo.canCreate) {
        throw new Error(`Cannot create rush job: ${rushJobInfo.currentRushJobs}/${rushJobInfo.maxRushJobs} rush jobs already active`);
      }

      // Prepare submission data with detailed pricing breakdown
      const totalCost = await calculateTotalCost();
      
      // Calculate pricing breakdown properly
      const tasksCost = formData.tasks.reduce((sum, item) => 
        sum + (parseFloat(item.price || item.basePrice || 0) * (item.quantity || 1)), 0);
      const processesCost = formData.processes.reduce((sum, item) => 
        sum + (parseFloat(item.price || item.pricing?.totalCost || 0) * (item.quantity || 1)), 0);
      const materialsCost = formData.materials.reduce((sum, item) => 
        sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
      const customCost = formData.customLineItems.reduce((sum, item) => 
        sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
      
      // Base subtotal (individual item prices are already wholesale-discounted if applicable)
      let subtotal = tasksCost + processesCost + materialsCost + customCost;
      
      // Note: No additional wholesale discount needed - individual prices are already adjusted
      
      // Validate admin settings before calculating fees
      if (!adminSettings) {
        throw new Error('Admin settings are not loaded. Cannot submit repair.');
      }
      
      // Calculate rush fee (applied to subtotal after wholesale discount)
      const rushFee = formData.isRush ? 
        subtotal * ((adminSettings.rushMultiplier || 0) - 1) : 0;
      
      // Calculate delivery fee (flat rate, not subject to wholesale discount)  
      const deliveryFee = formData.includeDelivery ? (adminSettings.deliveryFee || 0) : 0;
      
      // Calculate tax amount (applied to subtotal + rushFee + deliveryFee, wholesale exempt)
      const taxableAmount = subtotal + rushFee + deliveryFee;
      const taxAmount = (formData.includeTax && !formData.isWholesale) ? 
        taxableAmount * (adminSettings.taxRate || 0) : 0;

      const submissionData = {
        ...formData,
        totalCost,
        // Detailed pricing breakdown
        subtotal,
        rushFee,
        deliveryFee,
        taxAmount,
        taxRate: adminSettings.taxRate || 0,
        isWholesale: formData.isWholesale,
        includeDelivery: formData.includeDelivery,
        includeTax: formData.includeTax && !formData.isWholesale, // Store actual tax application
        
        // Add business name for wholesale clients
        businessName: (formData.isWholesale && clientInfo?.business) ? clientInfo.business : '',
        
        createdAt: new Date().toISOString(),
        status: 'RECEIVING' // Use legacy status for compatibility
      };

      // Submit the repair
      const result = await RepairsService.createRepair(submissionData);
      
      // ✅ Add the new repair to the repairs context immediately
      if (result && (result.repairID || result.newRepair?.repairID)) {
        const repairToAdd = result.newRepair || result;
        addRepair(repairToAdd);
      }
      
      onSubmit(result);
      
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new client
  const handleAddNewClient = async () => {
    setNewClientLoading(true);
    try {
      const clientToCreate = {
        firstName: newClientData.firstName.trim(),
        lastName: newClientData.lastName.trim(),
        name: `${newClientData.firstName.trim()} ${newClientData.lastName.trim()}`,
        email: newClientData.email.trim(),
        phoneNumber: newClientData.phone.trim() || null,
        role: newClientData.role || 'customer',
        status: 'unverified' // Default status for new clients
      };

      const createdClientResponse = await UsersService.createUser(clientToCreate);
      const createdClient = createdClientResponse.user || createdClientResponse;
      
      // Check if client is wholesale
      const isWholesaleClient = createdClient.role === 'wholesaler';
      
      // Add to available users list
      setAvailableUsers(prev => [...prev, createdClient]);
      
      // Auto-select the newly created client
      const clientName = createdClient.name || `${createdClient.firstName} ${createdClient.lastName}`.trim();
      setFormData(prev => ({
        ...prev,
        clientName: clientName,
        userID: createdClient._id || createdClient.id || createdClient.userID,
        isWholesale: isWholesaleClient
      }));

      // Trigger wholesale price recalculation if applicable
      if (isWholesaleClient) {
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
      alert('Failed to create new client: ' + (error.message || 'Unknown error'));
    } finally {
      setNewClientLoading(false);
    }
  };

  // Handle image capture
  const handleImageCapture = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, picture: file }));
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      {errors.submit && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errors.submit}
        </Alert>
      )}

      {adminSettingsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Admin Settings Error:</strong> {adminSettingsError}
          <br />
          <em>Pricing calculations will not work until admin settings are properly configured.</em>
        </Alert>
      )}

      {adminSettingsLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Loading admin settings for pricing calculations...
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <Stack spacing={4}>

          {/* Client Information Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
              Client Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={Array.isArray(availableUsers) ? availableUsers : []}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    if (option && typeof option === 'object') {
                      const label = option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email || '';
                      return label;
                    }
                    return '';
                  }}
                  value={formData.clientName}
                  onInputChange={(event, newInputValue) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      clientName: newInputValue || '',
                      userID: ''
                    }));
                  }}
                  onChange={(event, newValue) => {
                    if (newValue && typeof newValue === 'object') {
                      const clientName = newValue.name || `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim() || newValue.email || '';
                      const userID = newValue._id || newValue.id || '';
                      const isClientWholesale = newValue.role === 'wholesaler';
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        clientName,
                        userID,
                        isWholesale: isClientWholesale
                      }));

                      // Always trigger price recalculation for wholesale clients
                      // Use timeout to ensure state update completes first
                      setTimeout(() => {
                        recalculateAllItemPrices(isClientWholesale);
                      }, 0);

                      if (onWholesaleChange) {
                        onWholesaleChange(isClientWholesale);
                      }
                    } else if (typeof newValue === 'string') {
                      setFormData(prev => ({ 
                        ...prev, 
                        clientName: newValue,
                        userID: '',
                        isWholesale: false // Reset wholesale for manual entries
                      }));

                      if (onWholesaleChange) {
                        onWholesaleChange(false);
                      }
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      label="Client Name"
                      required
                      placeholder="Type to search clients..."
                      helperText="Start typing to search existing clients"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option._id || option.id || option}>
                      <Stack sx={{ width: '100%' }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2">
                            {option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim()}
                          </Typography>
                          {option.role === 'wholesaler' && (
                            <Chip 
                              label="Wholesale" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        {option.email && (
                          <Typography variant="caption" color="text.secondary">
                            📧 {option.email}
                          </Typography>
                        )}
                        {(option.phone || option.phoneNumber) && (
                          <Typography variant="caption" color="text.secondary">
                            📞 {option.phone || option.phoneNumber}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  )}
                  noOptionsText={
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        No existing clients found
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setShowNewClientDialog(true)}
                      >
                        Add New Client
                      </Button>
                    </Box>
                  }
                />
              </Grid>
              
              {/* Quick Add Client Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setShowNewClientDialog(true)}
                    sx={{ color: 'primary.main' }}
                  >
                    Add New Client
                  </Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Rush Job</Typography>
                    <Switch
                      checked={formData.isRush}
                      onChange={(e) => setFormData(prev => ({ ...prev, isRush: e.target.checked }))}
                      disabled={!rushJobInfo.canCreate && !formData.isRush}
                    />
                    {formData.isRush && adminSettings?.rushMultiplier && (
                      <Chip 
                        label={`×${adminSettings.rushMultiplier}`}
                        color="warning" 
                        size="small"
                        variant="filled"
                      />
                    )}
                  </Stack>
                  {!rushJobInfo.canCreate && (
                    <Typography variant="caption" color="error">
                      Rush jobs at capacity ({rushJobInfo.currentRushJobs}/{rushJobInfo.maxRushJobs})
                    </Typography>
                  )}
                  {rushJobInfo.canCreate && rushJobInfo.remainingSlots <= 2 && (
                    <Typography variant="caption" color="warning.main">
                      {rushJobInfo.remainingSlots} rush job slots remaining
                    </Typography>
                  )}
                  {formData.isRush && adminSettings?.rushMultiplier && (
                    <Typography variant="caption" color="text.secondary">
                      Rush jobs have {((adminSettings.rushMultiplier - 1) * 100).toFixed(0)}% markup
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Wholesale Client</Typography>
                    <Switch
                      checked={formData.isWholesale}
                      onChange={(e) => {
                        const newWholesaleStatus = e.target.checked;
                        // Update form data first
                        setFormData(prev => ({
                          ...prev,
                          isWholesale: newWholesaleStatus
                        }));
                        // Then trigger price recalculation
                        setTimeout(() => {
                          recalculateAllItemPrices(newWholesaleStatus);
                        }, 0);
                        if (onWholesaleChange) {
                          onWholesaleChange(newWholesaleStatus);
                        }
                      }}
                    />
                    {formData.isWholesale && (
                      <Chip 
                        label="50% OFF" 
                        color="primary" 
                        size="small"
                        variant="filled"
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="primary">
                    Automatically set when wholesale client selected
                  </Typography>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Include Delivery</Typography>
                    <Switch
                      checked={formData.includeDelivery}
                      onChange={(e) => setFormData(prev => ({ ...prev, includeDelivery: e.target.checked }))}
                    />
                    {formData.includeDelivery && adminSettings?.deliveryFee && (
                      <Chip 
                        label={`+$${adminSettings.deliveryFee.toFixed(2)}`}
                        color="info" 
                        size="small"
                        variant="filled"
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {adminSettings?.deliveryFee ? 
                      `Add $${adminSettings.deliveryFee.toFixed(2)} delivery fee to total cost (not subject to wholesale discount)` :
                      'Delivery fee will be calculated when admin settings load'
                    }
                  </Typography>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Include Tax</Typography>
                    <Switch
                      checked={formData.includeTax && !formData.isWholesale}
                      onChange={(e) => setFormData(prev => ({ ...prev, includeTax: e.target.checked }))}
                      disabled={formData.isWholesale}
                    />
                    {formData.includeTax && !formData.isWholesale && adminSettings?.taxRate && (
                      <Chip 
                        label={`+${(adminSettings.taxRate * 100).toFixed(2)}%`}
                        color="secondary" 
                        size="small"
                        variant="filled"
                      />
                    )}
                    {formData.isWholesale && (
                      <Chip 
                        label="TAX EXEMPT" 
                        color="success" 
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formData.isWholesale 
                      ? "Wholesale clients are tax exempt" 
                      : adminSettings?.taxRate 
                        ? `Apply ${(adminSettings.taxRate * 100).toFixed(2)}% tax rate to total cost`
                        : "Tax rate will be shown when admin settings load"
                    }
                  </Typography>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Item Details Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main', fontWeight: 600 }}>
              Item Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Promise Date"
                  type="date"
                  value={formData.promiseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, promiseDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                {/* Spacer for grid alignment */}
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Metal Type</InputLabel>
                  <Select
                    value={formData.metalType}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      metalType: e.target.value,
                      karat: '' // Reset karat when metal changes
                    }))}
                  >
                    {METAL_TYPES.map(metal => (
                      <MenuItem key={metal.value} value={metal.value}>
                        {metal.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {getKaratOptions().length > 0 && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Karat/Purity</InputLabel>
                    <Select
                      value={formData.karat}
                      onChange={(e) => setFormData(prev => ({ ...prev, karat: e.target.value }))}
                    >
                      {getKaratOptions().map(karat => (
                        <MenuItem key={karat} value={karat}>
                          {karat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Ring sizing toggle */}
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isRing}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        isRing: e.target.checked,
                        // Clear ring size fields when toggling off
                        currentRingSize: e.target.checked ? prev.currentRingSize : '',
                        desiredRingSize: e.target.checked ? prev.desiredRingSize : ''
                      }))}
                    />
                  }
                  label="This item is a ring (enable sizing fields)"
                />
              </Grid>

              {/* Ring sizing section */}
              {formData.isRing && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                      Ring Sizing
                    </Typography>
                    <Divider />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={RING_SIZES}
                      value={formData.currentRingSize}
                      onChange={(e, value) => setFormData(prev => ({ ...prev, currentRingSize: value }))}
                      renderInput={(params) => (
                        <TextField {...params} label="Current Ring Size" />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={RING_SIZES}
                      value={formData.desiredRingSize}
                      onChange={(e, value) => setFormData(prev => ({ ...prev, desiredRingSize: value }))}
                      renderInput={(params) => (
                        <TextField {...params} label="Desired Ring Size" />
                      )}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Customer notes, special instructions..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Internal Notes"
                  multiline
                  rows={2}
                  value={formData.internalNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                  placeholder="Internal team notes, not visible to customer..."
                />
              </Grid>
            </Grid>
          </Box>

          {/* Image Capture Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: 'info.main', fontWeight: 600 }}>
              Item Photo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Take or upload a photo of the item
            </Typography>
            
            <input
              type="file"
              accept="image/*"
              capture="camera"
              onChange={handleImageCapture}
              style={{ display: 'none' }}
              id="camera-input"
            />
            
            <Box sx={{ textAlign: 'center' }}>
              <label htmlFor="camera-input">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<PhotoCameraIcon />}
                  size="large"
                  sx={{ mb: 2 }}
                >
                  Take Photo
                </Button>
              </label>
              {formData.picture ? (
                <Stack direction="row" justifyContent="center" alignItems="center" spacing={2}>
                  <Chip 
                    label={formData.picture.name} 
                    color="success"
                    onDelete={() => setFormData(prev => ({ ...prev, picture: null }))}
                    deleteIcon={<DeleteIcon />}
                    sx={{ maxWidth: 200 }}
                  />
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No photo selected
                </Typography>
              )}
            </Box>
          </Box>

        {/* Work Items */}
        <RepairItemsSection
          formData={formData}
          setFormData={setFormData}
          availableTasks={availableTasks}
          availableProcesses={availableProcesses}
          availableMaterials={availableMaterials}
          addTask={addTask}
          addProcess={addProcess}
          addMaterial={addMaterial}
          addCustomLineItem={addCustomLineItem}
          removeItem={removeItem}
          updateItem={updateItem}
          stullerSku={stullerSku}
          setStullerSku={setStullerSku}
          loadingStuller={loadingStuller}
          stullerError={stullerError}
          addStullerMaterial={addStullerMaterial}
          adminSettings={adminSettings}
        />

        {/* Total Cost */}
        <TotalCostCard 
          formData={formData}
          calculateTotalCost={calculateTotalCost}
          adminSettings={adminSettings}
        />
        </Stack>
      </Paper>

      {/* New Client Dialog */}
      <Dialog 
        open={showNewClientDialog} 
        onClose={newClientLoading ? undefined : () => setShowNewClientDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="First Name"
              value={newClientData.firstName}
              onChange={(e) => setNewClientData(prev => ({ ...prev, firstName: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Last Name" 
              value={newClientData.lastName}
              onChange={(e) => setNewClientData(prev => ({ ...prev, lastName: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newClientData.email}
              onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
              required
              helperText="Email is required for client identification"
            />
            <TextField
              fullWidth
              label="Phone"
              type="tel"
              value={newClientData.phone}
              onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
            <FormControl fullWidth required>
              <InputLabel>Client Role</InputLabel>
              <Select
                value={newClientData.role}
                label="Client Role"
                onChange={(e) => setNewClientData(prev => ({ ...prev, role: e.target.value }))}
              >
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="wholesaler">Wholesaler</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            {newClientData.role === 'wholesaler' && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Wholesale clients receive 50% discount and are tax exempt
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowNewClientDialog(false)}
            disabled={newClientLoading}
          >
            Cancel
          </Button>
          <LoadingButton 
            onClick={handleAddNewClient}
            loading={newClientLoading}
            variant="contained"
            disabled={!newClientData.firstName.trim() || !newClientData.lastName.trim() || !newClientData.email.trim()}
          >
            {newClientLoading ? 'Creating...' : 'Add Client'}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Save Button at Bottom */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading}
          startIcon={<SaveIcon />}
          size="large"
          sx={{ 
            minWidth: 200,
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600
          }}
        >
          {loading ? 'Saving...' : 'Save Repair'}
        </Button>
      </Box>
    </Box>
  );
}

// Separate component for repair items to keep main component manageable
function RepairItemsSection({
  formData,
  setFormData,
  availableTasks,
  availableProcesses,
  availableMaterials,
  addTask,
  addProcess,
  addMaterial,
  addCustomLineItem,
  removeItem,
  updateItem,
  stullerSku,
  setStullerSku,
  loadingStuller,
  stullerError,
  addStullerMaterial,
  adminSettings
}) {
  const [expandedSection, setExpandedSection] = useState('tasks');

  // Filter and prepare items based on metal compatibility
  const metalType = formData.metalType;
  const karat = formData.karat;
  const isWholesale = formData.isWholesale;

  // Filter tasks that support the selected metal type
  const compatibleTasks = availableTasks.filter(task => 
    supportsMetalType(task, metalType, karat)
  );

  // Filter processes that support the selected metal type
  const compatibleProcesses = availableProcesses.filter((process, index) => {
    const isSupported = supportsMetalType(process, metalType, karat);
    return isSupported;
  });
  
  // Filter materials that support the selected metal type
  const compatibleMaterials = availableMaterials.filter((material, index) => {
    const isSupported = supportsMetalType(material, metalType, karat);
    return isSupported;
  });
  
  // Get price display helper
  const getPriceDisplay = (item) => {
    if (!metalType || !karat) return '0.00';
    const price = getMetalSpecificPrice(item, metalType, karat, isWholesale, adminSettings);
    return price.toFixed(2);
  };

  return (
    <Card sx={{ borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <CardHeader 
        title="Work Items & Pricing"
        subheader="Add tasks, processes, materials and custom items"
        sx={{ 
          bgcolor: 'success.main', 
          color: 'success.contrastText',
          '& .MuiCardHeader-title': { 
            fontWeight: 600,
            fontSize: '1.1rem'
          },
          '& .MuiCardHeader-subheader': { 
            color: 'success.contrastText',
            opacity: 0.8
          }
        }}
      />
      <CardContent sx={{ p: 0 }}>
        {/* Tasks Section */}
        <Accordion 
          expanded={expandedSection === 'tasks'}
          onChange={(e, isExpanded) => setExpandedSection(isExpanded ? 'tasks' : false)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              Tasks ({formData.tasks.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {!metalType || !karat ? (
                <Alert severity="info">
                  Please select a metal type and karat above to see available tasks.
                </Alert>
              ) : compatibleTasks.length === 0 ? (
                <Alert severity="warning">
                  No tasks are compatible with {metalType} {karat}. You can still add custom line items.
                </Alert>
              ) : (
                <Autocomplete
                  options={compatibleTasks}
                  getOptionLabel={(option) => {
                    const price = getPriceDisplay(option);
                    const metalInfo = option.isUniversal ? ` (Universal)` : '';
                    return `${option.title} - $${price}${metalInfo}`;
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label={`Add Task (${compatibleTasks.length} compatible with ${metalType} ${karat})`}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography variant="body1">
                          {option.title}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {option.category}
                            {option.isUniversal && (
                              <Chip label="Universal" size="small" color="primary" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            ${getPriceDisplay(option)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  onChange={(e, value) => value && addTask(value)}
                />
              )}
              
              {formData.tasks.map(task => (
                <TaskItem
                  key={task.id}
                  item={task}
                  onQuantityChange={(qty) => updateItem('tasks', task.id, 'quantity', qty)}
                  onPriceChange={(price) => updateItem('tasks', task.id, 'price', price)}
                  onRemove={() => removeItem('tasks', task.id)}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Processes Section */}
        <Accordion 
          expanded={expandedSection === 'processes'}
          onChange={(e, isExpanded) => setExpandedSection(isExpanded ? 'processes' : false)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              Processes ({formData.processes.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {!metalType || !karat ? (
                <Alert severity="info">
                  Please select a metal type and karat above to see available processes.
                </Alert>
              ) : compatibleProcesses.length === 0 ? (
                <Alert severity="warning">
                  No processes are compatible with {metalType} {karat}. You can still add custom line items.
                </Alert>
              ) : (
                <Autocomplete
                  options={compatibleProcesses}
                  getOptionLabel={(option) => {
                    const price = getPriceDisplay(option);
                    const metalInfo = option.pricing?.totalCost && typeof option.pricing.totalCost === 'object' ? ` (Metal-specific)` : '';
                    return `${option.displayName} - $${price}${metalInfo}`;
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label={`Add Process (${compatibleProcesses.length} compatible with ${metalType} ${karat})`}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography variant="body1">
                          {option.displayName}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {option.category} • {option.laborHours}h • {option.skillLevel}
                            {option.pricing?.totalCost && typeof option.pricing.totalCost === 'object' && (
                              <Chip label="Metal-specific" size="small" color="info" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            ${getPriceDisplay(option)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  onChange={(e, value) => value && addProcess(value)}
                />
              )}
              
              {formData.processes.map(process => (
                <TaskItem
                  key={process.id}
                  item={process}
                  onQuantityChange={(qty) => updateItem('processes', process.id, 'quantity', qty)}
                  onPriceChange={(price) => updateItem('processes', process.id, 'price', price)}
                  onRemove={() => removeItem('processes', process.id)}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Materials Section */}
        <Accordion 
          expanded={expandedSection === 'materials'}
          onChange={(e, isExpanded) => setExpandedSection(isExpanded ? 'materials' : false)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              Materials ({formData.materials.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {!metalType || !karat ? (
                <Alert severity="info">
                  Please select a metal type and karat above to see available materials.
                </Alert>
              ) : compatibleMaterials.length === 0 ? (
                <Alert severity="warning">
                  No materials are compatible with {metalType} {karat}. You can still add Stuller materials or custom line items.
                </Alert>
              ) : (
                <Autocomplete
                  options={compatibleMaterials}
                  getOptionLabel={(option) => {
                    const price = getPriceDisplay(option);
                    const metalInfo = (option.pricing?.unitCost && typeof option.pricing.unitCost === 'object') ||
                                     (option.pricing?.costPerPortion && typeof option.pricing.costPerPortion === 'object') ? 
                                     ` (Metal-specific)` : '';
                    return `${option.name} - $${price}${metalInfo}`;
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label={`Add Material (${compatibleMaterials.length} compatible with ${metalType} ${karat})`}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography variant="body1">
                          {option.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {option.unit} • {option.category || 'Material'}
                            {((option.pricing?.unitCost && typeof option.pricing.unitCost === 'object') ||
                              (option.pricing?.costPerPortion && typeof option.pricing.costPerPortion === 'object')) && (
                              <Chip label="Metal-specific" size="small" color="info" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            ${getPriceDisplay(option)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  onChange={(e, value) => value && addMaterial(value)}
                />
              )}
              
              {/* Stuller Integration Section */}
              <Card variant="outlined" sx={{ p: 2, bgcolor: 'primary.50', borderColor: 'primary.main' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                  Add Stuller Gemstone/Material
                </Typography>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <TextField
                    label="Stuller SKU"
                    value={stullerSku}
                    onChange={(e) => setStullerSku(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addStullerMaterial()}
                    placeholder="Enter Stuller item number..."
                    size="small"
                    sx={{ flexGrow: 1 }}
                    error={!!stullerError}
                    helperText={stullerError}
                  />
                  <LoadingButton
                    onClick={addStullerMaterial}
                    loading={loadingStuller}
                    disabled={!stullerSku.trim()}
                    variant="contained"
                    size="small"
                    sx={{ minWidth: 100 }}
                  >
                    Add
                  </LoadingButton>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Material will be added with markup applied. No portions logic needed for gemstones.
                </Typography>
              </Card>
              
              {formData.materials.map(material => (
                <TaskItem
                  key={material.id}
                  item={material}
                  onQuantityChange={(qty) => updateItem('materials', material.id, 'quantity', qty)}
                  onPriceChange={(price) => updateItem('materials', material.id, 'price', price)}
                  onRemove={() => removeItem('materials', material.id)}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Custom Line Items */}
        <Accordion 
          expanded={expandedSection === 'custom'}
          onChange={(e, isExpanded) => setExpandedSection(isExpanded ? 'custom' : false)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              Custom Items ({formData.customLineItems.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Button 
                startIcon={<AddIcon />}
                onClick={addCustomLineItem}
                variant="outlined"
              >
                Add Custom Item
              </Button>
              
              {formData.customLineItems.map(item => (
                <CustomLineItem
                  key={item.id}
                  item={item}
                  onDescriptionChange={(desc) => updateItem('customLineItems', item.id, 'description', desc)}
                  onQuantityChange={(qty) => updateItem('customLineItems', item.id, 'quantity', qty)}
                  onPriceChange={(price) => updateItem('customLineItems', item.id, 'price', price)}
                  onRemove={() => removeItem('customLineItems', item.id)}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// Task/Process/Material item component
function TaskItem({ item, onQuantityChange, onPriceChange, onRemove }) {
  return (
    <Paper sx={{ p: 2, border: item.isStullerItem ? '1px solid #1976d2' : undefined }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle1">
              {item.title || item.displayName || item.name}
            </Typography>
            {item.isStullerItem && (
              <Chip 
                label="Stuller" 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            )}
          </Stack>
          {item.description && (
            <Typography variant="body2" color="text.secondary">
              {item.description}
            </Typography>
          )}
          {item.isStullerItem && item.stullerData && (
            <Typography variant="caption" color="primary">
              SKU: {item.stullerData.itemNumber} | 
              Base: ${item.stullerData.originalPrice} | 
              Markup: {((item.stullerData.markup - 1) * 100).toFixed(0)}%
            </Typography>
          )}
        </Box>
        
        <TextField
          type="number"
          label="Qty"
          value={item.quantity}
          onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          sx={{ width: 80 }}
          inputProps={{ min: 1 }}
        />
        
        <TextField
          type="number"
          label="Price"
          value={item.price}
          onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
          sx={{ width: 100 }}
          inputProps={{ min: 0, step: 0.01 }}
        />
        
        <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
          ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
        </Typography>
        
        <IconButton color="error" onClick={onRemove}>
          <DeleteIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}

// Custom line item component
function CustomLineItem({ 
  item, 
  onDescriptionChange, 
  onQuantityChange, 
  onPriceChange, 
  onRemove 
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <TextField
          fullWidth
          label="Description"
          value={item.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Custom work description..."
        />
        
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            type="number"
            label="Quantity"
            value={item.quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
            sx={{ width: 100 }}
            inputProps={{ min: 1 }}
          />
          
          <TextField
            type="number"
            label="Price"
            value={item.price}
            onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
            sx={{ width: 120 }}
            inputProps={{ min: 0, step: 0.01 }}
          />
          
          <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
            Total: ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
          </Typography>
          
          <IconButton color="error" onClick={onRemove}>
            <DeleteIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
}

// Total cost card with rush job information
function TotalCostCard({ formData, calculateTotalCost, adminSettings }) {
  const [totalCost, setTotalCost] = React.useState(0);
  const [costBreakdown, setCostBreakdown] = React.useState({
    subtotal: 0,
    wholesaleDiscount: 0,
    rushFee: 0,
    deliveryFee: 0,
    taxAmount: 0,
    final: 0
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const updateTotal = async () => {
      setLoading(true);
      try {
        // Calculate detailed breakdown
        const tasksCost = formData.tasks.reduce((sum, item) => 
          sum + (parseFloat(item.price || item.basePrice || 0) * (item.quantity || 1)), 0);
        const processesCost = formData.processes.reduce((sum, item) => 
          sum + (parseFloat(item.price || item.pricing?.totalCost || 0) * (item.quantity || 1)), 0);
        const materialsCost = formData.materials.reduce((sum, item) => 
          sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
        const customCost = formData.customLineItems.reduce((sum, item) => 
          sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
        
        let originalSubtotal = tasksCost + processesCost + materialsCost + customCost;
        
        let currentTotal = originalSubtotal;
        let wholesaleDiscount = 0;
        let rushFee = 0;
        let deliveryFee = 0;
        let taxAmount = 0;

        // Note: Individual item prices are already discounted by recalculateAllItemPrices()
        // So we should NOT apply another wholesale discount here
        if (formData.isWholesale) {
          // For display purposes only - calculate what the discount would have been
          // if we had full retail prices, but don't apply it since items are already discounted
          const retailSubtotal = originalSubtotal * 2; // Reverse the already-applied 50% discount
          wholesaleDiscount = retailSubtotal * 0.5;
          // currentTotal stays the same since individual items are already discounted
        }

        // Apply rush job markup if applicable
        if (formData.isRush && adminSettings?.rushMultiplier) {
          const beforeRush = currentTotal;
          currentTotal = currentTotal * adminSettings.rushMultiplier;
          rushFee = currentTotal - beforeRush;
        }

        // Add delivery fee if applicable (not subject to wholesale discount)
        if (formData.includeDelivery && adminSettings?.deliveryFee) {
          deliveryFee = adminSettings.deliveryFee;
          currentTotal = currentTotal + deliveryFee;
        }

        // Add tax if applicable (wholesale clients don't pay taxes)
        if (formData.includeTax && !formData.isWholesale && adminSettings?.taxRate) {
          taxAmount = currentTotal * adminSettings.taxRate;
          currentTotal = currentTotal + taxAmount;
        }

        setCostBreakdown({
          subtotal: originalSubtotal,
          wholesaleDiscount,
          rushFee,
          deliveryFee,
          taxAmount,
          final: currentTotal
        });

        const cost = await calculateTotalCost();
        setTotalCost(cost);
      } catch (error) {
        setTotalCost(0);
      } finally {
        setLoading(false);
      }
    };

    updateTotal();
  }, [formData.tasks, formData.processes, formData.materials, formData.customLineItems, formData.isWholesale, formData.isRush, formData.includeDelivery, formData.includeTax, calculateTotalCost, adminSettings]);

  return (
    <Card sx={{ 
      borderRadius: 2, 
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      border: '2px solid',
      borderColor: 'warning.main'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Main Total */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Total Cost: {loading ? (
                <Box component="span" sx={{ color: 'warning.main' }}>Calculating...</Box>
              ) : (
                <Box component="span" sx={{ color: 'success.main', fontSize: '1.4em' }}>
                  ${totalCost.toFixed(2)}
                </Box>
              )}
            </Typography>
            <Stack direction="row" spacing={1}>
              {formData.isWholesale && (
                <Chip label="Wholesale (50% off)" color="primary" variant="outlined" size="small" />
              )}
              {formData.isRush && adminSettings?.rushMultiplier && (
                <Chip label={`Rush (×${adminSettings.rushMultiplier})`} color="warning" variant="outlined" size="small" />
              )}
              {formData.includeDelivery && adminSettings?.deliveryFee && (
                <Chip label={`Delivery (+$${adminSettings.deliveryFee.toFixed(2)})`} color="info" variant="outlined" size="small" />
              )}
              {formData.includeTax && !formData.isWholesale && adminSettings?.taxRate && (
                <Chip label={`Tax (+${(adminSettings.taxRate * 100).toFixed(2)}%)`} color="secondary" variant="outlined" size="small" />
              )}
              {formData.isWholesale && (
                <Chip label="Tax Exempt" color="success" variant="outlined" size="small" />
              )}
            </Stack>
          </Stack>
          
          {/* Detailed Cost Breakdown */}
          {!loading && costBreakdown.subtotal > 0 && (
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'grey.50', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                Cost Breakdown:
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Services & Materials:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    ${costBreakdown.subtotal.toFixed(2)}
                  </Typography>
                </Stack>
                
                {formData.isWholesale && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'primary.main' }}>
                    <Typography variant="body2">Wholesale Discount (50% off):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      -${costBreakdown.wholesaleDiscount.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                
                {formData.isRush && costBreakdown.rushFee > 0 && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'warning.main' }}>
                    <Typography variant="body2">Rush Job Fee (×{adminSettings.rushMultiplier}):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      +${costBreakdown.rushFee.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                
                {formData.includeDelivery && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'info.main' }}>
                    <Typography variant="body2">Delivery Fee:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      +${costBreakdown.deliveryFee.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                
                {formData.includeTax && !formData.isWholesale && costBreakdown.taxAmount > 0 && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'secondary.main' }}>
                    <Typography variant="body2">Tax ({(adminSettings.taxRate * 100).toFixed(2)}%):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      +${costBreakdown.taxAmount.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                
                {formData.isWholesale && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'success.main' }}>
                    <Typography variant="body2">Tax (Wholesale Exempt):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      $0.00
                    </Typography>
                  </Stack>
                )}
                
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Final Total:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main', fontSize: '1.1em' }}>
                    ${costBreakdown.final.toFixed(2)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}
          
          {(formData.isRush || formData.isWholesale || formData.includeDelivery || (formData.includeTax && !formData.isWholesale)) && (
            <Typography variant="body2" color="text.secondary">
              {[
                formData.isWholesale && 'wholesale discount',
                formData.isRush && 'rush job markup', 
                formData.includeDelivery && 'delivery fee',
                (formData.includeTax && !formData.isWholesale) && 'tax',
                formData.isWholesale && 'tax exemption'
              ].filter(Boolean).length > 1 
                ? `Price includes: ${[
                    formData.isWholesale && '50% wholesale discount',
                    formData.isRush && 'rush job markup', 
                    formData.includeDelivery && 'delivery fee',
                    (formData.includeTax && !formData.isWholesale) && 'tax',
                    formData.isWholesale && 'tax exemption'
                  ].filter(Boolean).join(', ')}`
                : formData.isWholesale 
                ? 'Price includes 50% wholesale discount (tax exempt)'
                : formData.isRush 
                ? 'Price includes rush job markup'
                : formData.includeDelivery
                ? 'Price includes delivery fee'
                : 'Price includes tax'
              }
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
