'use client';

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth";
import styles from "@/components/auth/AuthForm.module.css";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devResetLink, setDevResetLink] = useState("");

  useEffect(() => {
    const prefillEmail = searchParams.get("email");
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setDevResetLink("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to process request.");
      }

      setMessage(data?.message || "If an account exists, a reset link has been sent.");
      if (typeof data?.devResetLink === "string" && data.devResetLink) {
        setDevResetLink(data.devResetLink);
      }
    } catch (submitError) {
      setError(submitError.message || "Failed to process request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password Recovery"
      title="Reset your atelier access"
      description="Enter the email tied to your internal account and we will send a secure password setup link."
      footer={
        <div className={styles.footerLinks}>
          <Link className={styles.textLink} href="/auth/signin">
            Back to sign in
          </Link>
          <Link className={styles.textLink} href="https://shop.engelfinedesign.com/contact" target="_blank">
            Need support?
          </Link>
        </div>
      }
    >
      <form className={styles.formStack} onSubmit={handleSubmit}>
        {error ? <div className={`${styles.message} ${styles.messageError}`}>{error}</div> : null}
        {message ? <div className={`${styles.message} ${styles.messageSuccess}`}>{message}</div> : null}
        {devResetLink ? (
          <div className={`${styles.message} ${styles.messageWarning}`}>
            Email delivery is not configured in this environment.
            {" "}
            <a className={styles.textLink} href={devResetLink} rel="noreferrer" target="_blank">
              Open reset link
            </a>
          </div>
        ) : null}

        <div className={styles.pillRow}>
          <span className={styles.pill}>Secure reset</span>
          <span className={styles.pill}>Internal accounts only</span>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="email">
            Email Address
          </label>
          <input
            autoComplete="email"
            className={styles.input}
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@engelfinedesign.com"
            required
            type="email"
            value={email}
          />
        </div>

        <button className={styles.submitButton} disabled={loading} type="submit">
          {loading ? "Sending Reset Link..." : "Send Reset Link"}
        </button>
      </form>
    </AuthShell>
  );
}
