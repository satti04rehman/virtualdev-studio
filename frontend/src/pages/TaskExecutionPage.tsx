import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import type { Task } from '../types';

const taskTypeIcons: Record<string, string> = {
  requirements: '📋',
  research: '🔬',
  architecture: '🏗️',
  development: '💻',
  testing: '🧪',
  documentation: '📄',
};

export default function TaskExecutionPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) loadTasks();
  }, [projectId]);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await api.getTasks(projectId!);
      setTasks(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Layout projectId={projectId} title="Tasks"><LoadingSpinner text="Loading tasks..." /></Layout>;

  const statusGroups = {
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    queued: tasks.filter(t => t.status === 'queued'),
    completed: tasks.filter(t => t.status === 'completed'),
    failed: tasks.filter(t => t.status === 'failed'),
  };

  return (
    <Layout projectId={projectId} title="Task Execution" subtitle={`${tasks.length} tasks total`}>
      {tasks.length === 0 ? (
        <EmptyState
          icon="⚡"
          title="No tasks yet"
          description="Tasks will be created when you start the orchestration."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(statusGroups).map(([status, groupTasks]) =>
            groupTasks.length > 0 ? (
              <div key={status}>
                <h3 style={{
                  fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  marginBottom: '10px',
                }}>
                  {status.replace('_', ' ')} ({groupTasks.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px',
                          padding: '16px 20px', cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{taskTypeIcons[task.task_type] || '📦'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{task.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {task.agent_name || 'Unassigned'} · {task.task_type}
                          </div>
                        </div>
                        <StatusBadge status={task.status} size="sm" />
                        <StatusBadge status={task.priority} size="sm" />
                        <span style={{
                          fontSize: '12px', color: 'var(--text-muted)',
                          transform: expandedTask === task.id ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}>▼</span>
                      </div>

                      {expandedTask === task.id && (
                        <div style={{
                          padding: '0 20px 20px',
                          borderTop: '1px solid var(--border-primary)',
                        }}>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '16px 0', lineHeight: 1.5 }}>
                            {task.description}
                          </p>

                          {task.started_at && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                              Started: {new Date(task.started_at).toLocaleString()}
                              {task.completed_at && ` · Completed: ${new Date(task.completed_at).toLocaleString()}`}
                            </div>
                          )}

                          {task.error_message && (
                            <div style={{
                              padding: '12px', borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.2)',
                              fontSize: '12px', color: '#ef4444',
                              fontFamily: 'monospace', marginBottom: '12px',
                            }}>
                              {task.error_message}
                            </div>
                          )}

                          {task.output_data && (
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                                OUTPUT
                              </div>
                              <pre style={{
                                padding: '12px', borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-primary)',
                                fontSize: '11px', color: 'var(--text-secondary)',
                                overflow: 'auto', maxHeight: '200px',
                                fontFamily: 'monospace', whiteSpace: 'pre-wrap',
                              }}>
                                {JSON.stringify(task.output_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </Layout>
  );
}
