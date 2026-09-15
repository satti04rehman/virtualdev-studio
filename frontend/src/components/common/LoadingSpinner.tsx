import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  text?: string;
}

export default function LoadingSpinner({ size = 36, color = '#00d4aa', text }: LoadingSpinnerProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '40px',
    }}>
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid var(--border-primary)`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {text && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{text}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
