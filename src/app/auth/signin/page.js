'use client';

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/auth";
import styles from "@/components/auth/AuthForm.module.css";

function SignInContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error === 'CredentialsSignin') {
                setError("Invalid email or password");
            } else if (result?.error) {
                setError(result.error);
            } else if (result?.ok) {
                window.location.href = callbackUrl;
            }
        } catch (err) {
            console.error("Sign in error:", err);
            setError("An error occurred during sign in");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Welcome Back"
            title="Sign in to your workspace"
            description="Access repair intake, client management, and product tools."
            footer={
                <div className={styles.footerLinks}>
                    <Link className={styles.textLink} href="/auth/forgot-password">
                        Forgot password?
                    </Link>
                    <Link className={styles.textLink} href="https://shop.engelfinedesign.com/contact" target="_blank">
                        Need support?
                    </Link>
                </div>
            }
        >
            <form className={styles.formStack} onSubmit={handleSubmit}>
                {error ? <div className={`${styles.message} ${styles.messageError}`}>{error}</div> : null}

                <div className={styles.pillRow}>
                    <span className={styles.pill}>Internal access</span>
                    <span className={styles.pill}>Admin &amp; Artisan</span>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="email">
                        Email Address
                    </label>
                    <input
                        autoComplete="email"
                        autoFocus
                        className={styles.input}
                        id="email"
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@engelfinedesign.com"
                        required
                        type="email"
                        value={email}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="password">
                            Password
                        </label>
                        <Link className={styles.helperLink} href="/auth/forgot-password">
                            Forgot?
                        </Link>
                    </div>
                    <input
                        autoComplete="current-password"
                        className={styles.input}
                        id="password"
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        type="password"
                        value={password}
                    />
                </div>

                <button className={styles.submitButton} disabled={loading} type="submit">
                    {loading ? "Signing In..." : "Sign In"}
                </button>
            </form>
        </AuthShell>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={null}>
            <SignInContent />
        </Suspense>
    );
}