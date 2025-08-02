// src/app/dashboard/[userID]/appointments/page.js
"use client";
import React from 'react';
import { useParams } from 'next/navigation';

const AppointmentsPage = () => {
    const { userID } = useParams();

    return (
        <div>
            <h1>Manage Appointments for {userID}</h1>
            <p>Here you can manage your upcoming and past appointments.</p>
        </div>
    );
};

export default AppointmentsPage;
