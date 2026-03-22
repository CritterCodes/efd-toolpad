'use client';
import React from 'react';
import { useNewRepair } from '@/hooks/repairs/useNewRepair';
import ClientInfoSection from './sections/ClientInfoSection';
import { Container, Typography } from '@mui/material';

export default function NewRepairForm() {
  const { formData, setFormData, submitForm } = useNewRepair();
  
  return (
    <Container>
      <Typography variant="h4">New Repair Creation</Typography>
      <ClientInfoSection formData={formData} setFormData={setFormData} />
    </Container>
  );
}
