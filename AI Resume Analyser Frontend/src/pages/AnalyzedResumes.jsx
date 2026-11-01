import React, { useState } from 'react';
import { Card, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { CandidatesList } from '../components/CandidatesList';
import { RejectModal } from '../components/RejectModal';
import { recruiterService } from '../services/recruiterService';
import { CheckCircle, ArrowLeft, UploadCloud, Briefcase } from 'lucide-react';

export const AnalyzedResumes = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [rejectingCandidate, setRejectingCandidate] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  // Fetch recruiter jobs to populate selector
  const { data: jobs = [] } = useQuery({
    queryKey: ['recruiterJobs'],
    queryFn: recruiterService.getJobs
  });

  const currentJobId = searchParams.get('jobId') || (jobs.length > 0 ? String(jobs[0].id) : '');

  // Fetch historical persistent batches for this job
  const { data: batches = [] } = useQuery({
    queryKey: ['jobBatches', currentJobId],
    queryFn: () => recruiterService.getBatches(Number(currentJobId)),
    enabled: !!currentJobId
  });

  // Fetch batch results from database
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['uploadResults', currentJobId, selectedBatchId],
    queryFn: () => recruiterService.getUploadResults(Number(currentJobId), selectedBatchId),
    enabled: !!currentJobId
  });

  const acceptMutation = useMutation({
    mutationFn: (appId) => recruiterService.acceptCandidate(appId),
    onSuccess: () => {
      queryClient.invalidateQueries(['uploadResults', currentJobId]);
      setActionMsg('Candidate shortlisted! Acceptance email dispatched.');
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ appId, feedback }) => recruiterService.rejectCandidate(appId, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries(['uploadResults', currentJobId]);
      setRejectingCandidate(null);
      setActionMsg('Candidate archived. Automated Skill Gap Coaching Report sent.');
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  return (
    <Layout>
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <Button as={Link} to="/recruiter/upload-resumes" variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1 text-muted mb-2">
            <ArrowLeft size={16} /> Back to Batch Upload
          </Button>
          <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
            <CheckCircle className="text-success" size={28} />
            Screening & Evaluation Results
          </h2>
          <p className="text-muted mb-0">
            {candidates.length} candidate resumes evaluated and ranked using Multimodal Explainable AI
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap align-items-center">
          {jobs.length > 0 && (
            <div style={{ minWidth: '220px' }}>
              <Form.Select
                value={currentJobId}
                onChange={(e) => {
                  setSelectedBatchId('');
                  setSearchParams({ jobId: e.target.value });
                }}
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

          {batches.length > 0 && (
            <div style={{ minWidth: '220px' }}>
              <Form.Select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="fw-semibold bg-white shadow-sm border-warning"
              >
                <option value="">Latest Upload Batch (Default)</option>
                {batches.map((b, idx) => (
                  <option key={b} value={b}>
                    Batch Session #{idx + 1} ({b.substring(0, 18)})
                  </option>
                ))}
              </Form.Select>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
          Database Persisted: Batch Results Permanently Saved
        </span>
        {selectedBatchId && (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 font-monospace">
            Active Batch: {selectedBatchId}
          </span>
        )}
      </div>

      {actionMsg && <Alert variant="success" className="py-2 small mb-4">{actionMsg}</Alert>}

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : candidates.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-4 p-5 text-center bg-white">
          <UploadCloud size={48} className="text-muted mx-auto mb-3" />
          <h5 className="fw-bold">No Evaluated Resumes Found for this Opening</h5>
          <p className="text-muted mb-3">Upload a batch of candidate resumes to view structured AI scoring results here.</p>
          <div>
            <Button as={Link} to="/recruiter/upload-resumes" variant="primary">
              Go to Batch Resume Upload
            </Button>
          </div>
        </Card>
      ) : (
        <CandidatesList
          candidates={candidates}
          onAccept={(appId) => acceptMutation.mutate(appId)}
          onReject={(cand) => setRejectingCandidate(cand)}
          loading={acceptMutation.isPending || rejectMutation.isPending}
        />
      )}

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
