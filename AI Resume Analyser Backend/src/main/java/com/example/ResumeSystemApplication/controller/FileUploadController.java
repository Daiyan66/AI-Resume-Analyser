package com.example.ResumeSystemApplication.controller;

import com.example.ResumeSystemApplication.exception.ResourceNotFoundException;
import com.example.ResumeSystemApplication.model.Resume;
import com.example.ResumeSystemApplication.repository.ResumeRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private final ResumeRepository resumeRepository;

    public FileUploadController(ResumeRepository resumeRepository) {
        this.resumeRepository = resumeRepository;
    }

    @GetMapping("/resumes/{resumeId}")
    public ResponseEntity<Resource> viewResume(@PathVariable Long resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume record not found with id: " + resumeId));

        Path filePath = Paths.get(resume.getFilePath());
        File file = filePath.toFile();
        if (!file.exists()) {
            throw new ResourceNotFoundException("Resume document file not found on disk");
        }

        Resource resource = new FileSystemResource(file);
        String contentType = "application/octet-stream";
        try {
            String probeType = Files.probeContentType(filePath);
            if (probeType != null) {
                contentType = probeType;
            } else if (resume.getFileName().toLowerCase().endsWith(".pdf")) {
                contentType = "application/pdf";
            } else if (resume.getFileName().toLowerCase().endsWith(".docx")) {
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            }
        } catch (IOException ignored) {}

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resume.getFileName() + "\"")
                .body(resource);
    }
}
