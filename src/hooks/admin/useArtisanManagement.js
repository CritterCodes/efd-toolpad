'use client';

import { useState } from 'react';
export const useArtisanManagement = () => {
  const [data, setData] = useState([]);
  return { data };
};
