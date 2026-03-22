
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useDesignRequests() {
    const { data: session } = useSession();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [claimingRequest, setClaimingRequest] = useState(false);
    const [stlFile, setStlFile] = useState(null);
    const [glbFile, setGlbFile] = useState(null);
    const [designTitle, setDesignTitle] = useState('');
    const [designNotes, setDesignNotes] = useState('');
    const [estimatedLabor, setEstimatedLabor] = useState('');
    const [estimatedVolume, setEstimatedVolume] = useState('');

    useEffect(() => {
        if (session?.user) fetchDesignRequests();
    }, [session]);

    const fetchDesignRequests = async () => { /* Stub */ setLoading(false); };
    const handleTabChange = (e, val) => setTabValue(val);
    const handleClaimRequest = async (id) => { /* Stub */ };
    const handleUploadDesign = async () => { /* Stub */ };

    const filteredRequests = requests.filter(request => {
        if (tabValue === 0) return request.status === 'pending';
        if (tabValue === 1) return request.assignedTo === session?.user?.id && request.status === 'in_progress';
        if (tabValue === 2) return request.status === 'completed';
        return true;
    });

    return {
        requests, loading, error, selectedRequest, setSelectedRequest,
        dialogOpen, setDialogOpen, uploadDialogOpen, setUploadDialogOpen,
        tabValue, handleTabChange, uploading, claimingRequest,
        stlFile, setStlFile, glbFile, setGlbFile, designTitle, setDesignTitle,
        designNotes, setDesignNotes, estimatedLabor, setEstimatedLabor,
        estimatedVolume, setEstimatedVolume, fetchDesignRequests,
        handleClaimRequest, handleUploadDesign, filteredRequests, session
    };
}
