'use client';
import React from 'react';
import { useCADRequest } from '@/hooks/requests/useCADRequest';
import { Container, Typography } from '@mui/material';

export default function CADRequestPage() {
  const { data } = useCADRequest();
  return (
    <Container>
      <Typography variant="h4">CAD Request Details</Typography>
    </Container>
  );
}
