import { MetalContextService } from '../services/MetalContextService';

// Initial state
export const initialState = {
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
export const METAL_CONTEXT_ACTIONS = {
  SET_METAL_CONTEXT: 'SET_METAL_CONTEXT',
  SET_METAL_TYPE: 'SET_METAL_TYPE', 
  SET_KARAT: 'SET_KARAT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CACHE_TASK_METALS: 'CACHE_TASK_METALS',
  CLEAR_CACHE: 'CLEAR_CACHE'
};

// Reducer
export function metalContextReducer(state, action) {
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
