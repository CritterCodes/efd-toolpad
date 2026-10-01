"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

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
    const { data: session = null, status: sessionStatus } = sessionState;
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Depend on stable primitives, not session.user itself — useSession returns a
    // new object on every /api/auth/session poll, and keying on object identity
    // put the fetch effect in a continuous refetch loop.
    const userKey = session?.user?.userID || session?.user?.email || null;
    const role = session?.user?.role;
    const isOnsite = session?.user?.employment?.isOnsite === true;
    const hasRepairOps = session?.user?.staffCapabilities?.repairOps === true;

    /**
     * Fetch repairs based on user role
     */
    const fetchRepairs = useCallback(async () => {
        if (!userKey) {
            setLoading(false);
            return;
        }

        const rolesWithoutRepairs = ['affiliate', 'artisan-applicant', 'client', 'customer'];
        const isOnsiteRepairOps = role === 'artisan' && isOnsite && hasRepairOps;

        if (rolesWithoutRepairs.includes(role) || (role === 'artisan' && !isOnsiteRepairOps)) {
            setRepairs([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            let data;

            // Role-based data fetching
            if (role === 'wholesaler') {
                // Wholesalers only see their own repairs
                const response = await fetch('/api/repairs/my-repairs');
                if (response.ok) {
                    const result = await response.json();
                    data = result.repairs || [];
                } else {
                    throw new Error('Failed to fetch user repairs');
                }
            } else {
                // Admins and onsite repair ops artisans see the shared repair dataset
                const response = await fetch('/api/repairs', {
                    credentials: 'include' // Ensure cookies are included
                });
                if (response.ok) {
                    data = await response.json();
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
    }, [userKey, role, isOnsite, hasRepairOps]);

    /**
     * Add a new repair to the context
     */
    const addRepair = (newRepair) => {
        setRepairs(prevRepairs => {
            // Check if repair already exists to avoid duplicates
            const exists = prevRepairs.some(repair => repair.repairID === newRepair.repairID);
            if (exists) {
                return prevRepairs;
            }
            return [newRepair, ...prevRepairs]; // Add to beginning for newest-first order
        });
    };

    /**
     * Update an existing repair in the context
     */
    const updateRepair = (repairID, updatedData) => {
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
        setRepairs(prevRepairs =>
            prevRepairs.filter(repair => repair.repairID !== repairID)
        );
    };

    useEffect(() => {
        if (userKey) {
            // Add a small delay to ensure session cookies are established
            const timer = setTimeout(() => {
                fetchRepairs();
            }, 100);
            return () => clearTimeout(timer);
        }
        if (sessionStatus === "unauthenticated") {
            // Signed out: nothing to fetch, don't leave consumers stuck on loading
            setRepairs([]);
            setLoading(false);
        }
    }, [userKey, sessionStatus, fetchRepairs]); // Refetch only when the signed-in user (not the session object identity) changes

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
