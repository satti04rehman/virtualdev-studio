import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import api from '../services/api';
import type { Project, ProjectStage } from '../types';

const stageIcons: Record<string, string> = {
  requirements: '📋',
  research: '🔬',
  architecture: '🏗️',
  development: '💻',
  testing: '🧪',
  documentation: '📄',
};

export default function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [orchestrating, setOrchestrating] = useState(false);

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

  const handleOrchestrate = async () => {
    if (!projectId) return;
    setOrchestrating(true);
    try {
      await api.startOrchestration(projectId);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setOrchestrating(false);
    }
  };

  if (loading) return <Layout projectId={projectId} title="Loading..."><LoadingSpinner text="Loading project..." /></Layout>;
  if (!project) return <Layout projectId={projectId} title="Not Found"><p>Project not found.</p></Layout>;

  const completedStages = stages.filter(s => s.status === 'completed').length;
  const progress = stages.length > 0 ? (completedStages / stages.length) * 100 : 0;

  return (
    <Layout
      projectId={projectId}
      title={project.name}
      subtitle={project.description}
      actions={
        <button
          onClick={handleOrchestrate}
          disabled={orchestrating}
          style={{
            padding: '10px 20px',
            background: orchestrating ? 'var(--bg-hover)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff', fontWeight: 700, fontSize: '13px',
            borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            opacity: orchestrating ? 0.7 : 1,
          }}
        >
          {orchestrating ? '⏳ Running...' : '▶ Start Orchestration'}
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div style={{
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)', padding: '24px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>Project Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Platform', value: project.platform },
              { label: 'Complexity', value: project.complexity },
              { label: 'Status', value: '' },
              { label: 'Created', value: new Date(project.created_at).toLocaleDateString() },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.label}</div>
                {item.label === 'Status' ? <StatusBadge status={project.status} /> : (
                  <div style={{ fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>{item.value}</div>
                )}
              </div>
            ))}
          </div>
          {project.tech_stack?.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Tech Stack</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {project.tech_stack.map((t, i) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: '4px',
                    backgroundColor: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                    fontSize: '12px', fontWeight: 600,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)', padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Progress</h3>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div style={{
            height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px',
          }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, #00d4aa, #7c3aed)',
              borderRadius: '4px', transition: 'width 0.5s ease',
            }} />
          </div>
          <div>
            {stages.map((stage) => (
              <div
                key={stage.id}
                onClick={() => navigate(`/projects/${projectId}/${stage.stage_name}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', marginBottom: '4px',
                  backgroundColor: 'transparent',
                  transition: 'background-color 0.15s',
                }}
              >
                <span style={{ fontSize: '20px' }}>{stageIcons[stage.stage_name] || '📦'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>{stage.stage_name}</div>
                </div>
                <StatusBadge status={stage.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
