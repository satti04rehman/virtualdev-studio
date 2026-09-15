import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', dot: '#f59e0b' },
  queued: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', dot: '#f59e0b' },
  in_progress: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', dot: '#3b82f6' },
  working: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', dot: '#3b82f6' },
  completed: { bg: 'rgba(0,212,170,0.15)', text: '#00d4aa', dot: '#00d4aa' },
  approved: { bg: 'rgba(0,212,170,0.15)', text: '#00d4aa', dot: '#00d4aa' },
  failed: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', dot: '#ef4444' },
  error: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', dot: '#ef4444' },
  rejected: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', dot: '#ef4444' },
  cancelled: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', dot: '#6b7280' },
  skipped: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', dot: '#6b7280' },
  idle: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', dot: '#6b7280' },
  offline: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', dot: '#6b7280' },
  draft: { bg: 'rgba(124,58,237,0.15)', text: '#7c3aed', dot: '#7c3aed' },
  running: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', dot: '#3b82f6' },
  low: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', dot: '#6b7280' },
  medium: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', dot: '#f59e0b' },
  high: { bg: 'rgba(249,115,22,0.15)', text: '#f97316', dot: '#f97316' },
  critical: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', dot: '#ef4444' },
  urgent: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', dot: '#ef4444' },
  created: { bg: 'rgba(124,58,237,0.15)', text: '#7c3aed', dot: '#7c3aed' },
  analyzing: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', dot: '#3b82f6' },
  researching: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', dot: '#3b82f6' },
  architecting: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', dot: '#f59e0b' },
  developing: { bg: 'rgba(0,212,170,0.15)', text: '#00d4aa', dot: '#00d4aa' },
  testing: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', dot: '#3b82f6' },
  documenting: { bg: 'rgba(124,58,237,0.15)', text: '#7c3aed', dot: '#7c3aed' },
  implemented: { bg: 'rgba(0,212,170,0.15)', text: '#00d4aa', dot: '#00d4aa' },
  expired: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', dot: '#6b7280' },
};

const formatLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = statusColors[status] || statusColors.idle;
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '14px' : '12px';
  const padding = size === 'sm' ? '2px 8px' : size === 'lg' ? '5px 14px' : '3px 10px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding,
        borderRadius: '9999px',
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: colors.dot,
          flexShrink: 0,
        }}
      />
      {formatLabel(status)}
    </span>
  );
}
