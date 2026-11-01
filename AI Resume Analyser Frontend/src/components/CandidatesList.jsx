import React, { useState } from 'react';
import { Table, Badge, Button, Modal, Accordion, ProgressBar, Alert } from 'react-bootstrap';
import { 
  FileText, 
  Check, 
  X, 
  AlertTriangle, 
  HelpCircle, 
  Eye, 
  Download, 
  Award, 
  Briefcase 
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

export const CandidatesList = ({ candidates = [], onAccept, onReject, loading }) => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRubricModal, setShowRubricModal] = useState(false);

  const getScoreBadge = (score) => {
    const num = Math.round(score || 0);
    if (num >= 80) return <Badge bg="success" className="px-2 py-1 fs-6">{num}%</Badge>;
    if (num >= 60) return <Badge bg="primary" className="px-2 py-1 fs-6">{num}%</Badge>;
    if (num >= 40) return <Badge bg="warning" text="dark" className="px-2 py-1 fs-6">{num}%</Badge>;
    return <Badge bg="danger" className="px-2 py-1 fs-6">{num}%</Badge>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge bg="success-subtle" className="text-success border border-success-subtle px-2 py-1">Shortlisted</Badge>;
      case 'REJECTED':
        return <Badge bg="danger-subtle" className="text-danger border border-danger-subtle px-2 py-1">Rejected</Badge>;
      default:
        return <Badge bg="secondary-subtle" className="text-secondary border border-secondary-subtle px-2 py-1">Under Review</Badge>;
    }
  };

  const safeList = Array.isArray(candidates) ? candidates : [];

  return (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
      <div className="table-responsive">
        <Table hover align="middle" className="mb-0">
          <thead className="table-light">
            <tr>
              <th className="py-3 px-3">Candidate</th>
              <th className="py-3">Overall Match</th>
              <th className="py-3">XAI Breakdown</th>
              <th className="py-3">Anti-Cheat Flags</th>
              <th className="py-3">Status</th>
              <th className="py-3 text-end px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeList.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-5 text-muted">
                  No candidate evaluations found.
                </td>
              </tr>
            ) : (
              safeList.map((cand) => (
                <tr key={cand.applicationId || cand.resumeId || Math.random()}>
                  <td className="px-3">
                    <div className="d-flex align-items-center">
                      <div className="avatar-circle me-3 bg-primary-subtle text-primary fw-bold">
                        {cand.name ? cand.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">{cand.name || 'Candidate'}</div>
                        <div className="text-muted small">{cand.email || 'candidate@example.com'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {getScoreBadge(cand.matchScore || 0)}
                    </div>
                  </td>
                  <td style={{ minWidth: '180px' }}>
                    <div className="small">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Skills (35%):</span>
                        <strong className="text-primary">{Math.round(cand.skillMatchScore || 0)}%</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span>Exp (25%):</span>
                        <strong className="text-success">{Math.round(cand.experienceScore || 0)}%</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>STAR Impact (25%):</span>
                        <strong className="text-indigo">{Math.round(cand.impactScore || 0)}%</strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    {cand.cheatDetected ? (
                      <Badge bg="danger" className="d-inline-flex align-items-center gap-1 px-2 py-1">
                        <AlertTriangle size={14} /> Gaming Flagged
                      </Badge>
                    ) : (
                      <Badge bg="success-subtle" className="text-success border border-success-subtle d-inline-flex align-items-center gap-1 px-2 py-1">
                        <Check size={14} /> Clean Resume
                      </Badge>
                    )}
                  </td>
                  <td>{getStatusBadge(cand.status)}</td>
                  <td className="text-end px-3">
                    <div className="d-flex justify-content-end gap-1">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        title="View Detailed Evaluation"
                        onClick={() => {
                          setSelectedCandidate(cand);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye size={15} />
                      </Button>

                      {cand.interviewQuestions && cand.interviewQuestions.length > 0 && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          title="View Tailored Interview Rubrics"
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setShowRubricModal(true);
                          }}
                        >
                          <HelpCircle size={15} />
                        </Button>
                      )}

                      {cand.resumeId && (
                        <Button
                          variant="outline-dark"
                          size="sm"
                          title="Download Resume Document"
                          as="a"
                          href={`${API_BASE_URL}/files/resumes/${cand.resumeId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download size={15} />
                        </Button>
                      )}

                      {onAccept && cand.status !== 'ACCEPTED' && (
                        <Button
                          variant="success"
                          size="sm"
                          title="Accept & Shortlist Candidate"
                          onClick={() => onAccept(cand.applicationId)}
                          disabled={loading}
                        >
                          <Check size={15} />
                        </Button>
                      )}

                      {onReject && cand.status !== 'REJECTED' && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          title="Reject Candidate with Feedback"
                          onClick={() => onReject(cand)}
                          disabled={loading}
                        >
                          <X size={15} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Detailed Evaluation Modal */}
      {selectedCandidate && (
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
          <Modal.Header closeButton className="border-bottom">
            <Modal.Title className="fs-5 d-flex align-items-center gap-2">
              <Award className="text-primary" size={22} />
              Evaluation Report: <strong>{selectedCandidate.name}</strong>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            {selectedCandidate.cheatDetected && (
              <Alert variant="danger" className="d-flex align-items-start gap-2 mb-4">
                <AlertTriangle size={20} className="mt-1 flex-shrink-0" />
                <div>
                  <strong>ATS Gaming Warning:</strong>
                  <ul className="mb-0 mt-1 ps-3">
                    {(selectedCandidate.cheatFlags || []).map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}

            <div className="bg-light p-3 rounded-3 mb-4">
              <h6 className="fw-bold mb-2 text-dark">Executive Hiring Summary</h6>
              <p className="text-secondary mb-0">{selectedCandidate.executiveSummary || 'No summary available.'}</p>
            </div>

            <h6 className="fw-bold mb-3">Multi-Dimensional Fit Metrics</h6>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="p-3 border rounded-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="fw-semibold">Hard Skill Alignment (35%)</span>
                    <strong>{Math.round(selectedCandidate.skillMatchScore || 0)}%</strong>
                  </div>
                  <ProgressBar now={selectedCandidate.skillMatchScore || 0} variant="primary" style={{ height: '8px' }} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 border rounded-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="fw-semibold">Experience Depth & Seniority (25%)</span>
                    <strong>{Math.round(selectedCandidate.experienceScore || 0)}%</strong>
                  </div>
                  <ProgressBar now={selectedCandidate.experienceScore || 0} variant="success" style={{ height: '8px' }} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 border rounded-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="fw-semibold">STAR Metric & Impact (25%)</span>
                    <strong>{Math.round(selectedCandidate.impactScore || 0)}%</strong>
                  </div>
                  <ProgressBar now={selectedCandidate.impactScore || 0} variant="info" style={{ height: '8px' }} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 border rounded-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="fw-semibold">Overall Composite Match</span>
                    <strong className="text-primary">{Math.round(selectedCandidate.matchScore || 0)}%</strong>
                  </div>
                  <ProgressBar now={selectedCandidate.matchScore || 0} variant="dark" style={{ height: '8px' }} />
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <h6 className="fw-bold text-success mb-2">Matched Core Skills</h6>
                <div className="d-flex flex-wrap gap-1">
                  {(selectedCandidate.matchedSkills || []).map((skill, idx) => (
                    <Badge key={idx} bg="success-subtle" className="text-success border border-success-subtle px-2 py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold text-danger mb-2">Missing Skills & Gaps</h6>
                <div className="d-flex flex-wrap gap-1">
                  {selectedCandidate.missingSkills && selectedCandidate.missingSkills.length > 0 ? (
                    selectedCandidate.missingSkills.map((skill, idx) => (
                      <Badge key={idx} bg="danger-subtle" className="text-danger border border-danger-subtle px-2 py-1">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted small">None identified</span>
                  )}
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Tailored Interview Rubrics Modal */}
      {selectedCandidate && (
        <Modal show={showRubricModal} onHide={() => setShowRubricModal(false)} size="lg" centered>
          <Modal.Header closeButton className="border-bottom">
            <Modal.Title className="fs-5 d-flex align-items-center gap-2">
              <HelpCircle className="text-primary" size={22} />
              Tailored Interview Questions & 1-5 Rubrics
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <p className="text-muted small mb-3">
              These 5 technical interview questions are tailored to <strong>{selectedCandidate.name}</strong>'s specific resume claims and identified skill gaps, along with a defensible 1-5 evaluation rubric.
            </p>
            <Accordion defaultActiveKey="0">
              {(selectedCandidate.interviewQuestions || []).map((item, idx) => (
                <Accordion.Item eventKey={String(idx)} key={idx} className="mb-2 border rounded-3 overflow-hidden">
                  <Accordion.Header>
                    <span className="fw-semibold me-2">Q{idx + 1}:</span> {item.question}
                  </Accordion.Header>
                  <Accordion.Body className="bg-light-subtle">
                    <div className="mb-2">
                      <span className="text-muted small">Target Skill / Claim:</span>{' '}
                      <Badge bg="primary">{item.targetSkillOrClaim}</Badge>
                    </div>
                    <div className="border rounded-2 p-2 bg-white small">
                      <div className="text-danger mb-1">
                        <strong>Level 1 (Unsatisfactory):</strong> {item.rubricLevel1}
                      </div>
                      <div className="text-warning mb-1">
                        <strong>Level 3 (Competent):</strong> {item.rubricLevel3}
                      </div>
                      <div className="text-success">
                        <strong>Level 5 (Exceptional):</strong> {item.rubricLevel5}
                      </div>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRubricModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};
