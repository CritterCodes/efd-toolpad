// src/app/dashboard/[userID]/appointments/page.js
"use client";
import React from 'react';
import { useParams } from 'next/navigation';

const ClientDashboardPage = () => {
    const { userID } = useParams();

    return (
        <div>
            <h1>Welcome, {userID}</h1>
            <p>this is your client dash.</p>
        </div>
    );
};

export default ClientDashboardPage;
