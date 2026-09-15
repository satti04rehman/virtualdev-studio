import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const isLoggedIn = !!api.getToken();

  const features = [
    { icon: '🧠', title: 'AI-Powered Analysis', desc: 'Automatically analyze requirements and generate comprehensive project specifications.' },
    { icon: '🔬', title: 'Smart Research', desc: 'AI agents research best practices, technologies, and architectural patterns.' },
    { icon: '🏗️', title: 'Auto Architecture', desc: 'Generate system architecture, component diagrams, and API designs.' },
    { icon: '⚡', title: 'Task Orchestration', desc: 'Intelligent task distribution across specialized AI agents.' },
    { icon: '🧪', title: 'Automated Testing', desc: 'AI-driven test generation and quality assurance.' },
    { icon: '📄', title: 'Documentation', desc: 'Automatic generation of comprehensive project documentation.' },
  ];

  const workflow = [
    { step: '01', title: 'Define Project', desc: 'Describe your idea, target users, and requirements.' },
    { step: '02', title: 'AI Analysis', desc: 'Our AI team analyzes and creates a complete plan.' },
    { step: '03', title: 'Architecture', desc: 'System design and component architecture generation.' },
    { step: '04', title: 'Development', desc: 'AI agents build your project with human oversight.' },
    { step: '05', title: 'Review & Deploy', desc: 'Testing, documentation, and final delivery.' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <header style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-primary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 800, color: '#fff',
          }}>V</div>
          <span style={{ fontSize: '20px', fontWeight: 700 }}>VirtualDev Studio</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isLoggedIn ? (
            <button onClick={() => navigate('/dashboard')} style={btnPrimary}>Dashboard</button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={btnOutline}>Sign In</button>
              <button onClick={() => navigate('/register')} style={btnPrimary}>Get Started</button>
            </>
          )}
        </div>
      </header>

      <section style={{ padding: '100px 40px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: '9999px',
          backgroundColor: 'rgba(0,212,170,0.1)', color: '#00d4aa',
          fontSize: '13px', fontWeight: 600, marginBottom: '24px',
        }}>
          AI-Powered Development Platform
        </div>
        <h1 style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px' }}>
          Build Software with{' '}
          <span style={{ color: 'var(--accent-primary)' }}>AI Agents</span>
        </h1>
        <p style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          VirtualDev Studio orchestrates a team of specialized AI agents to take your project from idea to
          fully documented, tested, production-ready software.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(isLoggedIn ? '/dashboard' : '/register')}
            style={{ ...btnPrimary, padding: '14px 32px', fontSize: '16px' }}
          >
            Start Building →
          </button>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ ...btnOutline, padding: '14px 32px', fontSize: '16px' }}
          >
            Learn More
          </button>
        </div>
      </section>

      <section id="features" style={{ padding: '80px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '48px' }}>
          Powerful Features
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-lg)', padding: '32px', transition: 'border-color 0.2s',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '48px' }}>
          How It Works
        </h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {workflow.map((w, i) => (
            <div key={i} style={{
              flex: '1 1 180px', maxWidth: '200px', textAlign: 'center',
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-lg)', padding: '28px 20px',
            }}>
              <div style={{
                fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)',
                marginBottom: '12px', opacity: 0.6,
              }}>{w.step}</div>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{w.title}</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{
          maxWidth: '700px', margin: '0 auto', backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-xl)', padding: '60px 40px',
        }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>Ready to Build?</h2>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Join the future of software development with AI-powered agents.
          </p>
          <button
            onClick={() => navigate(isLoggedIn ? '/dashboard' : '/register')}
            style={{ ...btnPrimary, padding: '14px 32px', fontSize: '16px' }}
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Create Free Account'}
          </button>
        </div>
      </section>

      <footer style={{
        borderTop: '1px solid var(--border-primary)', padding: '24px 40px',
        textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)',
      }}>
        VirtualDev Studio · AI-Powered Software Development
      </footer>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 24px', borderRadius: 'var(--radius-sm)',
  background: 'linear-gradient(135deg, #00d4aa, #00b894)',
  color: '#0f0f23', fontWeight: 700, fontSize: '14px',
  border: 'none', cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  padding: '10px 24px', borderRadius: 'var(--radius-sm)',
  backgroundColor: 'transparent', color: 'var(--text-primary)',
  fontWeight: 600, fontSize: '14px',
  border: '1px solid var(--border-secondary)', cursor: 'pointer',
};
