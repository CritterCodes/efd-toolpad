'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { USER_ROLES } from '@/lib/unifiedUserService';

export default function RepairsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (session?.user?.role) {
      if (session.user.role === USER_ROLES.WHOLESALER) {
        // Wholesalers should go to current repairs by default
        router.replace('/dashboard/repairs/current');
      } else {
        // Admins go to the work management interface
        router.replace('/dashboard/repairs/ready-for-work');
      }
    }
  }, [session?.user?.role, router]);
  
  return null; // This component always redirects
}
