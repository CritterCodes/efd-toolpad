"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import {
    TextField,
    FormControl,
    FormLabel,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Autocomplete,
    Chip
} from '@mui/material';

const metalOptions = ["Silver", "White Gold", "Yellow Gold", "Platinum"];
const goldKarats = ["10k", "14k", "18k"];

export default function RepairDetailsStep({ formData, setFormData }) {
    const [selectedMetal, setSelectedMetal] = React.useState(formData.metalType || "");
    const [karatOptions, setKaratOptions] = React.useState(
        goldKarats.reduce((acc, karat) => ({ ...acc, [karat]: false }), {})
    );
    const [repairTasks, setRepairTasks] = React.useState([]);
    const [selectedRepairTasks, setSelectedRepairTasks] = React.useState(formData.repairTasks || []);
    const [taskSearch, setTaskSearch] = React.useState("");

    // ✅ Fetch repair tasks with enhanced logging
    React.useEffect(() => {
        const fetchRepairTasks = async () => {
            try {
                const response = await fetch('/api/repairTasks');
                const data = await response.json();

                console.log("Raw Repair Tasks Data:", data); // Log raw response for inspection

                if (Array.isArray(data)) {
                    const uniqueTasks = data.reduce((acc, task) => {
                        if (!acc.some(t => t.title === task.title)) {
                            acc.push(task);
                        }
                        return acc;
                    }, []);

                    console.log("Filtered Unique Repair Tasks:", uniqueTasks); // Log filtered tasks
                    setRepairTasks(uniqueTasks);
                } else {
                    console.error("API response is not an array:", data);
                    setRepairTasks([]);
                }
            } catch (error) {
                console.error("Failed to fetch repair tasks:", error);
                setRepairTasks([]);
            }
        };
        fetchRepairTasks();
    }, []);

    // ✅ Handle single metal selection (radio button behavior)
    const handleMetalChange = (metal) => {
        setSelectedMetal(metal);

        // Include karat in metalType if applicable
        if (metal === "Yellow Gold" || metal === "White Gold") {
            const selectedKarats = Object.entries(karatOptions)
                .filter(([_, checked]) => checked)
                .map(([karat]) => karat)
                .join(", ");
            setFormData({ ...formData, metalType: `${metal} ${selectedKarats}` });
        } else {
            setFormData({ ...formData, metalType: metal });
        }

        // Reset karat if non-gold metal is selected
        if (metal !== "Yellow Gold" && metal !== "White Gold") {
            setKaratOptions(goldKarats.reduce((acc, karat) => ({ ...acc, [karat]: false }), {}));
            setFormData({ ...formData, karat: [] });
        }

        console.log("Selected Metal:", metal);
    };


    const handleKaratChange = (karat) => {
        const updatedKaratOptions = { ...karatOptions, [karat]: !karatOptions[karat] };
        setKaratOptions(updatedKaratOptions);

        const selectedKarats = Object.entries(updatedKaratOptions)
            .filter(([_, checked]) => checked)
            .map(([karat]) => karat)
            .join(", ");

        setFormData({
            ...formData,
            karat: selectedKarats ? selectedKarats.split(", ") : [],
            metalType: `${selectedMetal} ${selectedKarats}`
        });
        console.log("Updated Karat Options:", updatedKaratOptions);
    };


    // ✅ Generate SKU logic based on selection
    // ✅ Generate SKU logic based on selection and ensure unique keys
    const getSKUForRepairTask = (task) => {
        if (!task.sku) {
            // Generate a truly unique identifier if SKU is missing
            return `undefined-sku-${crypto.randomUUID()}`;
        }

        if (selectedMetal === "Yellow Gold") {
            if (karatOptions["14k"]) return `${task.sku}-14yg`;
            if (karatOptions["18k"]) return `${task.sku}-18yg`;
        }
        if (selectedMetal === "White Gold" && karatOptions["14k"]) {
            return `${task.sku}-14wg`;
        }
        if (selectedMetal === "Silver") {
            return `${task.sku}-ss`;
        }

        return task.sku;
    };


    // ✅ Handle repair task selection with logging
    const handleRepairTaskChange = (event, value) => {
        console.log("Selected Repair Task Titles:", value); // Log the selected task titles
        const tasksWithSKU = value.map((taskTitle) => {
            const task = repairTasks.find((t) => t.title === taskTitle);
            const taskWithSKU = task ? { ...task, sku: getSKUForRepairTask(task) } : null;
            console.log("Task with SKU:", taskWithSKU); // Log each task with its SKU
            return taskWithSKU;
        }).filter(Boolean);

        setSelectedRepairTasks(tasksWithSKU);
        setFormData({ ...formData, repairTasks: tasksWithSKU });
    };

    // ✅ Filter repair tasks for suggestion/autocomplete with logging
    const filteredTasks = repairTasks.filter((task) =>
        task.title.toLowerCase().includes(taskSearch.toLowerCase())
    );

    console.log("Filtered Repair Tasks for Suggestion:", filteredTasks); // Log the filtered tasks for the dropdown

    return (
        <div>
            {/* ✅ Description */}
            <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                margin="normal"
            />

            {/* ✅ Promise Date */}
            {/* ✅ Promise Date */}
            <TextField
                fullWidth
                label="Promise Date"
                type="date"
                value={formData.promiseDate}
                onChange={(e) => setFormData({ ...formData, promiseDate: e.target.value })}
                margin="normal"
                InputLabelProps={{
                    shrink: true // ✅ Prevents overlapping of the label
                }}
            />


            {/* ✅ Metal Type Selection */}
            <FormControl component="fieldset" margin="normal">
                <FormLabel component="legend">Metal Type</FormLabel>
                <FormGroup>
                    {metalOptions.map((metal) => (
                        <FormControlLabel
                            key={metal}
                            control={
                                <Checkbox
                                    checked={selectedMetal === metal}
                                    onChange={() => handleMetalChange(metal)}
                                />
                            }
                            label={metal}
                        />
                    ))}
                </FormGroup>
            </FormControl>

            {/* ✅ Karat Selection */}
            {(selectedMetal === "White Gold" || selectedMetal === "Yellow Gold") && (
                <FormControl component="fieldset" margin="normal">
                    <FormLabel component="legend">Karat</FormLabel>
                    <FormGroup>
                        {goldKarats.map((karat) => (
                            <FormControlLabel
                                key={karat}
                                control={
                                    <Checkbox
                                        checked={karatOptions[karat]}
                                        onChange={() => handleKaratChange(karat)}
                                    />
                                }
                                label={karat}
                            />
                        ))}
                    </FormGroup>
                </FormControl>
            )}

            {/* ✅ Repair Tasks Selection with Autocomplete (Suggestion Mode) */}
            <Autocomplete
                freeSolo
                multiple
                filterSelectedOptions
                options={filteredTasks.map((task) => task.title)}
                value={selectedRepairTasks.map(task => task.title)}
                onInputChange={(event, newValue) => setTaskSearch(newValue)}
                onChange={handleRepairTaskChange}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                    ))
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Repair Tasks (Searchable)"
                        margin="normal"
                    />
                )}
            />

            {/* ✅ Display Selected Repair Tasks with SKU */}
            {selectedRepairTasks.length > 0 && (
                <div>
                    <h4>Selected Repair Tasks with SKUs:</h4>
                    {selectedRepairTasks.map((task, index) => (
                        <div key={`${task.sku}-${index}`}>
                            {task.title} - <strong>{task.sku}</strong>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

RepairDetailsStep.propTypes = {
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
};
