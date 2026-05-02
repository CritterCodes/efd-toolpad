'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getDashboardSections } from '@/constants/roles';
import styles from './RoleBasedNavigation.module.css';

function NavigationItem({ section, pathname, depth = 0 }) {
  const isActive = pathname === section.url || pathname.startsWith(section.url + '/');
  const hasChildren = Array.isArray(section.children) && section.children.length > 0;

  return (
    <li className={isActive ? styles.active : ''}>
      <Link
        href={section.url}
        className={styles.link}
        style={{ paddingLeft: `${1.5 + depth * 1.25}rem` }}
      >
        <span className={styles.icon}>{section.icon}</span>
        <span className={styles.label}>{section.label}</span>
        {section.badge && (
          <span className={styles.badge} data-badge-type={section.badge} />
        )}
      </Link>

      {hasChildren && (
        <ul className={styles.submenu}>
          {section.children.map((child) => (
            <NavigationItem key={child.id} section={child} pathname={pathname} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function RoleBasedNavigation() {
  const sessionState = useSession() || {};
  const { data: session = null } = sessionState;
  const pathname = usePathname();

  if (!session?.user) {
    return null;
  }

  const sections = getDashboardSections(session.user.role);

  return (
    <nav className={styles.navigation}>
      <div className={styles.header}>
        <h2>Dashboard</h2>
        <span className={styles.roleIndicator}>{session.user.role.toUpperCase()}</span>
      </div>

      <ul className={styles.menu}>
        {sections.map((section) => (
          <NavigationItem key={section.id} section={section} pathname={pathname} />
        ))}
      </ul>

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
