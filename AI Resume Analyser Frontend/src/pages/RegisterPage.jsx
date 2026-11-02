import React, { useState } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Alert, ProgressBar, Badge, Spinner 
} from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, Lock, Phone, MapPin, GraduationCap, Building2,
  Briefcase, Award, Upload, CheckCircle2, ArrowRight, ArrowLeft,
  Sparkles, FileText, AlertCircle, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../auth/AuthProvider';

const STEPS = [
  { id: 1, title: 'Identity', subtitle: 'Personal credentials' },
  { id: 2, title: 'Education', subtitle: 'Degrees & institutions' },
  { id: 3, title: 'Experience', subtitle: 'Roles & industry track' },
  { id: 4, title: 'Skills', subtitle: 'Tech stack & links' },
  { id: 5, title: 'Resume CV', subtitle: 'AI analysis upload' }
];

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    headline: '',
    educationLevel: 'Bachelors',
    fieldOfStudy: '',
    university: '',
    graduationYear: new Date().getFullYear(),
    yearsExperience: '0-1 years',
    currentCompany: '',
    currentTitle: '',
    skillsSummary: '',
    portfolioUrl: ''
  });

  const [resumeFile, setResumeFile] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
        setError('Please upload a PDF or DOCX file.');
        return;
      }
      setResumeFile(file);
      setError('');
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
          setError('Full name, email, and password are required.');
          return false;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters.');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match.');
          return false;
        }
        return true;
      case 2:
        if (!formData.educationLevel || !formData.fieldOfStudy.trim()) {
          setError('Please provide your degree level and field of study.');
          return false;
        }
        return true;
      case 3:
        if (!formData.yearsExperience) {
          setError('Please select your experience range.');
          return false;
        }
        return true;
      case 4:
        if (!formData.skillsSummary.trim()) {
          setError('Please list at least 3-5 core technical or professional skills.');
          return false;
        }
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setError('');
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(5)) return;

    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      if (resumeFile) {
        payload.append('file', resumeFile);
      }
      const candidatePayload = {
        name: formData.name,
        username: formData.username || formData.email.split('@')[0],
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        location: formData.location,
        headline: formData.headline || `${formData.educationLevel} in ${formData.fieldOfStudy}`,
        educationLevel: formData.educationLevel,
        fieldOfStudy: formData.fieldOfStudy,
        university: formData.university,
        graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
        yearsExperience: formData.yearsExperience,
        currentCompany: formData.currentCompany,
        currentTitle: formData.currentTitle,
        skillsSummary: formData.skillsSummary,
        portfolioUrl: formData.portfolioUrl
      };

      payload.append('data', JSON.stringify(candidatePayload));

      const res = await axios.post('http://localhost:8080/api/auth/register-candidate', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.token) {
        loginWithToken(res.data.user, res.data.token);
        navigate('/candidate/jobs');
      } else {
        navigate('/', { state: { message: 'Candidate account created! Please sign in.' } });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 py-4 py-md-5 d-flex flex-column justify-content-center">
      <Container style={{ maxWidth: '820px' }}>
        {/* Navigation & Header */}
        <div className="text-center mb-4">
          <Link to="/" className="d-inline-flex align-items-center gap-1 text-primary text-decoration-none fw-semibold small mb-2">
            <ArrowLeft size={16} /> Back to Platform Overview
          </Link>
          <div className="d-flex justify-content-center mb-2">
            <Badge bg="primary-subtle" className="text-primary px-3 py-1 rounded-pill small fw-bold d-flex align-items-center gap-1">
              <Sparkles size={14} /> Candidate Onboarding Tunnel
            </Badge>
          </div>
          <h2 className="fw-extrabold text-dark mb-1">Create Your Candidate Profile</h2>
          <p className="text-muted small max-w-lg mx-auto">
            Provide comprehensive resume information across 5 streamlined steps. Our AI Engine matches your profile immediately to active recruiter positions.
          </p>
        </div>

        {/* Stepper Progress Card */}
        <Card className="glass-card border-0 rounded-4 p-3 mb-4 shadow-sm">
          <Row className="text-center g-2 align-items-center">
            {STEPS.map((s) => {
              const isPassed = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              return (
                <Col key={s.id} className="d-flex flex-column align-items-center">
                  <div
                    className={`step-circle ${
                      isPassed ? 'completed' : isCurrent ? 'active' : 'pending'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 size={18} /> : s.id}
                  </div>
                  <span className={`small mt-1 d-none d-sm-block ${isCurrent ? 'fw-bold text-primary' : isPassed ? 'text-dark' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                    {s.title}
                  </span>
                </Col>
              );
            })}
          </Row>
          <ProgressBar 
            now={((currentStep - 1) / 4) * 100} 
            variant="primary" 
            style={{ height: '5px' }} 
            className="mt-3 rounded-pill" 
          />
        </Card>

        {/* Main Step Form Card */}
        <Card className="glass-card border-0 rounded-4 p-4 p-md-5 shadow-lg">
          {error && (
            <Alert variant="danger" className="small py-2 mb-4 d-flex align-items-center gap-2">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* STEP 1: Identity & Credentials */}
            {currentStep === 1 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <User size={20} className="text-primary" /> Step 1: Personal Identity & Credentials
                  </h5>
                  <p className="small text-muted mb-0">These credentials grant access to your candidate portal and job matches.</p>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Full Legal Name *</Form.Label>
                      <Form.Control
                        type="text"
                        required
                        name="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Email Address *</Form.Label>
                      <Form.Control
                        type="email"
                        required
                        name="email"
                        placeholder="john.doe@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Password *</Form.Label>
                      <Form.Control
                        type="password"
                        required
                        name="password"
                        placeholder="Min 6 characters"
                        value={formData.password}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Confirm Password *</Form.Label>
                      <Form.Control
                        type="password"
                        required
                        name="confirmPassword"
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Current Location (City, State/Country)</Form.Label>
                      <Form.Control
                        type="text"
                        name="location"
                        placeholder="San Francisco, CA"
                        value={formData.location}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Professional Headline / Role Target</Form.Label>
                      <Form.Control
                        type="text"
                        name="headline"
                        placeholder="e.g. Full-Stack Engineer | React & Spring Boot Specialist"
                        value={formData.headline}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            )}

            {/* STEP 2: Academic Profile */}
            {currentStep === 2 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <GraduationCap size={20} className="text-primary" /> Step 2: Academic Profile & Degrees
                  </h5>
                  <p className="small text-muted mb-0">Used for the 20% Academic Baseline scoring rubric calculation.</p>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Highest Degree Earned *</Form.Label>
                      <Form.Select
                        name="educationLevel"
                        value={formData.educationLevel}
                        onChange={handleChange}
                        className="form-control-sleek"
                      >
                        <option value="High School">High School / Secondary</option>
                        <option value="Associate">Associate Degree</option>
                        <option value="Bachelors">Bachelor's Degree (B.S. / B.E. / B.A.)</option>
                        <option value="Masters">Master's Degree (M.S. / M.E. / M.B.A.)</option>
                        <option value="Doctorate">Doctorate (Ph.D.)</option>
                        <option value="Bootcamp / Self-Taught">Bootcamp / Self-Taught</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Field of Study / Major *</Form.Label>
                      <Form.Control
                        type="text"
                        required
                        name="fieldOfStudy"
                        placeholder="Computer Science, Software Engineering, etc."
                        value={formData.fieldOfStudy}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">University / Institution</Form.Label>
                      <Form.Control
                        type="text"
                        name="university"
                        placeholder="e.g. Stanford University"
                        value={formData.university}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Graduation Year</Form.Label>
                      <Form.Control
                        type="number"
                        min="1970"
                        max="2032"
                        name="graduationYear"
                        value={formData.graduationYear}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            )}

            {/* STEP 3: Work Experience */}
            {currentStep === 3 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <Briefcase size={20} className="text-primary" /> Step 3: Work Experience & Seniority
                  </h5>
                  <p className="small text-muted mb-0">Used for the 25% Experience Depth scoring rubric calculation.</p>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Total Work Experience *</Form.Label>
                      <Form.Select
                        name="yearsExperience"
                        value={formData.yearsExperience}
                        onChange={handleChange}
                        className="form-control-sleek"
                      >
                        <option value="Fresher / 0 years">Fresher / 0 years</option>
                        <option value="0-1 years">0-1 years</option>
                        <option value="1-3 years">1-3 years</option>
                        <option value="3-5 years">3-5 years</option>
                        <option value="5-8 years">5-8 years</option>
                        <option value="8+ years">8+ years (Senior / Principal)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Current / Most Recent Title</Form.Label>
                      <Form.Control
                        type="text"
                        name="currentTitle"
                        placeholder="e.g. Software Engineer, Junior Dev, Student"
                        value={formData.currentTitle}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Current / Most Recent Company</Form.Label>
                      <Form.Control
                        type="text"
                        name="currentCompany"
                        placeholder="e.g. Acme Corp, Freelance, or University"
                        value={formData.currentCompany}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            )}

            {/* STEP 4: Skills & Portfolio */}
            {currentStep === 4 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <Award size={20} className="text-primary" /> Step 4: Technical Skills & Links
                  </h5>
                  <p className="small text-muted mb-0">Used for the 40% Skills Match and to generate your one-click learning gap roadmaps.</p>
                </div>

                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">
                        Technical Skills & Frameworks (Comma separated) *
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        required
                        name="skillsSummary"
                        placeholder="Java, Spring Boot, React, TypeScript, Python, PostgreSQL, Docker, AWS, Git, REST APIs"
                        value={formData.skillsSummary}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                      <Form.Text className="text-muted small">
                        💡 Be as comprehensive as possible. Missing skills identified during job evaluation will generate direct Google Search learning buttons on your dashboard.
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Portfolio / GitHub / LinkedIn URL</Form.Label>
                      <Form.Control
                        type="url"
                        name="portfolioUrl"
                        placeholder="https://github.com/yourhandle or https://portfolio.dev"
                        value={formData.portfolioUrl}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            )}

            {/* STEP 5: Resume Document */}
            {currentStep === 5 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <FileText size={20} className="text-primary" /> Step 5: Master Resume Upload (PDF / DOCX)
                  </h5>
                  <p className="small text-muted mb-0">
                    Upload your latest CV. The AI engine parses your document immediately to establish your baseline recommendations.
                  </p>
                </div>

                <div className="border rounded-4 p-4 text-center mb-3 bg-light-subtle dropzone-box" style={{ borderStyle: 'dashed' }}>
                  <Upload size={36} className="text-primary mx-auto mb-2" />
                  {resumeFile ? (
                    <div>
                      <div className="fw-bold text-success d-flex align-items-center justify-content-center gap-1">
                        <CheckCircle2 size={18} /> {resumeFile.name}
                      </div>
                      <div className="small text-muted mb-2">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      <Button variant="outline-danger" size="sm" onClick={() => setResumeFile(null)}>
                        Remove & Select Another
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="fw-semibold text-dark mb-1">Select your resume file</div>
                      <div className="small text-muted mb-3">Accepts PDF or DOCX format (Max 10MB)</div>
                      <Form.Control
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        className="w-auto mx-auto small"
                      />
                    </div>
                  )}
                </div>

                <Alert variant="info" className="small py-2 mb-0 d-flex align-items-center gap-2">
                  <Sparkles size={16} className="text-primary flex-shrink-0" />
                  <span>
                    Upon completion, your candidate profile is active. You can browse matched jobs, view skill gaps, and receive real-time recruiter notifications.
                  </span>
                </Alert>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="d-flex justify-content-between align-items-center pt-4 mt-4 border-top">
              {currentStep > 1 ? (
                <Button
                  variant="outline-secondary"
                  onClick={prevStep}
                  className="rounded-3 px-3 d-flex align-items-center gap-1"
                >
                  <ArrowLeft size={16} /> Previous
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <Button
                  variant="primary"
                  onClick={nextStep}
                  className="rounded-3 px-4 fw-semibold d-flex align-items-center gap-1 shadow-sm"
                >
                  <span>Next Step</span>
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button
                  variant="success"
                  type="submit"
                  disabled={loading}
                  className="rounded-3 px-4 fw-bold d-flex align-items-center gap-1 shadow-sm"
                >
                  {loading && <Spinner size="sm" animation="border" className="me-1" />}
                  <span>{loading ? 'Creating Profile...' : 'Complete Registration'}</span>
                  <Sparkles size={16} />
                </Button>
              )}
            </div>
          </Form>

          {/* Footer note for recruiters */}
          <div className="text-center mt-4 pt-3 border-top small text-muted">
            Already have an account?{' '}
            <Link to="/" className="text-primary text-decoration-none fw-bold">
              Sign In on Landing Page
            </Link>
            <span className="mx-2">|</span>
            Enterprise Recruiter?{' '}
            <Link to="/#recruiter-info" className="text-warning-emphasis text-decoration-none fw-semibold">
              Request Recruiter Verification Link
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
};

export default RegisterPage;
