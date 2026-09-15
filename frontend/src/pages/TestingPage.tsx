import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import type { Task } from '../types';

export default function TestingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadTestTasks();
  }, [projectId]);

  async function loadTestTasks() {
    setLoading(true);
    try {
      const res = await api.getTasks(projectId!);
      const allTasks = res.items || [];
      setTasks(allTasks.filter((t: Task) => t.task_type === 'testing'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Layout projectId={projectId} title="Testing"><LoadingSpinner text="Loading test results..." /></Layout>;

  const passed = tasks.filter(t => t.status === 'completed').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const total = tasks.length;

  return (
    <Layout projectId={projectId} title="Testing" subtitle="Test results and quality assurance">
      {tasks.length === 0 ? (
        <EmptyState
          icon="🧪"
          title="No test results"
          description="Tests will be generated and executed during the testing phase."
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{total}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Total Tests</div>
            </div>
            <div style={{
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#22c55e' }}>{passed}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Passed</div>
            </div>
            <div style={{
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#ef4444' }}>{failed}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Failed</div>
            </div>
          </div>

          {total > 0 && (
            <div style={{
              height: '8px', backgroundColor: 'var(--bg-secondary)',
              borderRadius: '4px', overflow: 'hidden', marginBottom: '32px',
            }}>
              <div style={{
                height: '100%',
                width: `${(passed / total) * 100}%`,
                backgroundColor: '#22c55e',
                borderRadius: '4px',
                transition: 'width 0.5s ease',
              }} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700,
                  backgroundColor: task.status === 'completed' ? 'rgba(34,197,94,0.15)' : task.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'var(--bg-primary)',
                  color: task.status === 'completed' ? '#22c55e' : task.status === 'failed' ? '#ef4444' : 'var(--text-muted)',
                }}>
                  {task.status === 'completed' ? '✓' : task.status === 'failed' ? '✗' : '—'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{task.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{task.description}</div>
                </div>
                {task.error_message && (
                  <div style={{ fontSize: '11px', color: '#ef4444', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
