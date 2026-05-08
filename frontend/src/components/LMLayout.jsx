import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useLMAuth } from '../context/LMAuthContext';
import {
  CalendarDays,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Users,
  X
} from 'lucide-react';

const NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  //{ path: '/doctors', icon: Stethoscope, label: 'Doctors', roles: ['ADMIN'] },
  { path: '/patients', icon: Users, label: 'Patients', patientLabel: 'My Profile', roles: ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'] },
  { path: '/appointments', icon: CalendarDays, label: 'Appointments', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'] },
  { path: '/medical-records', icon: FileText, label: 'Medical Records', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'PATIENT'] },
  { path: '/billing', icon: DollarSign, label: 'Billing', roles: ['ADMIN', 'RECEPTIONIST', 'PATIENT'] },
  { path: '/add-staff', icon: Users, label: 'Registration', roles: ['ADMIN'] },
];

const ROLE_COLOR = {
  ADMIN: '#f59e0b',
  DOCTOR: '#14b8a6',
  NURSE: '#a855f7',
  RECEPTIONIST: '#3b82f6',
  PATIENT: '#22c55e',
};

export default function LMLayout() {
  const { user, logout } = useLMAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleColor = ROLE_COLOR[user?.role] || '#f59e0b';
  const allowed = NAV.filter(n => n.roles.includes(user?.role));
  const initials = user?.fullName
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'LM';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileNav = () => setMobileOpen(false);

  return (
    <div className={`lm-app-shell ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'mobile-nav-open' : ''}`}>
      {mobileOpen && <button className="lm-mobile-scrim" aria-label="Close navigation" onClick={closeMobileNav} />}

      <aside className="lm-sidebar">
        <div className="lm-brand">
          <div className="lm-brand-mark">LM</div>
          <div className="lm-brand-copy">
            <strong>LM Hospital</strong>
            <span>Management</span>
          </div>
        </div>

        <nav className="lm-nav" aria-label="Main navigation">
          {allowed.map(({ path, icon: Icon, label, patientLabel }) => {
            const displayLabel = user?.role === 'PATIENT' && patientLabel ? patientLabel : label;

            return (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                onClick={closeMobileNav}
                className={({ isActive }) => `lm-nav-link ${isActive ? 'active' : ''}`}
                title={displayLabel}
              >
                <Icon size={18} />
                <span>{displayLabel}</span>
              </NavLink>
            );
          })}
        </nav>

        <button className="lm-logout" onClick={handleLogout}>
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="lm-main">
        <header className="lm-topbar">
          <button
            className="lm-icon-button lm-desktop-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu size={19} /> : <X size={19} />}
          </button>

          <button
            className="lm-icon-button lm-mobile-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="lm-mobile-title">
            <strong>LM Hospital</strong>
            <span>{user?.role}</span>
          </div>

          <div className="lm-user-chip">
            <div className="lm-avatar" style={{ borderColor: roleColor, color: roleColor }}>
              {initials}
            </div>
            <div className="lm-user-meta">
              <strong>{user?.fullName}</strong>
              <span>{user?.role}</span>
            </div>
          </div>
        </header>

        <main className="lm-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
