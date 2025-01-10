"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import { Typography, Box, Divider, Container } from '@mui/material';
import Image from 'next/image';

/**
 * ReviewSubmitStep Component (Fixed for Next.js Image Handling)
 * - Prevents empty `src` error by conditionally rendering the image
 */
export default function ReviewSubmitStep({ formData }) {
    return (
        <Container 
            elevation={3} 
            sx={{
                p: 3, 
                borderRadius: 4, 
                maxWidth: 500, 
                mx: 'auto',
                textAlign: 'center'
            }}
        >
            {/* Display Image at the Top if Available */}
            {formData.picture && formData.picture instanceof File ? (
                <Box 
                    sx={{ 
                        borderRadius: 4, 
                        overflow: 'hidden',
                        mb: 2 
                    }}
                >
                    {/* Convert File to Object URL */}
                    <Image
                        src={URL.createObjectURL(formData.picture)}
                        alt="Captured"
                        width={400}
                        height={300}
                        layout="responsive"
                        objectFit="cover"
                    />
                </Box>
            ) : (
                <Typography variant="body2" sx={{ mb: 2 }}>
                    No image provided.
                </Typography>
            )}

            {/* Title */}
            <Typography variant="h5" sx={{ mb: 2 }}>
                Review Your Repair Details
            </Typography>

            <Divider sx={{ mb: 2 }} />

            {/* Client ID */}
            <Typography variant="body1" gutterBottom>
                <strong>Client ID:</strong> {formData.userID}
            </Typography>

            {/* Description */}
            <Typography variant="body1" gutterBottom>
                <strong>Description:</strong> {formData.description}
            </Typography>

            {/* Promise Date */}
            <Typography variant="body1" gutterBottom>
                <strong>Promise Date:</strong> {formData.promiseDate}
            </Typography>

            {/* Metal Type */}
            <Typography variant="body1" gutterBottom>
                <strong>Metal Type:</strong> {formData.metalType}
            </Typography>

            {/* Selected Repair Tasks with SKUs */}
            {formData.repairTasks?.length > 0 && (
                <>
                    <Divider sx={{ mt: 2, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        Selected Repair Tasks:
                    </Typography>
                    {formData.repairTasks.map((task, index) => (
                        <Typography key={index} variant="body2">
                            {task.title} - <strong>{task.sku}</strong>
                        </Typography>
                    ))}
                </>
            )}
        </Container>
    );
}

ReviewSubmitStep.propTypes = {
    formData: PropTypes.object.isRequired,
};
