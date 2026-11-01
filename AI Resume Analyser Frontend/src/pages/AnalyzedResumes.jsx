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

  const [rejectingCandidate, setRejectingCandidate] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  // Fetch recruiter jobs to populate selector
  const { data: jobs = [] } = useQuery({
    queryKey: ['recruiterJobs'],
    queryFn: recruiterService.getJobs
  });

  const currentJobId = searchParams.get('jobId') || (jobs.length > 0 ? String(jobs[0].id) : '');

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['uploadResults', currentJobId],
    queryFn: () => recruiterService.getUploadResults(Number(currentJobId)),
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

        {jobs.length > 0 && (
          <div style={{ minWidth: '260px' }}>
            <Form.Select
              value={currentJobId}
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
