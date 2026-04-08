"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
    const sessionState = useSession() || {};
    const { data: session = null } = sessionState;
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    /**
     * Fetch repairs based on user role
     */
    const fetchRepairs = useCallback(async () => {
        if (!session?.user) {
            setLoading(false);
            return;
        }

        console.log("🔄 Starting repairs fetch for role:", session.user.role);
        setLoading(true);
        try {
            let data;
            
            // Role-based data fetching
            if (session.user.role === 'wholesaler') {
                console.log("🔄 Fetching repairs for wholesaler via /api/repairs/my-repairs");
                // Wholesalers only see their own repairs
                const response = await fetch('/api/repairs/my-repairs');
                if (response.ok) {
                    const result = await response.json();
                    data = result.repairs || [];
                    console.log("✅ Wholesaler repairs fetched:", data.length, "repairs");
                } else {
                    throw new Error('Failed to fetch user repairs');
                }
            } else {
                console.log("🔄 Fetching all repairs for admin via /api/repairs");
                // Admins and other roles see all repairs - use fetch to ensure session cookies are sent
                const response = await fetch('/api/repairs', {
                    credentials: 'include' // Ensure cookies are included
                });
                if (response.ok) {
                    data = await response.json();
                    console.log("✅ Admin repairs fetched:", data?.length || 0, "repairs");
                } else {
                    throw new Error('Failed to fetch all repairs');
                }
            }
            
            setRepairs(data);
        } catch (error) {
            console.error("❌ Error fetching repairs:", error);
            setRepairs([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    }, [session?.user]);

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
        if (session?.user) {
            // Add a small delay to ensure session cookies are established
            const timer = setTimeout(() => {
                fetchRepairs();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [session?.user, fetchRepairs]); // Refetch when session changes

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
