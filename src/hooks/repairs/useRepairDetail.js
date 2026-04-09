'use client';

import { useState } from 'react';

export const useRepairDetail = () => {
  const [detail, setDetail] = useState({});
  return { detail };
};
