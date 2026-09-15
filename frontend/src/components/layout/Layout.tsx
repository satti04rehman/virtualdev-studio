import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  projectId?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Layout({ children, projectId, title, subtitle, actions }: LayoutProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar projectId={projectId} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title={title} subtitle={subtitle} actions={actions} />
        <main style={{
          flex: 1,
          overflow: 'auto',
          padding: '28px',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
