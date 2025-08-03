'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RepairsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the all repairs page
    router.replace('/dashboard/repairs/all');
  }, [router]);
  
  return null; // This component just redirects
}
