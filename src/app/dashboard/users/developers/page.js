"use client";
import React from 'react';
import UserManagement from '@/app/components/users/UserManagement';

const DevelopersPage = () => {
  return (
    <UserManagement
      userRole="developer"
      title="Developers"
      description="Manage developer accounts with technical access to system development and maintenance."
      createButtonText="Add Developer"
    />
  );
};

export default DevelopersPage;