// src/app/dashboard/[userID]/jewelry/page.js
"use client";
import React from 'react';
import { useParams } from 'next/navigation';

const JewelryPage = () => {
    const { userID } = useParams();

    return (
        <div>
            <h1>Manage Jewelry for {userID}</h1>
            <p>Here you can manage your jewelry collection and pieces.</p>
        </div>
    );
};

export default JewelryPage;
