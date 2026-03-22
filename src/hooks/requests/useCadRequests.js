import { useState } from 'react';
export const useCadRequests = () => {
  const [data, setData] = useState([]);
  return { data };
};
