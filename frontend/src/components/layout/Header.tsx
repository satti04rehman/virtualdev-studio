import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (api.getToken()) {
      api.getCurrentUser().then(setUser).catch(() => {});
    }
  }, []);

  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid var(--border-primary)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {title && (
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h1>
            {subtitle && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-2px' }}>{subtitle}</p>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {actions}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: '#fff',
            }}>
              {(user.full_name || user.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.full_name || user.username}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
