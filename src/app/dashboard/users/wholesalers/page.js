"use client";
import React from 'react';
import UserManagement from '@/app/components/users/UserManagement';

const WholesalersPage = () => {
  return (
    <UserManagement
      userRole="wholesaler"
      title="Wholesalers"
      description="Manage wholesale partner accounts with bulk ordering and special pricing access."
      createButtonText="Add Wholesaler"
    />
  );
};

export default WholesalersPage;