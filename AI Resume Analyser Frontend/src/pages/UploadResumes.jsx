import React, { useState, useEffect } from 'react';
import { Card, Form, Button, ProgressBar, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { FileDrop } from '../components/FileDrop';
import { useUploadProgress } from '../hooks/useUploadProgress';
import { recruiterService } from '../services/recruiterService';
import { UploadCloud, CheckCircle, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

export const UploadResumes = () => {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch recruiter jobs to choose target job
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['recruiterJobs'],
    queryFn: recruiterService.getJobs
  });

  const { progress, startListening, resetProgress } = useUploadProgress(selectedJobId);

  useEffect(() => {
    if (progress.completed) {
      setUploading(false);
    }
  }, [progress.completed]);

  const handleStartBatchUpload = async () => {
    if (!selectedJobId) {
      setErrorMsg('Please select a target Job Opening to evaluate resumes against.');
      return;
    }
    if (files.length === 0) {
      setErrorMsg('Please drop at least one resume document (PDF or DOCX).');
      return;
    }

    setErrorMsg('');
    setUploading(true);
    resetProgress();

    // Start listening to SSE stream first
    startListening();

    try {
      await recruiterService.uploadResumes(Number(selectedJobId), files);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit batch upload.');
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-4">
        <h2 className="fw-extrabold text-dark mb-1">Batch Resume Screening</h2>
        <p className="text-muted mb-0">
          Upload 20+ candidate resumes concurrently with real-time Server-Sent Events (SSE) AI evaluation streaming.
        </p>
      </div>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            {errorMsg && <Alert variant="danger" className="mb-4">{errorMsg}</Alert>}

            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold small">1. Select Target Job Opening</Form.Label>
              {loadingJobs ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <Form.Select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  disabled={uploading}
                >
                  <option value="">-- Choose Job Opening --</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.experienceRequired}+ yrs exp)
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold small">2. Upload Resumes (PDF / DOCX)</Form.Label>
              <FileDrop files={files} setFiles={setFiles} acceptMulti={true} maxFiles={50} />
            </Form.Group>

            <Button
              variant="primary"
              size="lg"
              disabled={uploading || files.length === 0 || !selectedJobId}
              onClick={handleStartBatchUpload}
              className="w-100 d-flex align-items-center justify-content-center gap-2 py-3"
            >
              {uploading && !progress.completed ? (
                <>
                  <Spinner size="sm" animation="border" />
                  <span>Processing Concurrently via AI ({progress.current}/{progress.total || files.length})...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={20} />
                  <span>Launch Live AI Batch Evaluation ({files.length} {files.length === 1 ? 'Resume' : 'Resumes'})</span>
                </>
              )}
            </Button>
          </Card>
        </Col>

        {/* Live SSE Stream Monitor */}
        <Col lg={5}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                Live Screening Monitor
              </h5>
              {uploading && !progress.completed && (
                <Badge bg="danger" className="pulsing-badge">
                  SSE STREAM LIVE
                </Badge>
              )}
            </div>

            {uploading || progress.current > 0 || progress.completed ? (
              <div className="flex-grow-1 d-flex flex-column">
                <div className="mb-3">
                  <div className="d-flex justify-content-between small fw-semibold mb-1">
                    <span>Evaluation Progress:</span>
                    <span className="text-primary">{progress.percentage}%</span>
                  </div>
                  <ProgressBar
                    animated={!progress.completed}
                    striped
                    now={progress.percentage}
                    variant={progress.completed ? 'success' : 'primary'}
                    style={{ height: '12px' }}
                    className="rounded-pill"
                  />
                  <div className="small text-muted mt-2">
                    {progress.message || 'Connecting to Multimodal LLM worker...'}
                  </div>
                </div>

                {progress.completed && (
                  <Alert variant="success" className="py-2 small d-flex justify-content-between align-items-center mb-3">
                    <span className="d-flex align-items-center gap-1">
                      <CheckCircle size={16} /> Batch Evaluation Complete!
                    </span>
                    <Button
                      as={Link}
                      to={`/recruiter/analyzed?jobId=${selectedJobId}`}
                      variant="success"
                      size="sm"
                    >
                      View Results
                    </Button>
                  </Alert>
                )}

                <div className="fw-semibold small text-muted mb-2">Live Evaluated Resumes Feed:</div>
                <div className="overflow-y-auto flex-grow-1 d-flex flex-column gap-2 pe-1" style={{ maxHeight: '350px' }}>
                  {progress.evaluations.length === 0 ? (
                    <div className="text-center text-muted small py-4">
                      Awaiting incoming stream packets...
                    </div>
                  ) : (
                    progress.evaluations.map((cand, idx) => (
                      <div key={idx} className="p-3 border rounded-3 bg-light-subtle d-flex justify-content-between align-items-center">
                        <div className="text-truncate me-2">
                          <div className="fw-bold small text-truncate">{cand.name || 'Candidate'}</div>
                          <div className="text-muted small text-truncate">{cand.fileName}</div>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                          {cand.cheatDetected && (
                            <Badge bg="danger" title="ATS gaming detected">
                              <AlertTriangle size={12} />
                            </Badge>
                          )}
                          <Badge bg={(cand.matchScore || 0) >= 75 ? 'success' : 'primary'} className="fs-6">
                            {Math.round(cand.matchScore || 0)}%
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-muted my-auto">
                <UploadCloud size={48} className="text-muted opacity-50 mb-3" />
                <p className="mb-0">Select a job and upload resumes to start the real-time AI evaluation stream.</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Layout>
  );
};
