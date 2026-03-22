
import { useState, useEffect } from "react";
import tasksService from "@/services/tasks.service";

export default function useNewRepairTasks(formData) {
    const [repairTasks, setRepairTasks] = useState([]);
    const [uniqueTasks, setUniqueTasks] = useState([]);
    const [selectedRepairTasks, setSelectedRepairTasks] = useState(formData.repairTasks || []);
    const [taskSearch, setTaskSearch] = useState("");
    const [client, setClient] = useState({});
    
    // New filtering state
    const [categoryFilter, setCategoryFilter] = useState("");
    const [metalTypeFilter, setMetalTypeFilter] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const fetchRepairTasks = async () => {
            try {
                const response = await tasksService.getTasks({ isActive: 'true' });
                if (Array.isArray(response)) {
                    const normalizedTasks = response.map(task => ({
                        ...task,
                        price: task.price || task.basePrice || 0,
                        sku: task.sku || `TASK-${task._id?.slice(-6) || Math.random().toString(36).slice(2, 8)}`,
                        category: task.category || 'repair',
                        metalType: task.metalType || '',
                    }));
                    
                    const uniqueTasks = normalizedTasks.reduce((acc, task) => {
                        if (!acc.some((t) => t.title === task.title)) acc.push(task);
                        return acc;
                    }, []);
                    setUniqueTasks(uniqueTasks);
                    setRepairTasks(normalizedTasks);
                }
            } catch (error) {}
        };
        fetchRepairTasks();
    }, []);

    const parseMetalType = (metalType) => {
        if (typeof metalType === 'string') {
            const [type, karat] = metalType.split(' - ');
            if (!karat) return { type, karat: '' };
            const trimmedKarat = karat.slice(0, -1);
            return `${trimmedKarat}${type.toLowerCase()}`;
        }
        return { type: '', karat: '' };
    };

    const buildSku = (sku) => {
        if (!formData.metalType) return sku;
        const { type, karat } = formData.metalType;
        return `${sku}-${type}-${karat}`;
    };

    const handleAddRepairTask = (task) => {
        setSelectedRepairTasks((prev) => [...prev, task]);
    };

    const handleRemoveRepairTask = (taskToRemove) => {
        setSelectedRepairTasks((prev) => prev.filter((t) => t.sku !== taskToRemove.sku));
    };

    return {
        repairTasks, uniqueTasks, selectedRepairTasks, setSelectedRepairTasks,
        taskSearch, setTaskSearch, client, setClient,
        categoryFilter, setCategoryFilter,
        metalTypeFilter, setMetalTypeFilter,
        showFilters, setShowFilters,
        handleAddRepairTask, handleRemoveRepairTask,
        buildSku, parseMetalType
    };
}
