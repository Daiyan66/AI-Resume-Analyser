package com.example.ResumeSystemApplication.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileProcessingService {

    private static final Logger log = LoggerFactory.getLogger(FileProcessingService.class);

    @Value("${file.upload-dir:uploads/resumes}")
    private String uploadDir;

    public String storeFile(MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        String uniqueFileName = UUID.randomUUID().toString() + "_" + (originalFilename != null ? originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_") : "file" + extension);
        Path targetLocation = uploadPath.resolve(uniqueFileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        return targetLocation.toString();
    }

    public String extractTextFromPath(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            return "";
        }
        try {
            Path path = Paths.get(filePath);
            if (!Files.exists(path)) {
                return "";
            }
            String fileName = path.getFileName().toString().toLowerCase();
            if (fileName.endsWith(".pdf")) {
                return extractTextFromPdf(Files.readAllBytes(path));
            } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
                try (InputStream is = Files.newInputStream(path)) {
                    return extractTextFromDocx(is);
                }
            } else {
                return Files.readString(path, StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.error("Failed to extract text from stored path: {}", filePath, e);
            return "";
        }
    }

    public String extractText(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        }

        try {
            if (".pdf".equals(extension)) {
                return extractTextFromPdf(file.getBytes());
            } else if (".docx".equals(extension) || ".doc".equals(extension)) {
                return extractTextFromDocx(file.getInputStream());
            } else if (".txt".equals(extension)) {
                return new String(file.getBytes(), StandardCharsets.UTF_8);
            } else {
                try {
                    return extractTextFromPdf(file.getBytes());
                } catch (Exception e) {
                    return new String(file.getBytes(), StandardCharsets.UTF_8);
                }
            }
        } catch (Exception e) {
            log.error("Failed to extract text from file: {}", originalFilename, e);
            return "";
        }
    }

    public String extractTextFromPdf(byte[] pdfBytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);
            return cleanText(text);
        }
    }

    public String extractTextFromDocx(InputStream inputStream) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(inputStream);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            String text = extractor.getText();
            return cleanText(text);
        }
    }

    public String cleanText(String text) {
        if (text == null) return "";
        return text.replaceAll("[\\r\\n]+", "\n")
                   .replaceAll("[\\t ]+", " ")
                   .trim();
    }
}
