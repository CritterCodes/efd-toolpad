'use client';

import { use } from 'react';
import TaskBuilderFormPage from '@/app/dashboard/admin/tasks/components/TaskBuilderFormPage';

export default function EditTaskPage({ params }) {
  const { id } = use(params);
  return <TaskBuilderFormPage mode="edit" taskId={id} />;
}
