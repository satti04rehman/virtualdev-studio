import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../services/api';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    target_users: '',
    platform: 'web',
    tech_stack: '',
    complexity: 'moderate',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const project = await api.createProject({
        name: form.name,
        description: form.description,
        target_users: form.target_users,
        platform: form.platform,
        tech_stack: form.tech_stack.split(',').map(s => s.trim()).filter(Boolean),
        complexity: form.complexity,
      });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <Layout title="Create New Project" subtitle="Define your project to start the AI workflow">
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {error && (
          <div style={{
            padding: '14px 18px', borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', marginBottom: '24px', fontSize: '14px',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)', padding: '32px',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Project Name *</label>
            <input
              name="name" value={form.name} onChange={handleChange} required
              placeholder="e.g., E-Commerce Platform"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Description *</label>
            <textarea
              name="description" value={form.description} onChange={handleChange} required
              placeholder="Describe your project in detail..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Target Users</label>
            <input
              name="target_users" value={form.target_users} onChange={handleChange}
              placeholder="e.g., Small business owners, ages 25-45"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Platform</label>
              <select name="platform" value={form.platform} onChange={handleChange} style={inputStyle}>
                <option value="web">Web</option>
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
                <option value="api">API / Backend</option>
                <option value="fullstack">Full Stack</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Complexity</label>
              <select name="complexity" value={form.complexity} onChange={handleChange} style={inputStyle}>
                <option value="simple">Simple</option>
                <option value="moderate">Moderate</option>
                <option value="complex">Complex</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={labelStyle}>Tech Stack (comma-separated)</label>
            <input
              name="tech_stack" value={form.tech_stack} onChange={handleChange}
              placeholder="e.g., React, Node.js, PostgreSQL"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                padding: '12px 24px', borderRadius: 'var(--radius-sm)',
                backgroundColor: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--border-secondary)', fontWeight: 600, fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1, padding: '12px 24px', borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #00d4aa, #00b894)',
                color: '#0f0f23', fontWeight: 700, fontSize: '14px',
                border: 'none', opacity: submitting ? 0.7 : 1, cursor: 'pointer',
              }}
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
