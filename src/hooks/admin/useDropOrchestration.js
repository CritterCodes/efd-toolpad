import { useState } from 'react';
export function useDropOrchestration() {
    const [activeTab, setActiveTab] = useState(0);
    return { activeTab, setActiveTab, handleTogglePublish: () => {} };
}
