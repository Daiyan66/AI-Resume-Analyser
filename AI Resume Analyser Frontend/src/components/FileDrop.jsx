import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, Button, Badge } from 'react-bootstrap';
import { UploadCloud, File, X, CheckCircle } from 'lucide-react';

export const FileDrop = ({ files = [], setFiles, maxFiles = 50, acceptMulti = true }) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptMulti) {
        setFiles((prev) => [...prev, ...acceptedFiles].slice(0, maxFiles));
      } else {
        setFiles(acceptedFiles.slice(0, 1));
      }
    },
    [acceptMulti, maxFiles, setFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    multiple: acceptMulti
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`dropzone-box text-center p-5 rounded-4 border-2 border-dashed ${
          isDragActive ? 'border-primary bg-primary-subtle' : 'border-secondary-subtle bg-white'
        }`}
        style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
      >
        <input {...getInputProps()} />
        <UploadCloud size={48} className={`mb-3 ${isDragActive ? 'text-primary' : 'text-secondary'}`} />
        <h5 className="fw-bold mb-1">
          {isDragActive ? 'Drop your resumes right here!' : 'Drag & drop resumes here, or click to browse'}
        </h5>
        <p className="text-muted small mb-0">
          Supports <strong>PDF, DOCX, DOC, TXT</strong> files (up to 50MB per file)
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-semibold small text-muted">
              Selected Documents ({files.length} {files.length === 1 ? 'file' : 'files'})
            </span>
            <Button variant="link" size="sm" className="text-danger p-0 text-decoration-none" onClick={() => setFiles([])}>
              Clear All
            </Button>
          </div>

          <div className="d-flex flex-column gap-2" style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {files.map((file, idx) => (
              <Card key={idx} className="border shadow-none rounded-3 px-3 py-2 bg-light-subtle">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2 text-truncate">
                    <File size={18} className="text-primary flex-shrink-0" />
                    <span className="small fw-semibold text-truncate">{file.name}</span>
                    <Badge bg="secondary" className="small">
                      {formatFileSize(file.size)}
                    </Badge>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted p-0 ms-2"
                    onClick={() => removeFile(idx)}
                  >
                    <X size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
