import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import type { Agent } from '../types';

const agentAvatars: Record<string, string> = {
  requirements: '📋',
  research: '🔬',
  architecture: '🏗️',
  development: '💻',
  testing: '🧪',
  documentation: '📄',
  project_manager: '🎯',
  security: '🔒',
  devops: '🚀',
};

const agentColors: Record<string, string> = {
  requirements: '#f59e0b',
  research: '#3b82f6',
  architecture: '#7c3aed',
  development: '#00d4aa',
  testing: '#ef4444',
  documentation: '#06b6d4',
  project_manager: '#f97316',
  security: '#ec4899',
  devops: '#22c55e',
};

export default function AITeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    try {
      const res = await api.getAgents();
      setAgents(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Layout title="AI Team"><LoadingSpinner text="Loading AI agents..." /></Layout>;

  return (
    <Layout title="AI Team" subtitle="Your specialized AI development agents">
      {agents.length === 0 ? (
        <EmptyState
          icon="🤖"
          title="No agents available"
          description="AI agents will appear here when the backend is running."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {agents.map((agent) => {
            const roleKey = agent.role?.toLowerCase().replace(/\s+/g, '_') || '';
            const color = agentColors[roleKey] || '#00d4aa';
            const icon = agentAvatars[roleKey] || '🤖';

            return (
              <div
                key={agent.id}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                    backgroundColor: `${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{agent.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{agent.role}</p>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {agent.description}
                </p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tasks Done</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color }}>{agent.tasks_completed}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Success Rate</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color }}>
                      {Math.round((agent.success_rate || 0) * 100)}%
                    </div>
                  </div>
                </div>

                {agent.capabilities?.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {agent.capabilities.slice(0, 4).map((cap, i) => (
                      <span key={i} style={{
                        padding: '2px 8px', borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)',
                        fontSize: '11px',
                      }}>{cap}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
