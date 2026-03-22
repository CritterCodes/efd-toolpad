
import React from 'react';
import { useArtisanManagement } from '@/hooks/admin/useArtisanManagement';
import ArtisanTable from '@/components/admin/sections/ArtisanTable';
import ArtisanDrawer from '@/components/admin/sections/ArtisanDrawer';
import ArtisanModal from '@/components/admin/sections/ArtisanModal';

export default function ArtisanManagement() {
    const { data } = useArtisanManagement();
    return (
        <div>
            <ArtisanTable data={data} />
            <ArtisanDrawer />
            <ArtisanModal />
        </div>
    );
}
