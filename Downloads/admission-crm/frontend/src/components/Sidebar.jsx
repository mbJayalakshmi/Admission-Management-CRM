import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = {
  admin: [
    { section: 'Overview',      links: [{ to: '/',             icon: '◈', label: 'Dashboard' }] },
    { section: 'Master Setup',  links: [
      { to: '/institutions',     icon: '🏛', label: 'Institutions' },
      { to: '/campuses',         icon: '🏫', label: 'Campuses' },
      { to: '/departments',      icon: '📂', label: 'Departments' },
      { to: '/programs',         icon: '📘', label: 'Programs' },
      { to: '/seat-matrix',      icon: '🪑', label: 'Seat Matrix' },
    ]},
    { section: 'Admissions',    links: [
      { to: '/applicants',       icon: '👤', label: 'Applicants' },
      { to: '/allocate',         icon: '✅', label: 'Seat Allocation' },
    ]},
  ],
  officer: [
    { section: 'Overview',      links: [{ to: '/',             icon: '◈', label: 'Dashboard' }] },
    { section: 'Admissions',    links: [
      { to: '/applicants',       icon: '👤', label: 'Applicants' },
      { to: '/allocate',         icon: '✅', label: 'Seat Allocation' },
    ]},
  ],
  management: [
    { section: 'Overview',      links: [{ to: '/',             icon: '◈', label: 'Dashboard' }] },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sections = NAV[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-56 min-w-56 bg-gray-900 text-gray-300 flex flex-col min-h-screen fixed top-0 left-0 bottom-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-blue-400 font-extrabold text-lg tracking-tight">AdmitFlow</h1>
        <p className="text-gray-500 text-xs mt-0.5">Admission CRM</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {sections.map((sec) => (
          <div key={sec.section} className="mb-2">
            <p className="px-5 py-2 text-xs font-bold text-gray-600 uppercase tracking-widest">{sec.section}</p>
            {sec.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-5 py-2.5 text-sm border-l-2 transition-all ${
                    isActive
                      ? 'text-blue-400 bg-blue-950/40 border-blue-400 font-medium'
                      : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800'
                  }`
                }
              >
                <span className="w-4 text-center">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        <p className="text-xs font-semibold text-blue-400 capitalize mb-3">{user?.role}</p>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          ← Logout
        </button>
      </div>
    </aside>
  );
}
