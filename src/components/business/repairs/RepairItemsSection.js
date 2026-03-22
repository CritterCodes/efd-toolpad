import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { useRepairItemsSection } from '@/hooks/repairs/useRepairItemsSection';

import RepairTasksAccordion from './RepairTasksAccordion';
import RepairProcessesAccordion from './RepairProcessesAccordion';
import RepairMaterialsAccordion from './RepairMaterialsAccordion';
import RepairCustomItemsAccordion from './RepairCustomItemsAccordion';

export default function RepairItemsSection({
  formData,
  setFormData, // Note: not used inside this component anymore, but kept for interface consistency
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
  const {
    expandedSection,
    handleExpand,
    compatibleTasks,
    compatibleProcesses,
    compatibleMaterials,
    getPriceDisplay,
    metalType,
    karat
  } = useRepairItemsSection({
    formData,
    availableTasks,
    availableProcesses,
    availableMaterials,
    adminSettings
  });

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
        <RepairTasksAccordion
          expanded={expandedSection === 'tasks'}
          onExpand={handleExpand('tasks')}
          tasks={formData?.tasks || []}
          compatibleTasks={compatibleTasks}
          metalType={metalType}
          karat={karat}
          getPriceDisplay={getPriceDisplay}
          addTask={addTask}
          updateItem={updateItem}
          removeItem={removeItem}
        />

        {/* Processes Section */}
        <RepairProcessesAccordion
          expanded={expandedSection === 'processes'}
          onExpand={handleExpand('processes')}
          processes={formData?.processes || []}
          compatibleProcesses={compatibleProcesses}
          metalType={metalType}
          karat={karat}
          getPriceDisplay={getPriceDisplay}
          addProcess={addProcess}
          updateItem={updateItem}
          removeItem={removeItem}
        />

        {/* Materials Section */}
        <RepairMaterialsAccordion
          expanded={expandedSection === 'materials'}
          onExpand={handleExpand('materials')}
          materials={formData?.materials || []}
          compatibleMaterials={compatibleMaterials}
          metalType={metalType}
          karat={karat}
          getPriceDisplay={getPriceDisplay}
          addMaterial={addMaterial}
          updateItem={updateItem}
          removeItem={removeItem}
          stullerSku={stullerSku}
          setStullerSku={setStullerSku}
          loadingStuller={loadingStuller}
          stullerError={stullerError}
          addStullerMaterial={addStullerMaterial}
        />

        {/* Custom Line Items */}
        <RepairCustomItemsAccordion
          expanded={expandedSection === 'custom'}
          onExpand={handleExpand('custom')}
          customLineItems={formData?.customLineItems || []}
          addCustomLineItem={addCustomLineItem}
          updateItem={updateItem}
          removeItem={removeItem}
        />
      </CardContent>
    </Card>
  );
}
