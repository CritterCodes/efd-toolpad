import { useState } from 'react';
export const useCreateTask = () => {
  const [data, setData] = useState([]);
  return { data };
}
