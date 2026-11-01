import React from 'react';
import { Navbar, Nav, Container, NavDropdown, Badge } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
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
  Sparkles 
} from 'lucide-react';

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ROLE_ADMIN';
  const isRecruiter = userRole === 'ROLE_RECRUITER' || isAdmin;
  const isCandidate = userRole === 'ROLE_CANDIDATE' || (!isAdmin && userRole !== 'ROLE_RECRUITER');

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
                  <Nav.Link as={Link} to="/admin" active={location.pathname === '/admin'} className="d-flex align-items-center text-danger-emphasis">
                    <Users size={18} className="me-1" /> Manage Users
                  </Nav.Link>
                  <Nav.Link as={Link} to="/admin/add-recruiter" active={location.pathname === '/admin/add-recruiter'} className="d-flex align-items-center text-danger-emphasis">
                    <UserPlus size={18} className="me-1" /> Invite Recruiter
                  </Nav.Link>
                </>
              )}
            </Nav>

            {/* User Profile & Logout */}
            <Nav className="align-items-center gap-2">
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
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={logout} className="text-danger d-flex align-items-center">
                    <LogOut size={16} className="me-2" /> Sign Out
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <div className="d-flex gap-2">
                  <Link to="/login" className="btn btn-outline-primary btn-sm">Sign In</Link>
                  <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
                </div>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Main Content Area */}
      <main className="flex-grow-1 position-relative">
        <Container fluid="xl" className="py-4">
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
