'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RepairsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the Ready for Work page (most useful for daily operations)
    router.replace('/dashboard/repairs/ready-for-work');
  }, [router]);
  
  return null; // This component just redirects
}
