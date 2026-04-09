'use client';

import { useState, useMemo } from 'react';
export function useMaterialSelector(props) {
    const [materials, setMaterials] = useState([]);
    return { materials, setMaterials, ...props };
}
