"use client";
import React from "react";
import { useRepairs } from "../context/repairs.context";
import TicketsDashboard from "./components/TicketsDashboard";

const DashboardPage = () => {
    const { repairs, loading } = useRepairs();

    if (loading) {
        return <p>Loading dashboard...</p>;
    }

    return (
        <div className="space-y-8">
            {/* Existing Repairs Section */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold mb-4">Repairs Overview</h2>
                <p className="text-gray-600">Total Repairs: {repairs.length}</p>
            </div>

            {/* New Tickets Section */}
            <TicketsDashboard />
        </div>
    );
};

export default DashboardPage;
