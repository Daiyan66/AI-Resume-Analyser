package com.airesume.ats.identity;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class MailFailureHandler {
    @ExceptionHandler(MailException.class)
    public ResponseEntity<Map<String, String>> mailUnavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "Verification email could not be sent. Check that Mailpit is running and the API can reach its SMTP port, then try again."));
    }
}
