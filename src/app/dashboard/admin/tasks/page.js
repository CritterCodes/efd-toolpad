
import React from 'react';
import TasksTable from './components/TasksTable';
import TasksDrawer from './components/TasksDrawer';
export default function TasksPage() {
    return (
        <div>
            <TasksTable />
            <TasksDrawer />
        </div>
    );
}
