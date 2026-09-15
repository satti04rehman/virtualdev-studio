import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import type { Approval } from '../../types';

interface ApprovalCardProps {
  approval: Approval;
  onDecide: (id: string, decision: 'approved' | 'rejected', note?: string) => Promise<void>;
}

export default function ApprovalCard({ approval, onDecide }: ApprovalCardProps) {
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState(false);

  const handleDecide = async (decision: 'approved' | 'rejected') => {
    setDeciding(true);
    try {
      await onDecide(approval.id, decision, note || undefined);
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
            {approval.title}
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {approval.approval_type} · {new Date(approval.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={approval.status} />
      </div>

      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
        {approval.description}
      </p>

      {approval.proposed_changes && Object.keys(approval.proposed_changes).length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            PROPOSED CHANGES
          </p>
          <pre style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            fontFamily: 'monospace',
          }}>
            {JSON.stringify(approval.proposed_changes, null, 2)}
          </pre>
        </div>
      )}

      {approval.status === 'pending' && (
        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note..."
            rows={2}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              resize: 'vertical',
              marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleDecide('approved')}
              disabled={deciding}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: 'rgba(0,212,170,0.15)',
                color: '#00d4aa',
                border: '1px solid rgba(0,212,170,0.3)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '13px',
                opacity: deciding ? 0.6 : 1,
              }}
            >
              {deciding ? '...' : 'Approve'}
            </button>
            <button
              onClick={() => handleDecide('rejected')}
              disabled={deciding}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '13px',
                opacity: deciding ? 0.6 : 1,
              }}
            >
              {deciding ? '...' : 'Reject'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
