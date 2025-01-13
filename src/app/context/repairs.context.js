"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import RepairsService from "@/services/repairs";

// Create the Repairs Context with default values
const RepairsContext = createContext({
    repairs: [],
    loading: true,
    setRepairs: () => {},  // ✅ Ensure setRepairs is included
    fetchRepairs: () => {},
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

    useEffect(() => {
        fetchRepairs();
    }, []);

    return (
        <RepairsContext.Provider value={{ repairs, loading, setRepairs, fetchRepairs }}>
            {children}
        </RepairsContext.Provider>
    );
};
