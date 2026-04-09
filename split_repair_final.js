const fs = require('fs');
let code = fs.readFileSync('repair.txt', 'utf8');

// Top imports
let imports = code.substring(0, code.indexOf('export default function'));

// Hook Code
let hookStart = code.indexOf('export default function RepairTaskFormPage({ params })');
let returnStart = code.indexOf('return (', hookStart);
let hookCode = code.substring(hookStart, returnStart).replace('export default function RepairTaskFormPage', 'export function useRepairTaskCreator');
let hookReturns = '\nreturn { isEdit, loading, saving, error, setError, success, setSuccess, formData, setFormData, calculatedPrice, handleInputChange, handleArrayChange, handleSubmit, handleCancel};\n}\n';
fs.writeFileSync('src/hooks/tasks/useRepairTaskCreator.js', imports + '\n' + hookCode + hookReturns);

let overviewStart = code.indexOf('          <Grid item xs={12}>');
let overviewEnd = code.indexOf('          <Grid item xs={12} md={6}>', overviewStart) - 1;
let overview = code.substring(overviewStart, overviewEnd);

let pricingStart = overviewEnd + 1;
let pricingEnd = code.indexOf('          <Grid item xs={12} md={6}>', pricingStart + 10) - 1;
let pricing = code.substring(pricingStart, pricingEnd);

let specsStart = pricingEnd + 1;
let specsEnd = code.indexOf('          <Grid item xs={12}>', specsStart + 10) - 1;
let specs = code.substring(specsStart, specsEnd);

let advancedStart = specsEnd + 1;
let advancedEnd = code.lastIndexOf('        </Grid>');
let advanced = code.substring(advancedStart, advancedEnd);

fs.mkdirSync('src/components/tasks/create', { recursive: true });

fs.writeFileSync('src/components/tasks/create/TaskOverviewSection.js', 
imports + `
export default function TaskOverviewSection({ formData, handleInputChange }) {
    return (
        <Grid container spacing={3}>
            ${overview}
        </Grid>
    );
}
`);

fs.writeFileSync('src/components/tasks/create/TaskPricingSection.js', 
imports + `
export default function TaskPricingSection({ formData, handleInputChange, calculatedPrice }) {
    return (
        <Grid container spacing={3}>
            ${pricing}
        </Grid>
    );
}
`);

fs.writeFileSync('src/components/tasks/create/TaskSpecsSection.js', 
imports + `
export default function TaskSpecsSection({ formData, handleInputChange, handleArrayChange }) {
    return (
        <Grid container spacing={3}>
            ${specs}
        </Grid>
    );
}
`);

fs.writeFileSync('src/components/tasks/create/TaskAdvancedSection.js', 
imports + `
export default function TaskAdvancedSection({ formData, handleInputChange }) {
    return (
        <Grid container spacing={3}>
            ${advanced}
        </Grid>
    );
}
`);

// Now the Orchestrator
let page = imports + `
import { useRepairTaskCreator } from '../../../../hooks/tasks/useRepairTaskCreator';
import TaskOverviewSection from '../../../../components/tasks/create/TaskOverviewSection';
import TaskPricingSection from '../../../../components/tasks/create/TaskPricingSection';
import TaskSpecsSection from '../../../../components/tasks/create/TaskSpecsSection';
import TaskAdvancedSection from '../../../../components/tasks/create/TaskAdvancedSection';

export default function RepairTaskFormPage({ params }) {
    const { 
        isEdit, loading, saving, error, success, 
        formData, calculatedPrice, handleInputChange, handleArrayChange, handleSubmit, handleCancel 
    } = useRepairTaskCreator({ params });

    if (loading) {
        return (
            <PageContainer>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    return (
        <PageContainer title={isEdit ? 'Edit Repair Task' : 'Create New Repair Task'}>
            <form onSubmit={handleSubmit}>
                <Box display="flex" flexDirection="column" gap={3}>
                    
                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{isEdit ? 'Task updated successfully' : 'Task created successfully'}</Alert>}
                    
                    <TaskOverviewSection formData={formData} handleInputChange={handleInputChange} />
                    
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TaskPricingSection formData={formData} handleInputChange={handleInputChange} calculatedPrice={calculatedPrice} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TaskSpecsSection formData={formData} handleInputChange={handleInputChange} handleArrayChange={handleArrayChange} />
                        </Grid>
                    </Grid>
                    
                    <TaskAdvancedSection formData={formData} handleInputChange={handleInputChange} />

                    <Box display="flex" justifyContent="flex-end" gap={2} mt={2} mb={4}>
                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
                        </Button>
                    </Box>
                </Box>
            </form>
        </PageContainer>
    );
}
`;

fs.writeFileSync('src/app/dashboard/admin/repair-tasks/create/page.js', page);
console.log('Done mapping tasks');
