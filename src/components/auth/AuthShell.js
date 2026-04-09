"use client";

import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { useEffect } from "react";
import shellStyles from "@/components/auth/AuthShell.module.css";
import formStyles from "@/components/auth/AuthForm.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--auth-display-font",
  weight: ["500", "600", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--auth-body-font",
  weight: ["400", "500", "700", "800"],
});

const defaultStats = [
  { value: "Repairs", label: "Intake, tracking, and updates" },
  { value: "Clients", label: "Store, artisan, and customer records" },
  { value: "Products", label: "Catalog, pricing, and workflow tools" },
];

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  storyTag = "Jewelry Operations Workspace",
  storyTitle = "Tools for Jewelry Stores and Artisans",
  storyBody = "Run repair intake, custom design management, product workflows, and client management from one focused workspace.",
  stats = defaultStats,
  footer,
}) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyMargin = body.style.margin;
    const prevBodyBackground = body.style.background;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.margin = "0";
    body.style.background = "#020202";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.margin = prevBodyMargin;
      body.style.background = prevBodyBackground;
    };
  }, []);

  return (
    <div className={`${shellStyles.shell} ${displayFont.variable} ${bodyFont.variable}`}>
      <div className={shellStyles.grid}>
        <section>
          <div className={shellStyles.storyCard}>
            <div>
              <div className={shellStyles.brandRow}>
                <Image
                  src="/logos/[efd]LogoWhite.png"
                  alt="Engel Fine Design"
                  width={180}
                  height={70}
                  priority
                />
                <span className={shellStyles.brandBadge}>Repair, design, product, and client tools</span>
              </div>

              <p className={shellStyles.eyebrow}>{eyebrow}</p>
              <h2 className={shellStyles.heroTitle}>{storyTitle}</h2>
              <p className={shellStyles.heroCopy}>{storyBody}</p>

              <div className={shellStyles.statsGrid}>
                {stats.map((stat) => (
                  <div className={shellStyles.statCard} key={`${stat.value}-${stat.label}`}>
                    <span className={shellStyles.statValue}>{stat.value}</span>
                    <span className={shellStyles.statLabel}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={shellStyles.storyFooter}>
              <span className={shellStyles.storyTag}>{storyTag}</span>
              <h3 className={shellStyles.storyHeading}>Manage the bench, the showroom, and the client pipeline in one place.</h3>
              <p className={shellStyles.storyBody}>
                This workspace is built for internal staff, jewelry stores, and artisans handling repairs, custom jobs, product management, and customer relationships. Customer shopping stays on the storefront.
              </p>
              <div className={formStyles.footerLinks}>
                <Link className={formStyles.linkButton} href="https://shop.engelfinedesign.com" target="_blank">
                  Visit Storefront
                </Link>
                <Link className={formStyles.ghostButton} href="https://shop.engelfinedesign.com/about" target="_blank">
                  Brand Story
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={shellStyles.formPanel}>
          <div className={shellStyles.formCard}>
            <span className={shellStyles.panelBadge}>{eyebrow}</span>
            <h1 className={shellStyles.panelTitle}>{title}</h1>
            <p className={shellStyles.panelDescription}>{description}</p>
            {children}
            {footer ? <div className={formStyles.footerArea}>{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}