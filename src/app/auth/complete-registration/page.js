"use client";
import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UsersService from "@/services/users";
import { CircularProgress, Box, Typography } from "@mui/material";

const CompleteRegistration = () => {
    const { data: session, status, update } = useSession(); // Access the update method
    const router = useRouter();

    useEffect(() => {
        const completeRegistration = async () => {
            if (status === "authenticated" && session) {
                try {
                    // Retrieve the pending user data from sessionStorage
                    const pendingUserData = JSON.parse(sessionStorage.getItem("pendingUserData"));
                    sessionStorage.removeItem("pendingUserData"); // Clean up
                    console.log("Pending User Data:", pendingUserData);

                    if (pendingUserData) {
                        // Merge Google session data with form data
                        const userData = {
                            userID: session.user.userID,
                            firstName: pendingUserData.firstName || session.user.name.split(" ")[0],
                            lastName: pendingUserData.lastName || session.user.name.split(" ")[1],
                            phoneNumber: pendingUserData.phoneNumber || "",
                            role: pendingUserData.role || "client", // Default to client role
                            business: pendingUserData.business || null, // For stores
                            address: pendingUserData.address || null, // Address object for stores
                        };

                        // Update user in the database
                        const updatedUser = await UsersService.updateUser(session.user.email, userData);

                        // Update the session with the new role and any other updated fields
                        await update(updatedUser.role === "client" ? {
                            ...session,
                            user: {
                                ...session.user,
                                role: updatedUser.role, // Update role in session
                            },
                        } :
                        {
                            ...session,
                            user: {
                                ...session.user,
                                role: updatedUser.role, // Update role in session
                                storeID: updatedUser.storeID, // Include storeID in session
                            },
                        });
                        

                        // Redirect to the dashboard
                        router.push("/dashboard");
                    } else {
                        // If no pending data, just go to the dashboard
                        router.push("/dashboard");
                    }
                } catch (error) {
                    console.error("Error completing registration:", error);
                    router.push("/dashboard"); // Fallback to dashboard
                }
            }
        };

        completeRegistration();
    }, [session, status, router, update]);

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                flexDirection: "column",
            }}
        >
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
                Completing your registration...
            </Typography>
        </Box>
    );
};

export default CompleteRegistration;
