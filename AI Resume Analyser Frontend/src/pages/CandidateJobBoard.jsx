import React, { useState } from 'react';
import { Card, Row, Col, Button, Badge, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { FilterBar } from '../components/FilterBar';
import { candidateService } from '../services/candidateService';
import { Briefcase, MapPin, GraduationCap, Clock, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export const CandidateJobBoard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch jobs
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['candidateJobs', searchQuery],
    queryFn: () => candidateService.getJobs({ query: searchQuery })
  });

  // Apply Mutation
  const applyMutation = useMutation({
    mutationFn: async ({ jobId, file }) => {
      return await candidateService.apply(jobId, file);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['candidateApps']);
      setApplyResult(data);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || 'Failed to submit application.');
    }
  });

  const handleApplySubmit = (e) => {
    e.preventDefault();
    if (!resumeFile) {
      setErrorMsg('Please select a resume file (PDF or DOCX)');
      return;
    }
    setErrorMsg('');
    applyMutation.mutate({ jobId: selectedJob.id, file: resumeFile });
  };

  return (
    <Layout>
      <div className="mb-4">
        <h2 className="fw-extrabold text-dark mb-1">Explore Open Positions</h2>
        <p className="text-muted mb-0">Browse career openings and apply with instant Multimodal AI resume evaluation</p>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder="Filter jobs by title, skills (e.g. Java, React, Docker)..."
      />

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-4 p-5 text-center bg-white">
          <Briefcase size={48} className="text-muted mx-auto mb-3" />
          <h5 className="fw-bold">No Openings Match Your Query</h5>
          <p className="text-muted mb-0">Try searching for other technical skills or keywords.</p>
        </Card>
      ) : (
        <Row className="g-4">
          {jobs.map((job) => (
            <Col lg={6} key={job.id}>
              <Card className="border-0 shadow-sm rounded-4 p-4 h-100 bg-white d-flex flex-column justify-content-between hover-card">
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="fw-bold text-dark mb-1">{job.title}</h5>
                    <Badge bg="primary-subtle" className="text-primary border border-primary-subtle px-2 py-1">
                      {job.experienceRequired}+ Yrs Exp
                    </Badge>
                  </div>

                  <div className="d-flex gap-3 text-muted small mb-3 flex-wrap">
                    <span className="d-flex align-items-center gap-1">
                      <GraduationCap size={15} /> {job.educationLevel || "Bachelor's Degree"}
                    </span>
                    <span className="d-flex align-items-center gap-1">
                      <Clock size={15} /> Posted {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-secondary small mb-3 line-clamp-3">
                    {job.description}
                  </p>

                  <div className="mb-4">
                    <div className="small fw-semibold text-muted mb-1">Target Skills:</div>
                    <div className="d-flex flex-wrap gap-1">
                      {job.skillsRequired?.split(',').map((skill, idx) => (
                        <Badge key={idx} bg="light" text="dark" className="border">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                  <span className="text-muted small">By {job.createdByName}</span>
                  <Button
                    variant="primary"
                    size="sm"
                    className="d-flex align-items-center gap-1 px-3"
                    onClick={() => {
                      setSelectedJob(job);
                      setResumeFile(null);
                      setApplyResult(null);
                      setErrorMsg('');
                    }}
                  >
                    <span>Apply with Resume</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 1-Click Application Modal */}
      {selectedJob && (
        <Modal show={true} onHide={() => setSelectedJob(null)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title className="fs-5 fw-bold">
              Apply for: {selectedJob.title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            {applyResult ? (
              <div className="text-center py-4">
                <div className="d-inline-flex p-3 rounded-circle bg-success-subtle text-success mb-3">
                  <CheckCircle size={36} />
                </div>
                <h4 className="fw-bold mb-1">Application Submitted!</h4>
                <p className="text-muted small mb-3">{applyResult.message}</p>

                <div className="card p-3 bg-light border-0 rounded-4 mb-4" style={{ maxWidth: '420px', margin: 'auto' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold">AI Calculated Fit:</span>
                    <Badge bg={applyResult.matchScore >= 75 ? 'success' : 'primary'} className="fs-6">
                      {Math.round(applyResult.matchScore)}% Match
                    </Badge>
                  </div>
                  <p className="small text-secondary mb-0">{applyResult.executiveSummary}</p>
                </div>

                <div className="d-flex justify-content-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/candidate/skill-gap/${applyResult.applicationId}`)}
                  >
                    View Skill Gap Coaching Report
                  </Button>
                  <Button variant="outline-secondary" onClick={() => setSelectedJob(null)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <Form onSubmit={handleApplySubmit}>
                {errorMsg && <Alert variant="danger" className="mb-3">{errorMsg}</Alert>}

                <div className="bg-light-subtle p-3 rounded-3 mb-3 border">
                  <h6 className="fw-bold mb-1">{selectedJob.title}</h6>
                  <p className="small text-muted mb-0">{selectedJob.skillsRequired}</p>
                </div>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold small">Upload Resume (PDF, DOCX, or TXT)</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    required
                  />
                  <Form.Text className="text-muted">
                    Your resume will be parsed with Apache PDFBox/POI and screened against requirements using Multimodal LLM AI.
                  </Form.Text>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="secondary" onClick={() => setSelectedJob(null)} disabled={applyMutation.isPending}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={applyMutation.isPending} className="d-flex align-items-center gap-2">
                    {applyMutation.isPending ? (
                      <>
                        <Spinner size="sm" animation="border" />
                        <span>AI Evaluating Resume...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Submit Application</span>
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            )}
          </Modal.Body>
        </Modal>
      )}
    </Layout>
  );
};
