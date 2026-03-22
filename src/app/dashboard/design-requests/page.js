
'use client';
import React from 'react';
import { useDesignRequests } from '../../../hooks/requests/useDesignRequests';
import DesignRequestsTabs from './components/DesignRequestsTabs';
import RequestListCard from './components/RequestListCard';
import UploadDesignDialog from './components/UploadDesignDialog';
import RequestDetailsDialog from './components/RequestDetailsDialog';

export default function DesignRequestsPage() {
    const state = useDesignRequests();
    
    return (
        <div>
            <DesignRequestsTabs tabValue={state.tabValue} handleTabChange={state.handleTabChange} />
            {state.filteredRequests.map(req => (
                <RequestListCard key={req._id} request={req} />
            ))}
            <UploadDesignDialog open={state.uploadDialogOpen} onClose={() => state.setUploadDialogOpen(false)} />
            <RequestDetailsDialog open={state.dialogOpen} onClose={() => state.setDialogOpen(false)} />
        </div>
    );
}
