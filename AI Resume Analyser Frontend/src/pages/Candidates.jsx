import React, { useState } from 'react';
import { Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { CandidatesList } from '../components/CandidatesList';
import { FilterBar } from '../components/FilterBar';
import { RejectModal } from '../components/RejectModal';
import { recruiterService } from '../services/recruiterService';
import { Users } from 'lucide-react';

export const Candidates = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minScore, setMinScore] = useState(0);

  const [rejectingCandidate, setRejectingCandidate] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  // Fetch recruiter jobs for dropdown
  const { data: jobs = [] } = useQuery({
    queryKey: ['recruiterJobs'],
    queryFn: recruiterService.getJobs
  });

  const selectedJobId = searchParams.get('jobId') || (jobs.length > 0 ? jobs[0].id : '');

  // Fetch candidates for selected job
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['jobCandidates', selectedJobId],
    queryFn: () => recruiterService.getCandidates(Number(selectedJobId)),
    enabled: !!selectedJobId
  });

  // Accept Mutation
  const acceptMutation = useMutation({
    mutationFn: (appId) => recruiterService.acceptCandidate(appId),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobCandidates', selectedJobId]);
      setActionMsg('Candidate shortlisted! Acceptance confirmation email dispatched.');
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ appId, feedback }) => recruiterService.rejectCandidate(appId, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobCandidates', selectedJobId]);
      setRejectingCandidate(null);
      setActionMsg('Candidate archived. Automated Skill Gap Coaching Report sent via email.');
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const filteredCandidates = candidates.filter((c) => {
    const matchesQuery = !searchQuery ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.matchedSkills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesScore = (c.matchScore || 0) >= minScore;

    return matchesQuery && matchesStatus && matchesScore;
  });

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-dark mb-1">Ranked Candidates</h2>
          <p className="text-muted mb-0">Multi-dimensional AI evaluations with defensible scoring and explainability</p>
        </div>

        {jobs.length > 0 && (
          <div style={{ minWidth: '280px' }}>
            <Form.Select
              value={selectedJobId}
              onChange={(e) => setSearchParams({ jobId: e.target.value })}
              className="fw-semibold bg-white shadow-sm"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Form.Select>
          </div>
        )}
      </div>

      {actionMsg && <Alert variant="success" className="py-2 small mb-4">{actionMsg}</Alert>}

      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        minScore={minScore}
        setMinScore={setMinScore}
      />

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <CandidatesList
          candidates={filteredCandidates}
          onAccept={(appId) => acceptMutation.mutate(appId)}
          onReject={(cand) => setRejectingCandidate(cand)}
          loading={acceptMutation.isPending || rejectMutation.isPending}
        />
      )}

      {/* Reject Modal */}
      <RejectModal
        show={!!rejectingCandidate}
        candidate={rejectingCandidate}
        onHide={() => setRejectingCandidate(null)}
        onConfirmReject={(appId, feedback) => rejectMutation.mutate({ appId, feedback })}
        loading={rejectMutation.isPending}
      />
    </Layout>
  );
};
