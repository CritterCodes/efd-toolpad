"use client";
import { useEffect } from "react";
import { Box, Typography, Button, Card, CardContent } from "@mui/material";
import { useRouter } from "next/navigation";
import SecurityIcon from "@mui/icons-material/Security";

const RegisterPage = () => {
    const router = useRouter();

    useEffect(() => {
        // Auto-redirect to sign-in after a few seconds
        const timeout = setTimeout(() => {
            router.push("/auth/signin");
        }, 5000);

        return () => clearTimeout(timeout);
    }, [router]);

    return (
        <Box 
            sx={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 2
            }}
        >
            <Card sx={{ maxWidth: 500, textAlign: 'center' }}>
                <CardContent sx={{ p: 4 }}>
                    <SecurityIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                    
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Internal Access Only
                    </Typography>
                    
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        This is an internal admin application for Engel Fine Design staff only. 
                        User registration is managed by system administrators.
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        If you need access to this system, please contact your administrator.
                    </Typography>
                    
                    <Button 
                        variant="contained" 
                        onClick={() => router.push("/auth/signin")}
                        sx={{ backgroundColor: "#333" }}
                    >
                        Go to Sign In
                    </Button>
                    
                    <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.disabled' }}>
                        Redirecting to sign-in in 5 seconds...
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default RegisterPage;
