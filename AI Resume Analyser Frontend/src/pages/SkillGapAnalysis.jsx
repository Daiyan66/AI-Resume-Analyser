import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Row, Col, Badge, ProgressBar, Spinner, Alert, Button, Accordion } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { candidateService } from '../services/candidateService';
import { 
  Award, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  HelpCircle, 
  ArrowLeft, 
  Layers,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip
} from 'recharts';

export const SkillGapAnalysis = () => {
  const { appId } = useParams();
  const navigate = useNavigate();

  // If no appId provided, fetch the latest application ID
  const { data: latestAppData, isLoading: loadingLatest } = useQuery({
    queryKey: ['latestAppId'],
    queryFn: candidateService.getLatestApplicationId,
    enabled: !appId
  });

  useEffect(() => {
    if (!appId && latestAppData?.applicationId) {
      navigate(`/candidate/skill-gap/${latestAppData.applicationId}`, { replace: true });
    }
  }, [appId, latestAppData, navigate]);

  // Fetch Skill Gap Analysis for appId
  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['skillGapAnalysis', appId],
    queryFn: () => candidateService.getSkillGapAnalysis(Number(appId)),
    enabled: !!appId
  });

  if (loadingLatest || (isLoading && appId)) {
    return (
      <Layout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Compiling Explainable AI Fit Analysis...</p>
        </div>
      </Layout>
    );
  }

  if (!appId && !latestAppData?.applicationId) {
    return (
      <Layout>
        <Card className="border-0 shadow-sm rounded-4 p-5 text-center bg-white">
          <Layers size={48} className="text-muted mx-auto mb-3" />
          <h4 className="fw-bold">No Active Application Found</h4>
          <p className="text-muted mb-4">
            Submit a resume application to unlock your comprehensive AI Skill Gap Coaching Report.
          </p>
          <div>
            <Button as={Link} to="/candidate/jobs" variant="primary">
              Browse Open Positions
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }

  if (error || !analysis) {
    return (
      <Layout>
        <Alert variant="danger" className="rounded-4">
          Failed to load analysis for application #{appId}. Please return to applications.
        </Alert>
        <Button as={Link} to="/candidate/status" variant="outline-secondary">
          Back to Applications
        </Button>
      </Layout>
    );
  }

  // Radar Chart Data (Multi-Dimensional Explainable Fit)
  const radarData = [
    { subject: 'Skills (35%)', score: Math.round(analysis.skillMatchScore || 0), fullMark: 100 },
    { subject: 'Experience (25%)', score: Math.round(analysis.experienceScore || 0), fullMark: 100 },
    { subject: 'STAR Impact (25%)', score: Math.round(analysis.impactScore || 0), fullMark: 100 },
    { subject: 'Domain/Edu (15%)', score: Math.round(analysis.domainScore || 0), fullMark: 100 }
  ];

  const matchedList = Array.isArray(analysis.matchedSkills) ? analysis.matchedSkills : [];
  const missingList = Array.isArray(analysis.missingSkills) ? analysis.missingSkills : [];
  const interviewList = Array.isArray(analysis.interviewQuestions) ? analysis.interviewQuestions : [];
  const certList = Array.isArray(analysis.coachingReport?.recommendedCertifications) ? analysis.coachingReport.recommendedCertifications : [];
  const projList = Array.isArray(analysis.coachingReport?.recommendedProjects) ? analysis.coachingReport.recommendedProjects : [];

  return (
    <Layout>
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <Button as={Link} to="/candidate/status" variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1 text-muted mb-2">
            <ArrowLeft size={16} /> Back to My Applications
          </Button>
          <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
            <Award className="text-primary" size={28} />
            Skill Gap Coaching Report
          </h2>
          <p className="text-muted mb-0">
            Explainable AI fit breakdown for <strong>{analysis.jobTitle || 'Position'}</strong>
          </p>
        </div>

        <Badge bg={(analysis.matchScore || 0) >= 75 ? 'success' : 'primary'} className="fs-5 px-3 py-2">
          {Math.round(analysis.matchScore || 0)}% Fit Score
        </Badge>
      </div>

      {/* Recruiter Direct Feedback Note */}
      {analysis.recruiterFeedback && (
        <Card className="border-0 shadow-sm rounded-4 p-4 mb-4 bg-primary-subtle border-start border-4 border-primary">
          <div className="d-flex align-items-start gap-3">
            <div className="p-2 bg-primary text-white rounded-circle flex-shrink-0">
              <MessageSquare size={22} />
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h5 className="fw-bold text-primary mb-0">Hiring Team Direct Feedback</h5>
                <Badge bg="primary">Official Recruiter Note</Badge>
              </div>
              <p className="text-dark mb-0 fs-6 fw-medium" style={{ whiteSpace: 'pre-wrap' }}>
                "{analysis.recruiterFeedback}"
              </p>
            </div>
          </div>
        </Card>
      )}

      <Row className="g-4 mb-4">
        {/* Executive Summary & Radar Fit */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h5 className="fw-bold mb-3 text-dark">Executive Hiring Assessment</h5>
            <div className="p-3 bg-light rounded-3 mb-4">
              <p className="text-secondary mb-0">{analysis.executiveSummary || 'No executive summary available.'}</p>
            </div>

            <h6 className="fw-bold mb-3">Multi-Dimensional Fit Metrics</h6>
            <div className="d-flex flex-column gap-3">
              <div>
                <div className="d-flex justify-content-between small fw-semibold mb-1">
                  <span>Hard Skill Alignment (35% weight)</span>
                  <span className="text-primary">{Math.round(analysis.skillMatchScore || 0)}%</span>
                </div>
                <ProgressBar now={analysis.skillMatchScore || 0} variant="primary" style={{ height: '8px' }} />
              </div>

              <div>
                <div className="d-flex justify-content-between small fw-semibold mb-1">
                  <span>Experience Depth & Seniority (25% weight)</span>
                  <span className="text-success">{Math.round(analysis.experienceScore || 0)}%</span>
                </div>
                <ProgressBar now={analysis.experienceScore || 0} variant="success" style={{ height: '8px' }} />
              </div>

              <div>
                <div className="d-flex justify-content-between small fw-semibold mb-1">
                  <span>Project Impact & STAR Metrics (25% weight)</span>
                  <span className="text-info">{Math.round(analysis.impactScore || 0)}%</span>
                </div>
                <ProgressBar now={analysis.impactScore || 0} variant="info" style={{ height: '8px' }} />
              </div>

              <div>
                <div className="d-flex justify-content-between small fw-semibold mb-1">
                  <span>Domain & Education Fit (15% weight)</span>
                  <span className="text-warning">{Math.round(analysis.domainScore || 0)}%</span>
                </div>
                <ProgressBar now={analysis.domainScore || 0} variant="warning" style={{ height: '8px' }} />
              </div>
            </div>
          </Card>
        </Col>

        {/* 4-Pillar Radar Chart */}
        <Col lg={5}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h5 className="fw-bold mb-2">Multi-Dimensional Fit Radar</h5>
            <p className="text-muted small mb-0">Multi-axis visual alignment</p>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Candidate Fit" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Skills Matrix */}
      <Row className="g-4 mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h6 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
              <CheckCircle size={18} /> Matched Core Skills ({matchedList.length})
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {matchedList.map((skill, idx) => (
                <Badge key={idx} bg="success-subtle" className="text-success border border-success-subtle px-3 py-2 fs-6">
                  {skill}
                </Badge>
              ))}
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h6 className="fw-bold text-danger mb-1 d-flex align-items-center gap-2">
              <AlertCircle size={18} /> Critical Skill Gaps to Bridge ({missingList.length})
            </h6>
            <p className="text-muted small mb-3">
              Click any skill button below to search Google for tutorials, courses, and certifications:
            </p>
            <div className="d-flex flex-wrap gap-2">
              {missingList.length > 0 ? (
                missingList.map((skill, idx) => (
                  <Button
                    key={idx}
                    variant="outline-danger"
                    size="sm"
                    className="d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 fw-semibold shadow-xs"
                    title={`Search Google for ${skill} skill improvement`}
                    onClick={() => {
                      const query = encodeURIComponent(`how to learn and improve ${skill} skill tutorials courses certifications`);
                      window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <span>{skill}</span>
                    <ExternalLink size={13} className="ms-1 opacity-75" />
                  </Button>
                ))
              ) : (
                <span className="text-muted small">No critical skill gaps detected. You meet all primary criteria!</span>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Actionable Candidate Coaching Recommendations */}
      {analysis.coachingReport && (
        <Card className="border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
          <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
            <BookOpen className="text-primary" size={22} />
            Actionable Career Coaching & Upskilling Roadmap
          </h5>
          <Row className="g-4">
            <Col md={6}>
              <div className="p-3 border rounded-3 bg-light-subtle h-100">
                <h6 className="fw-bold text-primary mb-2">Recommended Industry Certifications</h6>
                <ul className="mb-0 ps-3 small text-secondary">
                  {certList.map((c, idx) => (
                    <li key={idx} className="mb-1">{c}</li>
                  ))}
                </ul>
              </div>
            </Col>
            <Col md={6}>
              <div className="p-3 border rounded-3 bg-light-subtle h-100">
                <h6 className="fw-bold text-success mb-2">Recommended Portfolio Projects</h6>
                <ul className="mb-0 ps-3 small text-secondary">
                  {projList.map((p, idx) => (
                    <li key={idx} className="mb-1">{p}</li>
                  ))}
                </ul>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Tailored Interview Preparation Rubrics */}
      {interviewList.length > 0 && (
        <Card className="border-0 shadow-sm rounded-4 p-4 bg-white">
          <h5 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
            <HelpCircle className="text-primary" size={22} />
            Tailored Technical Interview Preparation & Rubric Guide
          </h5>
          <p className="text-muted small mb-4">
            Prepare for recruiter technical screens with these tailored interview questions generated directly against your verified resume claims:
          </p>

          <Accordion defaultActiveKey="0">
            {interviewList.map((q, idx) => (
              <Accordion.Item eventKey={String(idx)} key={idx} className="mb-2 border rounded-3 overflow-hidden">
                <Accordion.Header>
                  <span className="fw-semibold me-2">Question {idx + 1}:</span> {q.question}
                </Accordion.Header>
                <Accordion.Body className="bg-light-subtle">
                  <div className="mb-2">
                    <span className="text-muted small">Target Skill / Claim:</span>{' '}
                    <Badge bg="primary">{q.targetSkillOrClaim}</Badge>
                  </div>
                  <div className="border rounded-2 p-3 bg-white small">
                    <div className="text-danger mb-1">
                      <strong>Score 1 (Unsatisfactory):</strong> {q.rubricLevel1}
                    </div>
                    <div className="text-warning mb-1">
                      <strong>Score 3 (Competent):</strong> {q.rubricLevel3}
                    </div>
                    <div className="text-success">
                      <strong>Score 5 (Exceptional Mastery):</strong> {q.rubricLevel5}
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card>
      )}
    </Layout>
  );
};
