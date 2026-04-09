'use client';

import TaskBuilderFormPage from '@/app/dashboard/admin/tasks/components/TaskBuilderFormPage';

export default function EditTaskPage({ params }) {
  return <TaskBuilderFormPage mode="edit" taskId={params?.id} />;
}
