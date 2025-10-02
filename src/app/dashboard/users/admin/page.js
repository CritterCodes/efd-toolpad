"use client";
import React from 'react';
import UserManagement from '@/app/components/users/UserManagement';

const AdminUsersPage = () => {
  return (
    <UserManagement
      userRole="admin"
      title="Admin Users"
      description="Manage administrator accounts with full system access and permissions."
      createButtonText="Add Admin"
    />
  );
};

export default AdminUsersPage;