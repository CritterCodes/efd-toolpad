'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getDashboardSections } from '@/constants/roles';
import styles from './RoleBasedNavigation.module.css';

export default function RoleBasedNavigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) {
    return null;
  }

  const userRole = session.user.role;
  const sections = getDashboardSections(userRole);

  const isActive = (url) => {
    return pathname === url || pathname.startsWith(url + '/');
  };

  return (
    <nav className={styles.navigation}>
      <div className={styles.header}>
        <h2>Dashboard</h2>
        <span className={styles.roleIndicator}>{session.user.role.toUpperCase()}</span>
      </div>

      <ul className={styles.menu}>
        {sections.map((section) => (
          <li key={section.id} className={isActive(section.url) ? styles.active : ''}>
            <Link href={section.url} className={styles.link}>
              <span className={styles.icon}>{section.icon}</span>
              <span className={styles.label}>{section.label}</span>
              {section.badge && (
                <span className={styles.badge} data-badge-type={section.badge}>
                  {/* Badge count will be injected by parent */}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* Artisan Types Display (if applicable) */}
      {session.user.artisanTypes && session.user.artisanTypes.length > 0 && (
        <div className={styles.artisanTypesSection}>
          <h3>Specializations</h3>
          <div className={styles.artisanTypes}>
            {session.user.artisanTypes.map((type) => (
              <span key={type} className={styles.artisanTypeTag}>
                {type}
              </span>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
