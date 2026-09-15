import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ApprovalCard from '../components/common/ApprovalCard';
import api from '../services/api';
import type { Approval } from '../types';

export default function ApprovalsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadApprovals();
  }, [projectId]);

  async function loadApprovals() {
    setLoading(true);
    try {
      const res = await api.getApprovals(projectId!);
      setApprovals(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDecide = async (id: string, decision: 'approved' | 'rejected', note?: string) => {
    await api.decideApproval(id, decision, note);
    await loadApprovals();
  };

  if (loading) return <Layout projectId={projectId} title="Approvals"><LoadingSpinner text="Loading approvals..." /></Layout>;

  return (
    <Layout projectId={projectId} title="Approvals" subtitle={`${approvals.filter(a => a.status === 'pending').length} pending requests`}>
      {approvals.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No approval requests"
          description="Approval requests will appear here when AI agents need your decision."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '700px' }}>
          {approvals.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} onDecide={handleDecide} />
          ))}
        </div>
      )}
    </Layout>
  );
}
