"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import RepairsService from "@/services/repairs";

// Create the Repairs Context with default values
const RepairsContext = createContext({
    repairs: [],
    loading: true,
    setRepairs: () => {},  // ✅ Ensure setRepairs is included
    fetchRepairs: () => {},
    addRepair: () => {},   // ✅ Add repair to context
    updateRepair: () => {}, // ✅ Update repair in context
    removeRepair: () => {}, // ✅ Remove repair from context
});

// Custom Hook for accessing the context
export const useRepairs = () => {
    const context = useContext(RepairsContext);
    if (!context) {
        throw new Error("useRepairs must be used within a RepairsProvider");
    }
    return context;
};

// Repairs Provider Component
export const RepairsProvider = ({ children }) => {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    /**
     * Fetch all repairs using the RepairsService
     */
    const fetchRepairs = async () => {
        setLoading(true);
        try {
            const data = await RepairsService.getRepairs();
            setRepairs(data);
        } catch (error) {
            console.error("❌ Error fetching repairs:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Add a new repair to the context
     */
    const addRepair = (newRepair) => {
        console.log("📝 Adding repair to context:", newRepair?.repairID);
        setRepairs(prevRepairs => {
            // Check if repair already exists to avoid duplicates
            const exists = prevRepairs.some(repair => repair.repairID === newRepair.repairID);
            if (exists) {
                console.log("⚠️  Repair already exists in context, skipping add");
                return prevRepairs;
            }
            return [newRepair, ...prevRepairs]; // Add to beginning for newest-first order
        });
    };

    /**
     * Update an existing repair in the context
     */
    const updateRepair = (repairID, updatedData) => {
        console.log("🔄 Updating repair in context:", repairID);
        setRepairs(prevRepairs =>
            prevRepairs.map(repair =>
                repair.repairID === repairID 
                    ? { ...repair, ...updatedData, updatedAt: new Date() }
                    : repair
            )
        );
    };

    /**
     * Remove a repair from the context
     */
    const removeRepair = (repairID) => {
        console.log("🗑️  Removing repair from context:", repairID);
        setRepairs(prevRepairs =>
            prevRepairs.filter(repair => repair.repairID !== repairID)
        );
    };

    useEffect(() => {
        fetchRepairs();
    }, []);

    return (
        <RepairsContext.Provider value={{ 
            repairs, 
            loading, 
            setRepairs, 
            fetchRepairs,
            addRepair,
            updateRepair,
            removeRepair
        }}>
            {children}
        </RepairsContext.Provider>
    );
};
