import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import type { ArchitectureComponent, ApiEndpoint } from '../types';

const typeColors: Record<string, string> = {
  frontend: '#3b82f6',
  backend: '#00d4aa',
  database: '#f59e0b',
  service: '#7c3aed',
  infrastructure: '#22c55e',
  external: '#ec4899',
};

const methodColors: Record<string, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#7c3aed',
};

export default function ArchitecturePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [components, setComponents] = useState<ArchitectureComponent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadArchitecture();
  }, [projectId]);

  async function loadArchitecture() {
    setLoading(true);
    try {
      const res = await api.getArchitecture(projectId!);
      setComponents(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Layout projectId={projectId} title="Architecture"><LoadingSpinner text="Loading architecture..." /></Layout>;

  const allEndpoints = components.flatMap(c =>
    (c.api_endpoints || []).map(ep => ({ ...ep, component: c.name }))
  );

  return (
    <Layout projectId={projectId} title="Architecture" subtitle={`${components.length} components defined`}>
      {components.length === 0 ? (
        <EmptyState
          icon="🏗️"
          title="No architecture defined"
          description="Architecture components will be generated during the design phase."
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {components.map((comp) => {
              const color = typeColors[comp.component_type] || '#00d4aa';
              return (
                <div
                  key={comp.id}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    borderTop: `3px solid ${color}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, flex: 1 }}>{comp.name}</h4>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px',
                      backgroundColor: `${color}20`, color,
                      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    }}>
                      {comp.component_type}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                    {comp.description}
                  </p>

                  {comp.technologies?.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {comp.technologies.map((t, i) => (
                        <span key={i} style={{
                          padding: '2px 8px', borderRadius: '4px',
                          backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)',
                          fontSize: '11px',
                        }}>{t}</span>
                      ))}
                    </div>
                  )}

                  {comp.responsibilities?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                        RESPONSIBILITIES
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {comp.responsibilities.map((r, i) => (
                          <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {allEndpoints.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>API Endpoints</h3>
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <th style={thStyle}>Method</th>
                      <th style={thStyle}>Path</th>
                      <th style={thStyle}>Description</th>
                      <th style={thStyle}>Component</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEndpoints.map((ep, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px',
                            backgroundColor: `${methodColors[ep.method] || '#6b7280'}20`,
                            color: methodColors[ep.method] || '#6b7280',
                            fontSize: '11px', fontWeight: 700, fontFamily: 'monospace',
                          }}>
                            {ep.method}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>{ep.path}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{ep.description}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '12px' }}>{ep.component}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '13px',
};
