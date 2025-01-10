"use client";
import React from "react";
import { SignInPage } from "@toolpad/core/SignInPage";
import { signIn } from "next-auth/react";

// Define OAuth and Credentials providers
const providers = [
    { id: 'google', name: 'Google' },
    { id: 'credentials', name: 'Email and Password' }
];

const SignIn = () => {
    const handleSignIn = async (provider, formData) => {
        try {
            if (provider.id === 'credentials') {
                const response = await signIn("credentials", {
                    redirect: true,
                    email: formData.get('email'),
                    password: formData.get('password'),
                    callbackUrl: "/dashboard"
                });
                return response;
            } else {
                return signIn(provider.id, {
                    callbackUrl: "/dashboard"
                });
            }
        } catch (error) {
            return {
                error: "Sign-in failed. Please try again.",
            };
        }
    };

    return (
        <SignInPage
            signIn={handleSignIn}
            providers={providers}
            slotProps={{
                emailField: { autoFocus: true }
            }}
        />
    );
};

export default SignIn;
