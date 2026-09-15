import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.register(form.email, form.password, form.full_name, form.username);
      await api.login(form.email, form.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    marginBottom: '16px',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', padding: '40px',
        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-xl)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '16px',
          }}>V</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>Create Account</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Join VirtualDev Studio</p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', marginBottom: '20px', fontSize: '13px',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {([
            { name: 'full_name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
            { name: 'username', label: 'Username', type: 'text', placeholder: 'johndoe' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
          ] as const).map(f => (
            <div key={f.name} style={{ marginBottom: f.name === 'password' ? '24px' : '0px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                {f.label}
              </label>
              <input
                name={f.name} type={f.type} value={form[f.name]}
                onChange={handleChange} required placeholder={f.placeholder}
                style={inputStyle}
              />
            </div>
          ))}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #00d4aa, #00b894)',
              color: '#0f0f23', fontWeight: 700, fontSize: '14px',
              border: 'none', opacity: loading ? 0.7 : 1, cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
