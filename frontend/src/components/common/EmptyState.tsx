import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = '📦', title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 40px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '8px',
      }}>{title}</h3>
      {description && (
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          maxWidth: '400px',
          marginBottom: action ? '24px' : 0,
        }}>{description}</p>
      )}
      {action}
    </div>
  );
}
