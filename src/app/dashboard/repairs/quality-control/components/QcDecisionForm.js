import React from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    TextField,
    Button,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Alert,
    Chip
} from '@mui/material';
import {
    CheckCircle as ApproveIcon,
    Cancel as RejectIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { 
    QC_DECISIONS, 
    QC_DECISION_LABELS, 
    QC_DECISION_COLORS, 
    QC_INSPECTOR_OPTIONS,
    QC_ISSUE_CATEGORIES,
    QC_SEVERITY_LEVELS 
} from '../constants';

const QcDecisionForm = ({
    qcDecision,
    onDecisionChange,
    inspector,
    onInspectorChange,
    qcNotes,
    onNotesChange,
    issueCategory,
    onIssueCategoryChange,
    severityLevel,
    onSeverityChange,
    validationErrors,
    disabled = false
}) => {
    const getDecisionIcon = (decision) => {
        switch (decision) {
            case QC_DECISIONS.APPROVE:
                return <ApproveIcon color="success" />;
            case QC_DECISIONS.REJECT:
                return <RejectIcon color="error" />;
            default:
                return <WarningIcon color="warning" />;
        }
    };

    const getDecisionColor = (decision) => {
        return QC_DECISION_COLORS[decision] || 'default';
    };

    const showRejectionFields = qcDecision === QC_DECISIONS.REJECT;

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Quality Control Decision
                    {qcDecision && (
                        <Chip
                            icon={getDecisionIcon(qcDecision)}
                            label={QC_DECISION_LABELS[qcDecision]}
                            color={getDecisionColor(qcDecision)}
                            size="small"
                        />
                    )}
                </Typography>

                {/* Inspector Selection */}
                <TextField
                    select
                    fullWidth
                    label="Inspector"
                    value={inspector}
                    onChange={(e) => onInspectorChange(e.target.value)}
                    error={!!validationErrors.inspector}
                    helperText={validationErrors.inspector || 'Select the quality control inspector'}
                    sx={{ mb: 2 }}
                    SelectProps={{ native: true }}
                    disabled={disabled}
                >
                    <option value="">Select Inspector</option>
                    {QC_INSPECTOR_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </TextField>

                {/* QC Decision */}
                <FormControl component="fieldset" sx={{ mb: 2 }} error={!!validationErrors.qcDecision}>
                    <FormLabel component="legend">Quality Control Decision</FormLabel>
                    <RadioGroup
                        value={qcDecision}
                        onChange={(e) => onDecisionChange(e.target.value)}
                        disabled={disabled}
                    >
                        <FormControlLabel
                            value={QC_DECISIONS.APPROVE}
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ApproveIcon color="success" />
                                    {QC_DECISION_LABELS[QC_DECISIONS.APPROVE]}
                                </Box>
                            }
                        />
                        <FormControlLabel
                            value={QC_DECISIONS.REJECT}
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <RejectIcon color="error" />
                                    {QC_DECISION_LABELS[QC_DECISIONS.REJECT]}
                                </Box>
                            }
                        />
                    </RadioGroup>
                    {validationErrors.qcDecision && (
                        <Typography variant="caption" color="error">
                            {validationErrors.qcDecision}
                        </Typography>
                    )}
                </FormControl>

                {/* Rejection Fields */}
                {showRejectionFields && (
                    <Box sx={{ mb: 2, p: 2, backgroundColor: 'error.light', borderRadius: 1, alpha: 0.1 }}>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Rejection requires additional details for tracking and resolution
                        </Alert>

                        {/* Issue Category */}
                        <TextField
                            select
                            fullWidth
                            label="Issue Category"
                            value={issueCategory}
                            onChange={(e) => onIssueCategoryChange(e.target.value)}
                            error={!!validationErrors.issueCategory}
                            helperText={validationErrors.issueCategory || 'Select the type of issue found'}
                            sx={{ mb: 2 }}
                            SelectProps={{ native: true }}
                            disabled={disabled}
                        >
                            <option value="">Select Issue Category</option>
                            {QC_ISSUE_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </TextField>

                        {/* Severity Level */}
                        <FormControl component="fieldset" sx={{ mb: 2 }}>
                            <FormLabel component="legend">Severity Level</FormLabel>
                            <RadioGroup
                                value={severityLevel}
                                onChange={(e) => onSeverityChange(e.target.value)}
                                row
                                disabled={disabled}
                            >
                                {QC_SEVERITY_LEVELS.map((level) => (
                                    <FormControlLabel
                                        key={level.value}
                                        value={level.value}
                                        control={<Radio />}
                                        label={level.label}
                                    />
                                ))}
                            </RadioGroup>
                        </FormControl>
                    </Box>
                )}

                {/* QC Notes */}
                <TextField
                    fullWidth
                    label={showRejectionFields ? "Issue Details & Notes (Required)" : "QC Notes (Optional)"}
                    value={qcNotes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    multiline
                    rows={4}
                    error={!!validationErrors.qcNotes}
                    helperText={
                        validationErrors.qcNotes ||
                        (showRejectionFields 
                            ? "Describe the issues found and what needs to be corrected"
                            : "Optional notes about the quality inspection"
                        )
                    }
                    placeholder={
                        showRejectionFields
                            ? "Describe the quality issues found, what needs to be fixed, and any specific instructions..."
                            : "Add any notes about the quality inspection..."
                    }
                    disabled={disabled}
                />

                {/* Decision Summary */}
                {qcDecision && (
                    <Alert 
                        severity={qcDecision === QC_DECISIONS.APPROVE ? 'success' : 'warning'}
                        sx={{ mt: 2 }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {qcDecision === QC_DECISIONS.APPROVE ? '✅ Approval Action:' : '⚠️ Rejection Action:'}
                        </Typography>
                        <Typography variant="body2">
                            {qcDecision === QC_DECISIONS.APPROVE
                                ? 'This repair will be moved to "Ready for Pick-up" status'
                                : 'This repair will be returned to "Ready for Work" status for corrections'
                            }
                        </Typography>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default QcDecisionForm;
