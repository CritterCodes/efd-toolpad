import { useState } from 'react';
export const useCADRequest = () => {
  const [data, setData] = useState([]);
  return { data };
}
