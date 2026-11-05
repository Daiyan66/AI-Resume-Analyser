import React, { useState } from 'react';
import { 
  Table, Badge, Button, Modal, Accordion, ProgressBar, Alert, Tabs, Tab, Row, Col 
} from 'react-bootstrap';
import { 
  FileText, 
  Check, 
  X, 
  AlertTriangle, 
  HelpCircle, 
  Eye, 
  Download, 
  Award, 
  Briefcase,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  Layers
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

export const CandidatesList = ({ candidates = [], onAccept, onReject, loading }) => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('evaluation');

  const handleOpenDetails = (cand) => {
    setSelectedCandidate(cand);
    setActiveTab('evaluation');
    setShowDetailModal(true);
  };

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

  // Parse extracted profile data from rawSkillGapJson if available
  let parsedProfile = null;
  let bonusSkills = [];
  let coachingReport = null;
  if (selectedCandidate?.rawSkillGapJson) {
    try {
      const parsed = typeof selectedCandidate.rawSkillGapJson === 'string'
        ? JSON.parse(selectedCandidate.rawSkillGapJson)
        : selectedCandidate.rawSkillGapJson;
      parsedProfile = parsed?.extractedProfile || null;
      bonusSkills = parsed?.bonusSkills || [];
      coachingReport = parsed?.coachingReport || null;
    } catch (err) {
      // ignore
    }
  }

  const extractedPhone = parsedProfile?.phone || selectedCandidate?.phone || '';
  const extractedEducation = parsedProfile?.education || '';
  const extractedExperience = parsedProfile?.yearsExperience != null ? `${parsedProfile.yearsExperience} yrs` : '';

  return (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
      <style>{`
        .candidate-interactive-row {
          cursor: pointer;
          transition: background-color 0.15s ease-in-out;
        }
        .candidate-interactive-row:hover {
          background-color: #f1f5f9 !important;
        }
      `}</style>
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
                <tr 
                  key={cand.applicationId || cand.resumeId || Math.random()}
                  onClick={() => handleOpenDetails(cand)}
                  className="candidate-interactive-row"
                  title="Click anywhere on row to view full candidate profile, evaluation & uploaded resume"
                >
                  <td className="px-3">
                    <div className="d-flex align-items-center">
                      <div className="avatar-circle me-3 bg-primary-subtle text-primary fw-bold">
                        {cand.name ? cand.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">{cand.name || 'Candidate'}</div>
                        <div className="text-muted small">{cand.email || 'candidate@example.com'}</div>
                        <div className="d-flex align-items-center gap-1 mt-1 flex-wrap">
                          {cand.candidateId ? (
                            <Badge bg="success-subtle" className="text-success border border-success-subtle font-monospace px-1 py-0" style={{ fontSize: '0.72rem' }}>
                              Candidate ID: #{cand.candidateId}
                            </Badge>
                          ) : (
                            <Badge bg="secondary-subtle" className="text-secondary border border-secondary-subtle font-monospace px-1 py-0" style={{ fontSize: '0.72rem' }}>
                              App ID: #{cand.applicationId}
                            </Badge>
                          )}
                          {cand.applicationSource === 'BATCH_UPLOAD' ? (
                            <Badge bg="warning-subtle" className="text-warning-emphasis border border-warning-subtle px-1 py-0" style={{ fontSize: '0.72rem' }}>
                              Batch Upload {cand.batchId ? `(${cand.batchId.substring(0, 12)})` : ''}
                            </Badge>
                          ) : (
                            <Badge bg="info-subtle" className="text-info-emphasis border border-info-subtle px-1 py-0" style={{ fontSize: '0.72rem' }}>
                              Direct Apply
                            </Badge>
                          )}
                          {cand.recruiterFeedback && (
                            <Badge bg="light" className="text-muted border px-1 py-0" style={{ fontSize: '0.72rem' }}>
                              Feedback Recorded
                            </Badge>
                          )}
                        </div>
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
                  <td className="text-end px-3" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="d-inline-flex align-items-center gap-1.5 px-3 py-1.5 rounded-pill fw-semibold shadow-sm text-nowrap"
                      onClick={() => handleOpenDetails(cand)}
                      title="View full candidate results and uploaded resume"
                    >
                      <span>More Details</span>
                      <ChevronRight size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Comprehensive Candidate Details, Results & Uploaded Resume Modal */}
      {selectedCandidate && (
        <Modal 
          show={showDetailModal} 
          onHide={() => setShowDetailModal(false)} 
          size="xl" 
          centered 
          dialogClassName="modal-dialog-scrollable"
        >
          <Modal.Header closeButton className="border-bottom bg-light px-4 py-3">
            <div className="d-flex align-items-center gap-3 w-100 flex-wrap">
              <div 
                className="avatar-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: '48px', height: '48px', fontSize: '1.25rem', borderRadius: '50%' }}
              >
                {selectedCandidate.name ? selectedCandidate.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h5 className="fw-bold mb-0 text-dark">{selectedCandidate.name || 'Candidate Profile'}</h5>
                  {getStatusBadge(selectedCandidate.status)}
                  {getScoreBadge(selectedCandidate.matchScore || 0)}
                  {selectedCandidate.cheatDetected ? (
                    <Badge bg="danger" className="d-inline-flex align-items-center gap-1 px-2 py-1">
                      <AlertTriangle size={13} /> ATS Gaming Flagged
                    </Badge>
                  ) : (
                    <Badge bg="success-subtle" className="text-success border border-success-subtle d-inline-flex align-items-center gap-1 px-2 py-1">
                      <ShieldCheck size={13} /> 100% Clean Resume
                    </Badge>
                  )}
                </div>
                <div className="d-flex align-items-center gap-3 text-muted small mt-1 flex-wrap">
                  <span className="d-inline-flex align-items-center gap-1">
                    <Mail size={13} className="text-secondary" /> {selectedCandidate.email || 'No email provided'}
                  </span>
                  {extractedPhone && (
                    <span className="d-inline-flex align-items-center gap-1">
                      <Phone size={13} className="text-secondary" /> {extractedPhone}
                    </span>
                  )}
                  {selectedCandidate.candidateId && (
                    <span className="font-monospace text-primary">Candidate ID: #{selectedCandidate.candidateId}</span>
                  )}
                  {selectedCandidate.applicationId && (
                    <span className="font-monospace text-secondary">App ID: #{selectedCandidate.applicationId}</span>
                  )}
                  {selectedCandidate.appliedAt && (
                    <span className="d-inline-flex align-items-center gap-1">
                      <Calendar size={13} /> Applied: {new Date(selectedCandidate.appliedAt).toLocaleDateString()}
                    </span>
                  )}
                  <Badge bg="secondary-subtle" className="text-secondary border">
                    {selectedCandidate.applicationSource === 'BATCH_UPLOAD' 
                      ? `Batch Upload ${selectedCandidate.batchId ? `(${selectedCandidate.batchId.substring(0, 10)})` : ''}` 
                      : 'Direct Candidate Application'}
                  </Badge>
                </div>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body className="p-0">
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="px-4 pt-3 border-bottom bg-white"
            >
              {/* TAB 1: Evaluation & Results */}
              <Tab 
                eventKey="evaluation" 
                title={
                  <span className="d-inline-flex align-items-center gap-1.5 py-1">
                    <Sparkles size={16} className="text-primary" /> Evaluation & Results
                  </span>
                }
              >
                <div className="p-4">
                  {selectedCandidate.cheatDetected && (
                    <Alert variant="danger" className="d-flex align-items-start gap-2 mb-4 rounded-3 border-danger shadow-sm">
                      <AlertTriangle size={20} className="mt-1 flex-shrink-0 text-danger" />
                      <div>
                        <strong className="text-danger">ATS Gaming & Prompt Injection Alert Detected:</strong>
                        <div className="small text-danger mt-1">
                          This resume triggered anti-cheat heuristics designed to prevent keyword stuffing, white-font text injection, or system prompt tampering.
                        </div>
                        <ul className="mb-0 mt-2 ps-3 small">
                          {(selectedCandidate.cheatFlags || []).map((flag, idx) => (
                            <li key={idx} className="fw-semibold">{flag}</li>
                          ))}
                        </ul>
                      </div>
                    </Alert>
                  )}

                  <div className="p-3 bg-light rounded-4 border mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="fw-bold text-dark d-flex align-items-center gap-2 mb-0">
                        <Sparkles size={16} className="text-primary" /> AI Executive Hiring Summary
                      </h6>
                      <span className="badge bg-primary-subtle text-primary border">XAI Synthesis</span>
                    </div>
                    <p className="text-secondary mb-0" style={{ lineHeight: '1.65' }}>
                      {selectedCandidate.executiveSummary || 'Standard automated ATS profile evaluation.'}
                    </p>
                  </div>

                  <h6 className="fw-bold mb-3 text-dark d-flex align-items-center gap-2">
                    <Award size={18} className="text-primary" /> Multi-Dimensional Fit Metrics
                  </h6>
                  <Row className="g-3 mb-4">
                    <Col md={6}>
                      <div className="p-3 border rounded-3 bg-white shadow-sm h-100">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-semibold">Hard Skill Alignment (35%)</span>
                          <strong className="text-primary">{Math.round(selectedCandidate.skillMatchScore || 0)}%</strong>
                        </div>
                        <ProgressBar now={selectedCandidate.skillMatchScore || 0} variant="primary" style={{ height: '8px' }} />
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="p-3 border rounded-3 bg-white shadow-sm h-100">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-semibold">Experience Depth & Seniority (25%)</span>
                          <strong className="text-success">{Math.round(selectedCandidate.experienceScore || 0)}%</strong>
                        </div>
                        <ProgressBar now={selectedCandidate.experienceScore || 0} variant="success" style={{ height: '8px' }} />
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="p-3 border rounded-3 bg-white shadow-sm h-100">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-semibold">STAR Metric & Impact (25%)</span>
                          <strong className="text-info">{Math.round(selectedCandidate.impactScore || 0)}%</strong>
                        </div>
                        <ProgressBar now={selectedCandidate.impactScore || 0} variant="info" style={{ height: '8px' }} />
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="p-3 border rounded-3 bg-white shadow-sm h-100">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-semibold">Overall Composite Match</span>
                          <strong className="text-dark">{Math.round(selectedCandidate.matchScore || 0)}%</strong>
                        </div>
                        <ProgressBar now={selectedCandidate.matchScore || 0} variant="dark" style={{ height: '8px' }} />
                      </div>
                    </Col>
                  </Row>

                  {(extractedEducation || extractedExperience) && (
                    <div className="mb-4 p-3 bg-light-subtle border rounded-3">
                      <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-1.5">
                        <GraduationCap size={16} className="text-secondary" /> Extracted Candidate Background
                      </h6>
                      <Row className="g-2 small">
                        {extractedEducation && (
                          <Col md={6}>
                            <span className="text-muted d-block">Education:</span>
                            <strong className="text-dark">{extractedEducation}</strong>
                          </Col>
                        )}
                        {extractedExperience && (
                          <Col md={6}>
                            <span className="text-muted d-block">Identified Experience:</span>
                            <strong className="text-dark">{extractedExperience}</strong>
                          </Col>
                        )}
                      </Row>
                    </div>
                  )}

                  <Row className="g-3">
                    <Col md={6}>
                      <h6 className="fw-bold text-success mb-2 d-flex align-items-center gap-1.5">
                        <CheckCircle2 size={16} /> Matched Core Skills
                      </h6>
                      <div className="d-flex flex-wrap gap-1.5 p-3 bg-white border rounded-3 min-h-100">
                        {selectedCandidate.matchedSkills && selectedCandidate.matchedSkills.length > 0 ? (
                          selectedCandidate.matchedSkills.map((skill, idx) => (
                            <Badge key={idx} bg="success-subtle" className="text-success border border-success-subtle px-2 py-1">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted small">No specific direct skill matches identified.</span>
                        )}
                      </div>
                    </Col>
                    <Col md={6}>
                      <h6 className="fw-bold text-danger mb-2 d-flex align-items-center gap-1.5">
                        <AlertTriangle size={16} /> Missing Skills & Gaps
                      </h6>
                      <div className="d-flex flex-wrap gap-1.5 p-3 bg-white border rounded-3 min-h-100">
                        {selectedCandidate.missingSkills && selectedCandidate.missingSkills.length > 0 ? (
                          selectedCandidate.missingSkills.map((skill, idx) => (
                            <Badge key={idx} bg="danger-subtle" className="text-danger border border-danger-subtle px-2 py-1">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted small">None identified — complete coverage.</span>
                        )}
                      </div>
                    </Col>
                  </Row>

                  {bonusSkills && bonusSkills.length > 0 && (
                    <div className="mt-3">
                      <h6 className="fw-bold text-primary mb-2">Bonus Skills & Advantage Qualifications</h6>
                      <div className="d-flex flex-wrap gap-1.5">
                        {bonusSkills.map((bs, idx) => (
                          <Badge key={idx} bg="primary-subtle" className="text-primary border border-primary-subtle px-2 py-1">
                            +{bs}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCandidate.recruiterFeedback && (
                    <div className="mt-4 p-3 bg-warning-subtle border border-warning-subtle rounded-3">
                      <h6 className="fw-bold text-warning-emphasis mb-1">Previous Recruiter Feedback Recorded</h6>
                      <p className="mb-0 text-dark small">"{selectedCandidate.recruiterFeedback}"</p>
                    </div>
                  )}
                </div>
              </Tab>

              {/* TAB 2: Uploaded Resume Document */}
              <Tab 
                eventKey="resume" 
                title={
                  <span className="d-inline-flex align-items-center gap-1.5 py-1">
                    <FileText size={16} className="text-indigo" /> Uploaded Resume Document
                    {selectedCandidate.resumeId && (
                      <span className="badge bg-primary-subtle text-primary border ms-1" style={{ fontSize: '0.65rem' }}>
                        Live Document
                      </span>
                    )}
                  </span>
                }
              >
                <div className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded-3 border flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <FileText size={22} className="text-primary" />
                      <div>
                        <div className="fw-bold text-dark">
                          {selectedCandidate.fileName || 'Candidate_Resume.pdf'}
                        </div>
                        <div className="text-muted small">
                          Official document uploaded by candidate for this requisition
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {selectedCandidate.resumeId ? (
                        <>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            as="a"
                            href={`${API_BASE_URL}/files/resumes/${selectedCandidate.resumeId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="d-inline-flex align-items-center gap-1.5 fw-semibold"
                          >
                            <ExternalLink size={14} /> Open in New Tab
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            as="a"
                            href={`${API_BASE_URL}/files/resumes/${selectedCandidate.resumeId}`}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="d-inline-flex align-items-center gap-1.5 fw-semibold"
                          >
                            <Download size={14} /> Download File
                          </Button>
                        </>
                      ) : (
                        <Badge bg="secondary">No File Attached</Badge>
                      )}
                    </div>
                  </div>

                  {selectedCandidate.resumeId ? (
                    <div className="border rounded-4 overflow-hidden bg-secondary-subtle shadow-sm" style={{ minHeight: '620px' }}>
                      <iframe
                        src={`${API_BASE_URL}/files/resumes/${selectedCandidate.resumeId}#toolbar=1&view=FitH`}
                        title="Candidate Uploaded Resume"
                        width="100%"
                        height="640px"
                        style={{ border: 'none', display: 'block' }}
                      />
                      <div className="p-2 text-center bg-white border-top text-muted small">
                        Live document viewport. If preview does not render inline in your browser, use the <strong>Open in New Tab</strong> or <strong>Download File</strong> buttons above.
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5 bg-light rounded-4 border">
                      <FileText size={40} className="text-muted mb-2" />
                      <h6 className="fw-semibold text-secondary">No Uploaded Resume File Attached</h6>
                      <p className="text-muted small mb-0">This application was submitted without a physical resume document.</p>
                    </div>
                  )}
                </div>
              </Tab>

              {/* TAB 3: Tailored Interview Rubrics */}
              <Tab 
                eventKey="rubrics" 
                title={
                  <span className="d-inline-flex align-items-center gap-1.5 py-1">
                    <HelpCircle size={16} className="text-success" /> Tailored Interview Rubrics
                    {selectedCandidate.interviewQuestions?.length > 0 && (
                      <span className="badge bg-success-subtle text-success border ms-1" style={{ fontSize: '0.65rem' }}>
                        {selectedCandidate.interviewQuestions.length} Questions
                      </span>
                    )}
                  </span>
                }
              >
                <div className="p-4">
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <h6 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                      <HelpCircle size={18} className="text-primary" /> Defensible Technical Interview Questions
                    </h6>
                    <p className="text-secondary small mb-0">
                      These technical interview questions are synthesized specifically for <strong>{selectedCandidate.name}</strong> based on their resume claims, tech stack, and identified skill gaps, along with a structured 1-to-5 scoring rubric.
                    </p>
                  </div>

                  {selectedCandidate.interviewQuestions && selectedCandidate.interviewQuestions.length > 0 ? (
                    <Accordion defaultActiveKey="0">
                      {selectedCandidate.interviewQuestions.map((item, idx) => (
                        <Accordion.Item eventKey={String(idx)} key={idx} className="mb-2 border rounded-3 overflow-hidden">
                          <Accordion.Header>
                            <div className="d-flex align-items-center gap-2 text-start">
                              <span className="badge bg-primary-subtle text-primary font-monospace">Q{idx + 1}</span>
                              <span className="fw-semibold text-dark">{item.question}</span>
                            </div>
                          </Accordion.Header>
                          <Accordion.Body className="bg-light-subtle">
                            <div className="mb-3 d-flex align-items-center gap-2">
                              <span className="text-muted small fw-semibold">Target Skill / Resume Claim:</span>{' '}
                              <Badge bg="primary">{item.targetSkillOrClaim}</Badge>
                            </div>
                            <div className="border rounded-3 p-3 bg-white small shadow-sm">
                              <div className="d-flex align-items-start gap-2 mb-2 pb-2 border-bottom">
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 text-nowrap">Level 1 (Unsatisfactory)</span>
                                <span className="text-secondary">{item.rubricLevel1}</span>
                              </div>
                              <div className="d-flex align-items-start gap-2 mb-2 pb-2 border-bottom">
                                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 text-nowrap">Level 3 (Competent)</span>
                                <span className="text-secondary">{item.rubricLevel3}</span>
                              </div>
                              <div className="d-flex align-items-start gap-2">
                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 text-nowrap">Level 5 (Exceptional)</span>
                                <span className="text-secondary">{item.rubricLevel5}</span>
                              </div>
                            </div>
                          </Accordion.Body>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-5 bg-light rounded-4 border">
                      <HelpCircle size={40} className="text-muted mb-2" />
                      <h6 className="fw-semibold text-secondary">No Custom Interview Questions Generated</h6>
                      <p className="text-muted small mb-0">Interview questions are generated during comprehensive AI evaluation.</p>
                    </div>
                  )}
                </div>
              </Tab>
            </Tabs>
          </Modal.Body>

          <Modal.Footer className="d-flex justify-content-between align-items-center bg-light py-3 px-4 border-top">
            <div className="d-flex align-items-center gap-2">
              {selectedCandidate.resumeId && (
                <Button
                  variant="outline-dark"
                  size="sm"
                  as="a"
                  href={`${API_BASE_URL}/files/resumes/${selectedCandidate.resumeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="d-inline-flex align-items-center gap-1.5"
                >
                  <Download size={14} /> Download Resume
                </Button>
              )}
            </div>
            <div className="d-flex align-items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              {onReject && selectedCandidate.status !== 'REJECTED' && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="d-inline-flex align-items-center gap-1.5 fw-semibold"
                  disabled={loading}
                  onClick={() => {
                    setShowDetailModal(false);
                    onReject(selectedCandidate);
                  }}
                >
                  <X size={15} /> Reject Candidate
                </Button>
              )}
              {onAccept && selectedCandidate.status !== 'ACCEPTED' && (
                <Button
                  variant="success"
                  size="sm"
                  className="d-inline-flex align-items-center gap-1.5 fw-semibold shadow-sm"
                  disabled={loading}
                  onClick={() => {
                    onAccept(selectedCandidate.applicationId);
                    setShowDetailModal(false);
                  }}
                >
                  <Check size={15} /> Shortlist Candidate
                </Button>
              )}
            </div>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};
