import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import type { ResearchItem } from '../types';

const sourceColors: Record<string, { bg: string; text: string }> = {
  web: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
  documentation: { bg: 'rgba(124,58,237,0.15)', text: '#7c3aed' },
  analysis: { bg: 'rgba(0,212,170,0.15)', text: '#00d4aa' },
  benchmark: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  comparison: { bg: 'rgba(236,72,153,0.15)', text: '#ec4899' },
};

export default function ResearchPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadResearch();
  }, [projectId]);

  async function loadResearch() {
    setLoading(true);
    try {
      const res = await api.getResearch(projectId!);
      setItems(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Layout projectId={projectId} title="Research"><LoadingSpinner text="Loading research..." /></Layout>;

  return (
    <Layout projectId={projectId} title="Research" subtitle={`${items.length} research findings`}>
      {items.length === 0 ? (
        <EmptyState
          icon="🔬"
          title="No research findings"
          description="Research data will be generated during the analysis phase."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
          {items.map((item) => {
            const src = sourceColors[item.source_type] || sourceColors.analysis;
            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '4px',
                    backgroundColor: src.bg, color: src.text,
                    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                  }}>
                    {item.source_type}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: item.confidence_score > 0.7 ? '#22c55e' : item.confidence_score > 0.4 ? '#f59e0b' : '#ef4444',
                    }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {Math.round(item.confidence_score * 100)}%
                    </span>
                  </div>
                </div>

                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{item.topic}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  {item.summary}
                </p>

                {item.recommendations?.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      RECOMMENDATIONS
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      {item.recommendations.map((r, i) => (
                        <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '3px' }}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--accent-primary)' }}
                  >
                    View Source →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
