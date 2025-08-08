// Parts management constants
export const PARTS_STATUSES = {
    NEEDS_PARTS: "NEEDS PARTS",
    PARTS_ORDERED: "PARTS ORDERED"
};

export const PARTS_TABS = [
    {
        label: "Needs Parts",
        value: PARTS_STATUSES.NEEDS_PARTS,
        description: "Repairs waiting for parts to be ordered"
    },
    {
        label: "Parts Ordered", 
        value: PARTS_STATUSES.PARTS_ORDERED,
        description: "Repairs with parts ordered, waiting for arrival"
    }
];

export const MATERIAL_TYPES = [
    { value: 'finding', label: 'Finding' },
    { value: 'stone', label: 'Stone' },
    { value: 'metal', label: 'Metal' },
    { value: 'chain', label: 'Chain' },
    { value: 'setting', label: 'Setting' },
    { value: 'other', label: 'Other' }
];

export const PRICING_METHODS = [
    { value: 'stuller', label: 'Stuller Pricing' },
    { value: 'manual', label: 'Manual Entry' },
    { value: 'markup', label: 'Cost + Markup' }
];
