"use client";
import React from "react";
import { useRepairs } from "../context/repairs.context";

const DashboardPage = () => {
    const { repairs, loading } = useRepairs();

    if (loading) {
        return <p>Loading repairs...</p>;
    }

    return (
        <div>
            <h1>Welcome to the Dashboard!</h1>
            <p>Total Repairs: {repairs.length}</p>
        </div>
    );
};

export default DashboardPage;
