import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FileDrop } from '../components/FileDrop';
import { UploadJobForm } from './UploadJobForm';
import { recruiterService } from '../services/recruiterService';
import { Briefcase, Upload, FileText, CheckCircle, ArrowRight } from 'lucide-react';

export const UploadJob = () => {
  const navigate = useNavigate();
  const [key, setKey] = useState('upload');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdJob, setCreatedJob] = useState(null);

  const handleDocumentUpload = async () => {
    if (files.length === 0) {
      setErrorMsg('Please select a Job Description document (PDF or DOCX)');
      return;
    }

    setErrorMsg('');
    setUploading(true);
    try {
      const job = await recruiterService.uploadJobDocument(files[0]);
      setCreatedJob(job);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to parse job description document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-4">
        <h2 className="fw-extrabold text-dark mb-1">Create Job Opening</h2>
        <p className="text-muted mb-0">
          Upload an existing Job Spec document to auto-extract structured requirements, or fill out the form manually.
        </p>
      </div>

      <Card className="border-0 shadow-sm rounded-4 p-4 bg-white">
        <Tabs
          id="job-creation-tabs"
          activeKey={key}
          onSelect={(k) => { setKey(k); setErrorMsg(''); setCreatedJob(null); }}
          className="mb-4"
        >
          <Tab eventKey="upload" title={<span className="d-flex align-items-center gap-2"><Upload size={16} /> AI Document Upload (PDF/DOCX)</span>}>
            {createdJob ? (
              <div className="text-center py-5">
                <div className="d-inline-flex p-3 rounded-circle bg-success-subtle text-success mb-3">
                  <CheckCircle size={40} />
                </div>
                <h4 className="fw-bold mb-2">Job Successfully Created & Structured by AI!</h4>
                <p className="text-muted mb-3" style={{ maxWidth: '500px', margin: 'auto' }}>
                  <strong>{createdJob.title}</strong> is now live. Candidate applications and batch screening will match against these requirements.
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <Button as={Link} to={`/recruiter/upload-resumes`} variant="primary" className="d-flex align-items-center gap-2">
                    <Upload size={18} /> Batch Screen Resumes for this Job
                  </Button>
                  <Button variant="outline-secondary" onClick={() => { setCreatedJob(null); setFiles([]); }}>
                    Create Another Opening
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-2">
                {errorMsg && <Alert variant="danger" className="mb-4">{errorMsg}</Alert>}
                <p className="text-muted small mb-3">
                  Our Multimodal LLM will automatically parse the document, extracting the job title, required technical skills, minimum education, and years of experience.
                </p>

                <FileDrop files={files} setFiles={setFiles} acceptMulti={false} maxFiles={1} />

                <div className="mt-4 text-end">
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={uploading || files.length === 0}
                    onClick={handleDocumentUpload}
                    className="d-inline-flex align-items-center gap-2 px-4"
                  >
                    {uploading ? (
                      <>
                        <Spinner size="sm" animation="border" />
                        <span>AI Parsing Document...</span>
                      </>
                    ) : (
                      <>
                        <span>Extract & Publish Job Opening</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Tab>

          <Tab eventKey="form" title={<span className="d-flex align-items-center gap-2"><FileText size={16} /> Manual Form Entry</span>}>
            <UploadJobForm onJobCreated={(job) => setCreatedJob(job)} />
          </Tab>
        </Tabs>
      </Card>
    </Layout>
  );
};
