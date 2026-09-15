import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import type { Requirement } from '../types';

const priorityColors: Record<string, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export default function RequirementsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadRequirements();
  }, [projectId]);

  async function loadRequirements() {
    setLoading(true);
    try {
      const res = await api.getRequirements(projectId!);
      setRequirements(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Layout projectId={projectId} title="Requirements"><LoadingSpinner text="Loading requirements..." /></Layout>;

  return (
    <Layout projectId={projectId} title="Requirements" subtitle={`${requirements.length} requirements defined`}>
      {requirements.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No requirements yet"
          description="Requirements will be generated when you start the project orchestration."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requirements.map((req) => (
            <div
              key={req.id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px',
                      backgroundColor: `${priorityColors[req.priority]}20`,
                      color: priorityColors[req.priority],
                      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    }}>
                      {req.priority}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.category}</span>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>{req.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{req.description}</p>
                </div>
                <StatusBadge status={req.status} size="sm" />
              </div>

              {req.acceptance_criteria?.length > 0 && (
                <div style={{
                  marginTop: '12px', paddingTop: '12px',
                  borderTop: '1px solid var(--border-primary)',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    ACCEPTANCE CRITERIA
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {req.acceptance_criteria.map((c, i) => (
                      <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
