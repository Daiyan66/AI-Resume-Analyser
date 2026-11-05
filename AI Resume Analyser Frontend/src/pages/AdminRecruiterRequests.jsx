import React, { useState } from 'react';
import { Card, Table, Button, Badge, Spinner, Row, Col, Alert, Form, InputGroup } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import api from '../api/axios';
import { 
  Building2, 
  Mail, 
  KeyRound, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  Check, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Info,
  ShieldCheck,
  FileText,
  Send,
  Phone,
  Globe
} from 'lucide-react';

export const AdminRecruiterRequests = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);
  const [copiedOtpId, setCopiedOtpId] = useState(null);
  const [msg, setMsg] = useState('');

  // 1. Fetch Recruiter Requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['adminRecruiterRequests'],
    queryFn: async () => {
      const res = await api.get('/admin/recruiter-requests');
      return res.data || [];
    }
  });

  // 2. Approve Recruiter & Send Password Setup Link Mutation
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/admin/recruiter-requests/${id}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminRecruiterRequests']);
      setMsg(data.message || 'Recruiter approved successfully! Master password setup link has been emailed.');
      setTimeout(() => setMsg(''), 6000);
    },
    onError: (err) => {
      setMsg(err.response?.data?.message || 'Failed to approve recruiter application.');
      setTimeout(() => setMsg(''), 5000);
    }
  });

  // 3. Resend Invitation Mutation
  const resendMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/admin/recruiter-requests/${id}/resend`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRecruiterRequests']);
      setMsg('Invitation link and OTP refreshed & resent.');
      setTimeout(() => setMsg(''), 4000);
    }
  });

  // 4. Delete Request Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/recruiter-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRecruiterRequests']);
      setMsg('Recruiter request deleted.');
      setTimeout(() => setMsg(''), 4000);
    }
  });

  const handleCopyLink = (link, id) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyOtp = (otp, id) => {
    navigator.clipboard.writeText(otp);
    setCopiedOtpId(id);
    setTimeout(() => setCopiedOtpId(null), 2000);
  };

  // Filter & Search Logic
  const filteredRequests = requests.filter((req) => {
    const matchesSearch = 
      req.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.designation?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'UNDER_REVIEW') {
      return (req.status === 'UNDER_REVIEW' || req.hasDocument) && !req.isUsed;
    }
    if (statusFilter === 'PENDING') {
      return !req.isUsed && !req.isExpired && req.status !== 'UNDER_REVIEW' && !req.hasDocument;
    }
    if (statusFilter === 'ONBOARDED') {
      return req.isUsed || req.status === 'APPROVED';
    }
    if (statusFilter === 'EXPIRED') {
      return req.isExpired && !req.isUsed;
    }
    return true;
  });

  const underReviewCount = requests.filter(r => (r.status === 'UNDER_REVIEW' || r.hasDocument) && !r.isUsed).length;
  const pendingCount = requests.filter(r => !r.isUsed && !r.isExpired && r.status !== 'UNDER_REVIEW' && !r.hasDocument).length;
  const onboardedCount = requests.filter(r => r.isUsed || r.status === 'APPROVED').length;

  return (
    <Layout>
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <div>
            <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
              <Building2 className="text-primary" size={26} />
              Recruiter Corporate Verification Requests
            </h2>
            <p className="text-muted mb-0">
              Audit corporate recruiter profiles, inspect uploaded company proof, and approve access to dispatch password setup links.
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {underReviewCount > 0 && (
              <Badge bg="primary" className="px-3 py-2 fs-6 rounded-pill d-flex align-items-center gap-1 shadow-sm">
                <ShieldCheck size={16} /> {underReviewCount} Ready for Approval
              </Badge>
            )}
            <Badge bg="warning" text="dark" className="px-3 py-2 fs-6 rounded-pill">
              {pendingCount} Pending Verification
            </Badge>
            <Badge bg="success" className="px-3 py-2 fs-6 rounded-pill">
              {onboardedCount} Approved & Active
            </Badge>
          </div>
        </div>

        {msg && <Alert variant="success" className="py-2 small shadow-sm">{msg}</Alert>}

        {/* Informative Banner */}
        <Alert variant="info" className="py-2 px-3 small border-0 shadow-sm rounded-3 d-flex align-items-center gap-2">
          <Info size={18} className="text-info flex-shrink-0" />
          <span>
            <strong>Zero-Trust Recruiter Verification:</strong> Examine the recruiter's company credentials and click <em>View Proof</em> to inspect their uploaded document. When satisfied, click <strong>Approve & Send Password Link</strong> to grant them recruiter access and email them a master password creation link.
          </span>
        </Alert>
      </div>

      {/* Filter and Search Bar */}
      <Card className="glass-card border-0 shadow-sm rounded-4 mb-4 p-3">
        <Row className="g-2 align-items-center">
          <Col md={5}>
            <InputGroup size="sm">
              <InputGroup.Text className="bg-light border-0">
                <Search size={16} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by recruiter name, email, company, or designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-light"
              />
            </InputGroup>
          </Col>
          <Col md={7} className="text-md-end">
            <div className="d-inline-flex gap-1 flex-wrap">
              <Button
                size="sm"
                variant={statusFilter === 'ALL' ? 'primary' : 'outline-secondary'}
                onClick={() => setStatusFilter('ALL')}
                className="rounded-pill px-3"
              >
                All ({requests.length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'UNDER_REVIEW' ? 'info' : 'outline-secondary'}
                onClick={() => setStatusFilter('UNDER_REVIEW')}
                className="rounded-pill px-3 text-white"
              >
                Ready for Review ({underReviewCount})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'PENDING' ? 'warning' : 'outline-secondary'}
                onClick={() => setStatusFilter('PENDING')}
                className="rounded-pill px-3"
              >
                Pending ({pendingCount})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'ONBOARDED' ? 'success' : 'outline-secondary'}
                onClick={() => setStatusFilter('ONBOARDED')}
                className="rounded-pill px-3"
              >
                Approved ({onboardedCount})
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Requests Table */}
      <Card className="glass-card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="table-responsive">
          <Table hover align="middle" className="mb-0">
            <thead className="table-light">
              <tr>
                <th className="py-3 px-3">Req ID</th>
                <th className="py-3">Hiring Partner & Company</th>
                <th className="py-3">Corporate Contact</th>
                <th className="py-3 text-center">Verification Status</th>
                <th className="py-3 text-center">OTP & Proof</th>
                <th className="py-3">Date</th>
                <th className="py-3 text-end px-3">Review & Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <div className="small text-muted mt-2">Loading recruiter verification requests...</div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    No recruiter access requests found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isApproved = req.isUsed || req.status === 'APPROVED';
                  const isReadyForReview = !isApproved && (req.status === 'UNDER_REVIEW' || req.hasDocument);

                  return (
                    <tr key={req.id} className={isReadyForReview ? 'bg-info-subtle bg-opacity-25' : ''}>
                      <td className="px-3">
                        <Badge bg="light" className="text-dark border font-monospace px-2 py-1">
                          #REQ-{req.id}
                        </Badge>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{req.name}</div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="text-primary fw-semibold">{req.companyName}</span>
                          {req.companyWebsite && (
                            <a
                              href={req.companyWebsite.startsWith('http') ? req.companyWebsite : `https://${req.companyWebsite}`}
                              target="_blank"
                              rel="noreferrer"
                              className="small text-info text-decoration-none d-inline-flex align-items-center gap-1"
                              title="Visit Company Website"
                            >
                              <Globe size={11} />
                              <span>{req.companyWebsite.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                        {req.designation && (
                          <small className="text-muted d-block">{req.designation}</small>
                        )}
                      </td>
                      <td>
                        <div className="text-dark small d-flex align-items-center gap-1">
                          <Mail size={13} className="text-muted" />
                          <span>{req.email}</span>
                        </div>
                        {req.phone && (
                          <div className="text-muted small d-flex align-items-center gap-1 mt-1">
                            <Phone size={13} className="text-muted" />
                            <span>{req.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        {isApproved ? (
                          <Badge bg="success" className="px-2 py-1">
                            <CheckCircle size={13} className="me-1" /> Approved & Active
                          </Badge>
                        ) : isReadyForReview ? (
                          <Badge bg="primary" className="px-2 py-1 shadow-sm">
                            <ShieldCheck size={13} className="me-1" /> Ready for Review
                          </Badge>
                        ) : req.isExpired ? (
                          <Badge bg="danger" className="px-2 py-1">
                            <AlertCircle size={13} className="me-1" /> Expired
                          </Badge>
                        ) : (
                          <Badge bg="warning" text="dark" className="px-2 py-1">
                            <Clock size={13} className="me-1" /> Pending OTP & Proof
                          </Badge>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="d-inline-flex align-items-center gap-1 bg-light border px-2 py-1 rounded">
                          <span className="font-monospace fw-bold fs-6 text-dark tracking-wider">{req.otp}</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-muted"
                            title="Copy OTP"
                            onClick={() => handleCopyOtp(req.otp, req.id)}
                          >
                            {copiedOtpId === req.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                          </Button>
                        </div>
                        {req.hasDocument && (
                          <div className="mt-1">
                            <a
                              href={`http://localhost:8080/api/admin/recruiter-requests/${req.id}/document`}
                              target="_blank"
                              rel="noreferrer"
                              className="badge bg-white text-primary border text-decoration-none px-2 py-1 d-inline-flex align-items-center gap-1"
                              title="Examine Uploaded Corporate Document"
                            >
                              <FileText size={11} />
                              <span>View Proof ↗</span>
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="small text-muted">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="text-end px-3">
                        <div className="d-inline-flex gap-1 flex-wrap justify-content-end">
                          {/* Approve & Send Password Setup Link Button */}
                          {!isApproved && (
                            <Button
                              variant="success"
                              size="sm"
                              className="rounded-3 d-inline-flex align-items-center gap-1 fw-bold shadow-sm"
                              title="Examine & Approve Recruiter Seat, Emailing Master Password Link"
                              disabled={approveMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Approve recruiter "${req.name}" for "${req.companyName}"?\n\nThis will activate their corporate account and send a secure master password setup link to ${req.email}.`)) {
                                  approveMutation.mutate(req.id);
                                }
                              }}
                            >
                              <CheckCircle size={14} />
                              <span>Approve & Send Password Link</span>
                            </Button>
                          )}

                          {/* Open in Gmail in new tab */}
                          <a
                            href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(req.email)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-danger btn-sm rounded-3 d-inline-flex align-items-center gap-1"
                            title="Open Applicant in Gmail in New Tab"
                          >
                            <Mail size={13} />
                            <span className="small">Gmail</span>
                          </a>

                          {/* Copy Link */}
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="d-inline-flex align-items-center gap-1 rounded-3"
                            title="Copy Onboarding Link"
                            onClick={() => handleCopyLink(req.onboardingLink, req.id)}
                          >
                            {copiedId === req.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                          </Button>

                          {!isApproved && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="rounded-3"
                              title="Resend Invitation Email & OTP"
                              disabled={resendMutation.isPending}
                              onClick={() => resendMutation.mutate(req.id)}
                            >
                              <RefreshCw size={14} className={resendMutation.isPending ? "spin" : ""} />
                            </Button>
                          )}

                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-3"
                            title="Delete Request"
                            onClick={() => {
                              if (window.confirm(`Delete recruiter request for ${req.name} (${req.companyName})?`)) {
                                deleteMutation.mutate(req.id);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </Layout>
  );
};
