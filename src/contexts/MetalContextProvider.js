/**
 * MetalContextProvider.js - React context for metal context cascading
 * 
 * Provides metal context state management for repair tickets and task pricing.
 * Handles the cascade of metal type/karat from repair ticket to task pricing selection.
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { MetalContextService } from '../services/MetalContextService';

// Initial state
const initialState = {
  // Current metal context (from repair ticket)
  currentMetalContext: {
    metalType: 'gold',
    karat: '14k'
  },
  
  // Available metal options
  availableMetals: MetalContextService.getAllSupportedMetals(),
  
  // UI state
  isLoading: false,
  error: null,
  
  // Cache for supported metals per task
  taskMetalCache: new Map()
};

// Action types
const METAL_CONTEXT_ACTIONS = {
  SET_METAL_CONTEXT: 'SET_METAL_CONTEXT',
  SET_METAL_TYPE: 'SET_METAL_TYPE', 
  SET_KARAT: 'SET_KARAT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CACHE_TASK_METALS: 'CACHE_TASK_METALS',
  CLEAR_CACHE: 'CLEAR_CACHE'
};

// Reducer
function metalContextReducer(state, action) {
  switch (action.type) {
    case METAL_CONTEXT_ACTIONS.SET_METAL_CONTEXT:
      try {
        MetalContextService.validateMetalContext(action.payload);
        return {
          ...state,
          currentMetalContext: action.payload,
          error: null
        };
      } catch (error) {
        return {
          ...state,
          error: error.message
        };
      }

    case METAL_CONTEXT_ACTIONS.SET_METAL_TYPE:
      const newMetalType = action.payload;
      const supportedKarats = MetalContextService.getSupportedKarats(newMetalType);
      
      // If current karat is not supported by new metal type, use first supported karat
      const newKarat = supportedKarats.includes(state.currentMetalContext.karat) 
        ? state.currentMetalContext.karat 
        : supportedKarats[0];

      return {
        ...state,
        currentMetalContext: {
          metalType: newMetalType,
          karat: newKarat
        },
        error: null
      };

    case METAL_CONTEXT_ACTIONS.SET_KARAT:
      try {
        const newContext = {
          ...state.currentMetalContext,
          karat: action.payload
        };
        MetalContextService.validateMetalContext(newContext);
        
        return {
          ...state,
          currentMetalContext: newContext,
          error: null
        };
      } catch (error) {
        return {
          ...state,
          error: error.message
        };
      }

    case METAL_CONTEXT_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case METAL_CONTEXT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case METAL_CONTEXT_ACTIONS.CACHE_TASK_METALS:
      const newCache = new Map(state.taskMetalCache);
      newCache.set(action.payload.taskId, action.payload.metals);
      return {
        ...state,
        taskMetalCache: newCache
      };

    case METAL_CONTEXT_ACTIONS.CLEAR_CACHE:
      return {
        ...state,
        taskMetalCache: new Map()
      };

    default:
      return state;
  }
}

// Context
const MetalContext = createContext();

// Provider component
export function MetalContextProvider({ children, initialMetalContext = null }) {
  const [state, dispatch] = useReducer(metalContextReducer, {
    ...initialState,
    currentMetalContext: initialMetalContext || initialState.currentMetalContext
  });

  // Actions
  const actions = {
    // Set complete metal context
    setMetalContext: (metalContext) => {
      dispatch({
        type: METAL_CONTEXT_ACTIONS.SET_METAL_CONTEXT,
        payload: metalContext
      });
    },

    // Set metal type (auto-adjusts karat if needed)
    setMetalType: (metalType) => {
      dispatch({
        type: METAL_CONTEXT_ACTIONS.SET_METAL_TYPE,
        payload: metalType
      });
    },

    // Set karat for current metal type
    setKarat: (karat) => {
      dispatch({
        type: METAL_CONTEXT_ACTIONS.SET_KARAT,
        payload: karat
      });
    },

    // Get current metal key
    getCurrentMetalKey: () => {
      const { metalType, karat } = state.currentMetalContext;
      return MetalContextService.formatMetalKey(metalType, karat);
    },

    // Get current display name
    getCurrentDisplayName: () => {
      const { metalType, karat } = state.currentMetalContext;
      return MetalContextService.getDisplayName(metalType, karat);
    },

    // Get available karats for current metal type
    getAvailableKarats: () => {
      return MetalContextService.getSupportedKarats(state.currentMetalContext.metalType);
    },

    // Get karat options for current metal type
    getKaratOptions: () => {
      return MetalContextService.getKaratOptions(state.currentMetalContext.metalType);
    },

    // Get metal type options
    getMetalTypeOptions: () => {
      return MetalContextService.getMetalTypeOptions();
    },

    // Check if metal context is supported
    isSupported: (metalType, karat) => {
      return MetalContextService.isSupported(metalType, karat);
    },

    // Cache supported metals for a task
    cacheTaskMetals: (taskId, metals) => {
      dispatch({
        type: METAL_CONTEXT_ACTIONS.CACHE_TASK_METALS,
        payload: { taskId, metals }
      });
    },

    // Get cached metals for a task
    getCachedTaskMetals: (taskId) => {
      return state.taskMetalCache.get(taskId);
    },

    // Clear metal cache
    clearCache: () => {
      dispatch({
        type: METAL_CONTEXT_ACTIONS.CLEAR_CACHE
      });
    },

    // Set loading state
    setLoading: (loading) => {
      dispatch({
        type: METAL_CONTEXT_ACTIONS.SET_LOADING,
        payload: loading
      });
    },

    // Set error
    setError: (error) => {
      dispatch({
        type: METAL_CONTEXT_ACTIONS.SET_ERROR,
        payload: error
      });
    }
  };

  // Effect to validate initial metal context
  useEffect(() => {
    try {
      MetalContextService.validateMetalContext(state.currentMetalContext);
    } catch (error) {
      dispatch({
        type: METAL_CONTEXT_ACTIONS.SET_ERROR,
        payload: `Invalid initial metal context: ${error.message}`
      });
    }
  }, []);

  return (
    <MetalContext.Provider value={{ ...state, ...actions }}>
      {children}
    </MetalContext.Provider>
  );
}

// Hook to use metal context
export function useMetalContext() {
  const context = useContext(MetalContext);
  
  if (!context) {
    throw new Error('useMetalContext must be used within a MetalContextProvider');
  }
  
  return context;
}

// HOC for components that need metal context
export function withMetalContext(Component) {
  return function MetalContextWrapper(props) {
    return (
      <MetalContextProvider>
        <Component {...props} />
      </MetalContextProvider>
    );
  };
}

// Hook for task-specific metal context operations
export function useTaskMetalContext(taskId) {
  const metalContext = useMetalContext();
  
  return {
    ...metalContext,
    
    // Get price for current metal context
    getCurrentPrice: async (pricing) => {
      const { metalType, karat } = metalContext.currentMetalContext;
      const { PricingService } = await import('../services/PricingService');
      return PricingService.getPriceForMetal(pricing, metalType, karat);
    },
    
    // Get formatted price for current metal context
    getCurrentFormattedPrice: async (pricing) => {
      const { metalType, karat } = metalContext.currentMetalContext;
      const { PricingService } = await import('../services/PricingService');
      return PricingService.getFormattedPriceForMetal(pricing, metalType, karat);
    },
    
    // Check if current metal context is supported by task
    isCurrentMetalSupported: async (pricing) => {
      const { metalType, karat } = metalContext.currentMetalContext;
      const { PricingService } = await import('../services/PricingService');
      return PricingService.hasPricingForMetal(pricing, metalType, karat);
    }
  };
}
