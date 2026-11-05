import React from 'react';
import { Navbar, Nav, Container, NavDropdown, Badge, Dropdown, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { 
  Briefcase, 
  Users, 
  FileText, 
  Upload, 
  BarChart2, 
  UserPlus, 
  LogOut, 
  CheckCircle, 
  Compass, 
  Layers, 
  Sparkles,
  Bell,
  MessageSquare,
  ExternalLink,
  Check,
  Building2,
  ChevronRight
} from 'lucide-react';

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ROLE_ADMIN';
  const isRecruiter = userRole === 'ROLE_RECRUITER';
  const isCandidate = userRole === 'ROLE_CANDIDATE' || (!isAdmin && !isRecruiter);

  // Universal Notifications Query for ALL ROLES (Admin, Recruiter, Candidate)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data || [];
    },
    enabled: !!user,
    refetchInterval: 15000 // Poll notifications every 15s
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markReadMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return <Badge bg="danger" className="ms-2 px-2 py-1">Admin</Badge>;
      case 'ROLE_RECRUITER':
        return <Badge bg="primary" className="ms-2 px-2 py-1">Recruiter</Badge>;
      case 'ROLE_CANDIDATE':
      default:
        return <Badge bg="success" className="ms-2 px-2 py-1">Candidate</Badge>;
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light-subtle">
      {/* Top Glass Navbar */}
      <Navbar expand="lg" className="navbar-glass sticky-top py-2 border-bottom shadow-sm">
        <Container fluid="xl">
          <Navbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center fw-bold fs-5 text-primary">
            <Sparkles className="me-2 text-primary" size={24} />
            <span>Next-Gen <span className="text-gradient">AI ATS</span></span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="main-navbar-nav" />
          <Navbar.Collapse id="main-navbar-nav">
            <Nav className="me-auto mb-2 mb-lg-0 gap-1">
              <Nav.Link as={Link} to="/dashboard" active={location.pathname === '/dashboard'} className="d-flex align-items-center">
                <BarChart2 size={18} className="me-1" /> Dashboard
              </Nav.Link>

              {/* Recruiter Navigation */}
              {isRecruiter && (
                <>
                  <Nav.Link as={Link} to="/recruiter/upload-job" active={location.pathname === '/recruiter/upload-job'} className="d-flex align-items-center">
                    <Briefcase size={18} className="me-1" /> Post Job
                  </Nav.Link>
                  <Nav.Link as={Link} to="/recruiter/upload-resumes" active={location.pathname === '/recruiter/upload-resumes'} className="d-flex align-items-center">
                    <Upload size={18} className="me-1" /> Batch Screen Resumes
                  </Nav.Link>
                  <Nav.Link as={Link} to="/recruiter/candidates" active={location.pathname.startsWith('/recruiter/candidates')} className="d-flex align-items-center">
                    <Users size={18} className="me-1" /> Candidates
                  </Nav.Link>
                  <Nav.Link as={Link} to="/recruiter/analyzed" active={location.pathname.startsWith('/recruiter/analyzed')} className="d-flex align-items-center">
                    <CheckCircle size={18} className="me-1" /> Screening Results
                  </Nav.Link>
                </>
              )}

              {/* Candidate Navigation */}
              {isCandidate && (
                <>
                  <Nav.Link as={Link} to="/candidate/jobs" active={location.pathname === '/candidate/jobs'} className="d-flex align-items-center">
                    <Compass size={18} className="me-1" /> Job Board
                  </Nav.Link>
                  <Nav.Link as={Link} to="/candidate/status" active={location.pathname === '/candidate/status'} className="d-flex align-items-center">
                    <FileText size={18} className="me-1" /> My Applications
                  </Nav.Link>
                  <Nav.Link as={Link} to="/candidate/skill-gap" active={location.pathname.startsWith('/candidate/skill-gap')} className="d-flex align-items-center">
                    <Layers size={18} className="me-1" /> Skill Gap Coaching
                  </Nav.Link>
                </>
              )}

              {/* Admin Navigation */}
              {isAdmin && (
                <>
                  <Nav.Link as={Link} to="/admin/recruiters" active={location.pathname === '/admin/recruiters' || location.pathname === '/admin'} className="d-flex align-items-center">
                    <Briefcase size={18} className="me-1 text-primary" /> Recruiters
                  </Nav.Link>
                  <Nav.Link as={Link} to="/admin/recruiter-requests" active={location.pathname === '/admin/recruiter-requests'} className="d-flex align-items-center">
                    <Building2 size={18} className="me-1 text-warning" /> Recruiter Requests
                  </Nav.Link>
                  <Nav.Link as={Link} to="/admin/candidates" active={location.pathname.startsWith('/admin/candidates')} className="d-flex align-items-center">
                    <Users size={18} className="me-1 text-success" /> Candidates
                  </Nav.Link>
                  <Nav.Link as={Link} to="/admin/add-recruiter" active={location.pathname === '/admin/add-recruiter'} className="d-flex align-items-center">
                    <UserPlus size={18} className="me-1 text-indigo" /> Invite Recruiter
                  </Nav.Link>
                </>
              )}
            </Nav>

            {/* Notification Bell & User Profile */}
            <Nav className="align-items-center gap-3">
              {/* Universal Notifications Bell for ALL Roles */}
              {user && (
                <Dropdown align="end">
                  <Dropdown.Toggle variant="light" className="position-relative border-0 rounded-circle p-2 bg-transparent text-dark shadow-none">
                    <Bell size={20} className={unreadCount > 0 ? "text-primary" : "text-muted"} />
                    {unreadCount > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{ fontSize: '0.65rem' }}>
                        {unreadCount}
                      </span>
                    )}
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="shadow-lg border-0 rounded-4 p-0 dropdown-menu-end" style={{ width: '340px', maxHeight: '420px', overflowY: 'auto' }}>
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light rounded-top-4">
                      <div className="fw-bold text-dark d-flex align-items-center gap-1">
                        <Bell size={16} className="text-primary" /> Notifications
                        <span className="badge bg-light text-muted border ms-1" style={{ fontSize: '0.65rem' }}>Recent</span>
                      </div>
                      {unreadCount > 0 && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 text-decoration-none small text-muted"
                          onClick={() => markAllReadMutation.mutate()}
                        >
                          Mark all as read
                        </Button>
                      )}
                    </div>

                    <div className="list-group list-group-flush">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted small">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.slice(0, 3).map((n) => (
                          <div 
                            key={n.id}
                            className={`list-group-item list-group-item-action p-3 border-bottom ${!n.isRead ? 'bg-primary-subtle' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <span className="fw-bold small text-dark d-flex align-items-center gap-1">
                                {n.type === 'FEEDBACK' ? (
                                  <MessageSquare size={14} className="text-danger" />
                                ) : (
                                  <Briefcase size={14} className="text-primary" />
                                )}
                                {n.title}
                              </span>
                              {!n.isRead && <Badge bg="danger" pill className="p-1" />}
                            </div>
                            <p className="text-secondary small mb-1" style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
                              {n.message}
                            </p>
                            <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.7rem' }}>
                              <span>{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <div className="d-flex align-items-center gap-2">
                                {isAdmin && (n.type === 'RECRUITER_REQUEST' || n.message?.includes('@')) && (
                                  <a
                                    href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(n.message.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || 'recruiter')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="badge bg-danger-subtle text-danger border border-danger-subtle text-decoration-none d-inline-flex align-items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Open in Gmail"
                                  >
                                    <span>Gmail</span>
                                    <ExternalLink size={9} />
                                  </a>
                                )}
                                <span className="text-primary fw-semibold d-flex align-items-center gap-1">
                                  View <ExternalLink size={10} />
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-2 border-top text-center bg-light rounded-bottom-4">
                      <Link to="/notifications" className="small fw-bold text-primary text-decoration-none d-flex align-items-center justify-content-center gap-1">
                        <span>View All Notifications ({notifications.length})</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </Dropdown.Menu>
                </Dropdown>
              )}

              {user ? (
                <NavDropdown
                  title={
                    <span className="d-inline-flex align-items-center">
                      <span className="fw-semibold text-dark">{user.firstName || user.username}</span>
                      {getRoleBadge(user.role)}
                    </span>
                  }
                  id="user-nav-dropdown"
                  align="end"
                >
                  <NavDropdown.ItemText className="text-muted small">
                    Signed in as <strong>{user.username}</strong>
                  </NavDropdown.ItemText>
                  <NavDropdown.Item as={Link} to="/" className="d-flex align-items-center">
                    <Sparkles size={16} className="me-2 text-primary" /> Platform Overview
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={logout} className="text-danger d-flex align-items-center">
                    <LogOut size={16} className="me-2" /> Sign Out
                  </NavDropdown.Item>
                </NavDropdown>
              ) : null}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Main Content Area */}
      <main className="flex-grow-1 position-relative p-0 m-0">
        <Container fluid="xl" className="pt-2 pb-4">
          {children}
        </Container>
      </main>

      {/* Footer */}
      <footer className="py-3 border-top bg-white text-center text-muted small mt-auto">
        <Container>
          <span>Next-Gen AI ATS Platform &copy; 2026. Cloud-Native Multimodal Resume Screening.</span>
        </Container>
      </footer>
    </div>
  );
};
