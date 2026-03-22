'use client';
import React from 'react';
import { useCreateTask } from '@/hooks/tasks/useCreateTask';
import { Container, Typography } from '@mui/material';

export default function CreateTaskPage() {
  const { data } = useCreateTask();
  return (
    <Container>
      <Typography variant="h4">Create Task</Typography>
    </Container>
  );
}
