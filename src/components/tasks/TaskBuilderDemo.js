
import React from 'react';
import { useTaskBuilder } from '@/hooks/tasks/useTaskBuilder';
import ConfigForm from './components/ConfigForm';
import TaskPreview from './components/TaskPreview';

export default function TaskBuilderDemo() {
    const { task } = useTaskBuilder();
    return (
        <div>
            <ConfigForm task={task} />
            <TaskPreview task={task} />
        </div>
    );
}
