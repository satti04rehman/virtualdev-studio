import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface SidebarProps {
  projectId?: string;
}

const navItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/ai-team', icon: '🤖', label: 'AI Team' },
];

const projectNavItems = [
  { suffix: '', icon: '🎯', label: 'Overview' },
  { suffix: '/requirements', icon: '📋', label: 'Requirements' },
  { suffix: '/research', icon: '🔬', label: 'Research' },
  { suffix: '/architecture', icon: '🏗️', label: 'Architecture' },
  { suffix: '/tasks', icon: '⚡', label: 'Tasks' },
  { suffix: '/testing', icon: '🧪', label: 'Testing' },
  { suffix: '/documentation', icon: '📄', label: 'Documentation' },
  { suffix: '/approvals', icon: '✅', label: 'Approvals' },
  { suffix: '/final', icon: '🚀', label: 'Final Review' },
];

export default function Sidebar({ projectId }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    api.clearToken();
    navigate('/login');
  };

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 800,
          color: '#fff',
        }}>
          V
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>VirtualDev</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Studio</div>
        </div>
      </div>

      <nav style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        <div style={{ marginBottom: '8px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(0,212,170,0.08)' : 'transparent',
                textDecoration: 'none',
                marginBottom: '2px',
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        {projectId && (
          <>
            <div style={{
              padding: '14px 14px 6px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Project
            </div>
            <div>
              {projectNavItems.map((item) => {
                const to = `/projects/${projectId}${item.suffix}`;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={item.suffix === ''}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'rgba(0,212,170,0.08)' : 'transparent',
                      textDecoration: 'none',
                      marginBottom: '2px',
                      transition: 'all 0.15s',
                    })}
                  >
                    <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </>
        )}
      </nav>

      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border-primary)',
      }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgba(239,68,68,0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
