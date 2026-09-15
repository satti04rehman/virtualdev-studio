import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import type { Document } from '../types';

const docTypeLabels: Record<string, { label: string; color: string }> = {
  prd: { label: 'PRD', color: '#f59e0b' },
  architecture: { label: 'Architecture', color: '#7c3aed' },
  api: { label: 'API', color: '#3b82f6' },
  user_guide: { label: 'User Guide', color: '#22c55e' },
  technical: { label: 'Technical', color: '#00d4aa' },
  deployment: { label: 'Deployment', color: '#ec4899' },
};

export default function DocumentationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    if (projectId) loadDocuments();
  }, [projectId]);

  async function loadDocuments() {
    setLoading(true);
    try {
      const res = await api.getDocuments(projectId!);
      setDocuments(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Layout projectId={projectId} title="Documentation"><LoadingSpinner text="Loading documents..." /></Layout>;

  return (
    <Layout projectId={projectId} title="Documentation" subtitle={`${documents.length} documents generated`}>
      {documents.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No documents yet"
          description="Documentation will be generated during the documentation phase."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDoc ? '340px 1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {documents.map((doc) => {
              const typeInfo = docTypeLabels[doc.doc_type] || { label: doc.doc_type, color: '#6b7280' };
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${selectedDoc?.id === doc.id ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, flex: 1 }}>{doc.title}</h4>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px',
                      backgroundColor: `${typeInfo.color}20`, color: typeInfo.color,
                      fontSize: '11px', fontWeight: 700,
                    }}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    v{doc.version} · {doc.format} · {new Date(doc.updated_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDoc && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              overflow: 'auto',
              maxHeight: 'calc(100vh - 160px)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{selectedDoc.title}</h2>
                <button
                  onClick={() => setSelectedDoc(null)}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border-primary)', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
              <div style={{
                fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7,
                whiteSpace: 'pre-wrap', fontFamily: selectedDoc.format === 'markdown' ? 'monospace' : 'inherit',
              }}>
                {selectedDoc.content}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
