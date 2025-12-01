'use client';
import { useSession } from 'next-auth/react';
import { Alert, AlertTitle } from '@mui/material';

export default function SessionDebug() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return <Alert>Loading session...</Alert>;
    }

    if (!session) {
        return <Alert severity="warning">No session found</Alert>;
    }

    return (
        <Alert severity="info">
            <AlertTitle>Session Debug</AlertTitle>
            <pre style={{ fontSize: '12px', marginTop: '10px' }}>
                {JSON.stringify({
                    userID: session.user?.userID,
                    email: session.user?.email,
                    role: session.user?.role,
                    artisanTypes: session.user?.artisanTypes,
                    name: session.user?.name
                }, null, 2)}
            </pre>
        </Alert>
    );
}