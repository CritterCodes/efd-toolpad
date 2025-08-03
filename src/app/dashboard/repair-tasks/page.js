'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RepairTasksRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new tasks page
    router.replace('/dashboard/admin/tasks');
  }, [router]);
  
  return null; // This component just redirects
}
