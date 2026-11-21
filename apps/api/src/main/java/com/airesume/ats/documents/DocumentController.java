package com.airesume.ats.documents;

import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {
    private final DocumentService documents;

    public DocumentController(DocumentService documents) {
        this.documents = documents;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentService.Document> upload(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(201).body(documents.upload(file));
    }

    @GetMapping
    public List<DocumentService.Document> mine() {
        return documents.mine();
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{documentId}")
    public ResponseEntity<Void> delete(@PathVariable UUID documentId) {
        documents.delete(documentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}")
    public ResponseEntity<Resource> download(@PathVariable UUID documentId) {
        DocumentService.Download download = documents.download(documentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.metadata().mediaType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(download.metadata().filename()).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(download.resource());
    }
}
