import { useState } from 'react';
export const useTaskBuilder = () => {
  const [task, setTask] = useState({});
  return { task };
};
