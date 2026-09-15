import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import api from '../services/api';
import type { Project, ProjectStage } from '../types';

const allStages = ['requirements', 'research', 'architecture', 'development', 'testing', 'documentation'];

export default function FinalProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        api.getProject(projectId!),
        api.getProjectStages(projectId!),
      ]);
      setProject(p);
      setStages(s.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Layout projectId={projectId} title="Final Review"><LoadingSpinner text="Loading project summary..." /></Layout>;
  if (!project) return <Layout projectId={projectId} title="Not Found"><p>Project not found.</p></Layout>;

  const completedStages = stages.filter(s => s.status === 'completed').length;
  const overallProgress = (completedStages / allStages.length) * 100;

  return (
    <Layout projectId={projectId} title="Final Review" subtitle="Project summary and readiness check">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>{project.name}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 20px' }}>
            {project.description}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '20px' }}>
            <StatusBadge status={project.status} size="lg" />
          </div>
          <div style={{
            height: '10px', backgroundColor: 'var(--bg-primary)',
            borderRadius: '5px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${overallProgress}%`,
              background: overallProgress === 100
                ? 'linear-gradient(90deg, #22c55e, #00d4aa)'
                : 'linear-gradient(90deg, #00d4aa, #7c3aed)',
              borderRadius: '5px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {completedStages}/{allStages.length} stages completed · {Math.round(overallProgress)}%
          </div>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Stage Summary</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {allStages.map((stageName) => {
            const stage = stages.find(s => s.stage_name === stageName);
            const status = stage?.status || 'pending';
            return (
              <div
                key={stageName}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <span style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700,
                  backgroundColor: status === 'completed' ? 'rgba(34,197,94,0.15)' : 'var(--bg-primary)',
                  color: status === 'completed' ? '#22c55e' : 'var(--text-muted)',
                }}>
                  {status === 'completed' ? '✓' : '—'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>{stageName}</div>
                  {stage?.error_message && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>{stage.error_message}</div>
                  )}
                </div>
                <StatusBadge status={status} />
                {stage?.completed_at && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(stage.completed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {project.tech_stack?.length > 0 && (
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Tech Stack</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {project.tech_stack.map((t, i) => (
                <span key={i} style={{
                  padding: '4px 12px', borderRadius: '6px',
                  backgroundColor: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                  fontSize: '13px', fontWeight: 600,
                }}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
