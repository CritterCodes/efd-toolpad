
import React from 'react';
import { useCadRequests } from '@/hooks/requests/useCadRequests';
import CadTable from './components/CadTable';
import CadFilter from './components/CadFilter';
import CadModal from './components/CadModal';

export default function CadRequestsPage() {
    const { data } = useCadRequests();
    return (
        <div>
            <CadFilter />
            <CadTable data={data} />
            <CadModal />
        </div>
    );
}
