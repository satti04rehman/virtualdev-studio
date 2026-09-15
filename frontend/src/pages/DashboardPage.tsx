import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import type { Project, Activity } from '../types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [projRes, actRes] = await Promise.allSettled([
        api.getProjects(),
        api.getRecentActivity(),
      ]);
      if (projRes.status === 'fulfilled') setProjects(projRes.value.items || []);
      if (actRes.status === 'fulfilled') setActivity(actRes.value.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    total: projects.length,
    active: projects.filter(p => !['completed', 'failed'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  if (loading) return <Layout title="Dashboard"><LoadingSpinner text="Loading dashboard..." /></Layout>;

  return (
    <Layout
      title="Dashboard"
      subtitle="Overview of your projects"
      actions={
        <button
          onClick={() => navigate('/projects/new')}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #00d4aa, #00b894)',
            color: '#0f0f23', fontWeight: 700, fontSize: '13px',
            borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
          }}
        >
          + New Project
        </button>
      }
    >
      {error && (
        <div style={{
          padding: '16px', borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', marginBottom: '24px', fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total Projects', value: stats.total, color: 'var(--accent-primary)' },
          { label: 'Active', value: stats.active, color: '#3b82f6' },
          { label: 'Completed', value: stats.completed, color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} style={{
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)', padding: '24px',
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Projects</h3>
          {projects.length === 0 ? (
            <EmptyState
              icon="📁"
              title="No projects yet"
              description="Create your first AI-powered project to get started."
              action={
                <button
                  onClick={() => navigate('/projects/new')}
                  style={{
                    padding: '10px 24px', background: 'linear-gradient(135deg, #00d4aa, #00b894)',
                    color: '#0f0f23', fontWeight: 700, fontSize: '13px',
                    borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  }}
                >
                  Create Project
                </button>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  style={{
                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)', padding: '20px', cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{p.name}</h4>
                    <StatusBadge status={p.status} />
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                    {p.description}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(p.tech_stack || []).slice(0, 4).map((t, i) => (
                      <span key={i} style={{
                        padding: '2px 8px', borderRadius: '4px',
                        backgroundColor: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                        fontSize: '11px', fontWeight: 600,
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Recent Activity</h3>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)', padding: '20px',
          }}>
            {activity.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                No recent activity
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activity.slice(0, 8).map((a) => (
                  <div key={a.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary)', marginTop: '6px', flexShrink: 0,
                    }} />
                    <div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.message}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {a.project_name} · {new Date(a.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
