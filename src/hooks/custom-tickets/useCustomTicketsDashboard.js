import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useCustomTicketsDashboard() {
    const { data: session, status: sessionStatus } = useSession();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tabValue, setTabValue] = useState(0);

    return { session, sessionStatus, tickets, setTickets, loading, setLoading, error, setError, tabValue, setTabValue };
}
