'use client';

"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth";
import styles from "@/components/auth/AuthForm.module.css";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to reset password.");
      }

      setMessage("Password reset successful. Redirecting to sign in...");
      setTimeout(() => router.push("/auth/signin"), 1200);
    } catch (resetError) {
      setError(resetError.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Set New Password"
      title="Create a new admin key"
      description="Use a strong password for staff access. This affects only your internal admin login, not storefront customer accounts."
      footer={
        <div className={styles.footerLinks}>
          <Link className={styles.textLink} href="/auth/signin">
            Back to sign in
          </Link>
        </div>
      }
    >
      <form className={styles.formStack} onSubmit={handleSubmit}>
        {error ? <div className={`${styles.message} ${styles.messageError}`}>{error}</div> : null}
        {message ? <div className={`${styles.message} ${styles.messageSuccess}`}>{message}</div> : null}

        <div className={styles.pillRow}>
          <span className={styles.pill}>Minimum 8 characters</span>
          <span className={styles.pill}>Stored locally</span>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="password">
            New Password
          </label>
          <input
            autoComplete="new-password"
            className={styles.input}
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            autoComplete="new-password"
            className={styles.input}
            id="confirmPassword"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        <button className={styles.submitButton} disabled={loading} type="submit">
          {loading ? "Saving Password..." : "Save New Password"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
