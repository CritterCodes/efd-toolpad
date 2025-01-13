// src/app/dashboard/[userID]/repairs/page.js
"use client";
import React from 'react';
import { useParams } from 'next/navigation';

const RepairsPage = () => {
    const { userID } = useParams();

    return (
        <div>
            <h1>Manage Repairs for {userID}</h1>
            <p>Here you can manage all your repair requests.</p>
        </div>
    );
};

export default RepairsPage;
