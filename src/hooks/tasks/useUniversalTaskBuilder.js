import { useState, useEffect } from 'react';
/**
 * UniversalTaskBuilder.js - Enhanced task builder with universal pricing
 * 
 * Modular components that preserve your existing process-based task builder UI
 * while adding universal pricing and metal context support.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Alert, 
  Card,
  CardContent,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { MetalContextProvider, useMetalContext } from '../../../contexts/MetalContextProvider';
import { TaskService } from '../../../services/TaskService';
import { PricingService } from '../../../services/PricingService';

// Metal Context Display Component
export function MetalContextDisplay({ showSelector = true, compact = false }) {
  const {
    currentMetalContext,
    getCurrentDisplayName,
    getMetalTypeOptions,
    getKaratOptions,
    setMetalType,
    setKarat,
    error
  } = useMetalContext();

  if (compact) {
        return { activeTab, setActiveTab, taskDetails, setTaskDetails, selectedMetals, setSelectedMetals, materials, setMaterials, handleTabChange, handleTaskDetailsChange, handleMetalToggle, handleMaterialChange, calculatePrice };
