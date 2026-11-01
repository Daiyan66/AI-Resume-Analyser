package com.example.ResumeSystemApplication.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ProgressService {

    private static final Logger log = LoggerFactory.getLogger(ProgressService.class);

    private final Map<Long, List<SseEmitter>> emittersByJob = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(Long jobId) {
        // 10 minutes timeout for large batch resume uploads
        SseEmitter emitter = new SseEmitter(600_000L);

        emittersByJob.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(jobId, emitter));
        emitter.onTimeout(() -> removeEmitter(jobId, emitter));
        emitter.onError((e) -> removeEmitter(jobId, emitter));

        try {
            Map<String, Object> initData = new HashMap<>();
            initData.put("message", "SSE stream connected for job " + jobId);
            initData.put("jobId", jobId);

            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(initData));
        } catch (IOException e) {
            removeEmitter(jobId, emitter);
        }

        return emitter;
    }

    public void sendProgress(Long jobId, int current, int total, String message, Object currentResult) {
        List<SseEmitter> emitters = emittersByJob.get(jobId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("jobId", jobId);
        payload.put("current", current);
        payload.put("total", total);
        payload.put("percentage", total > 0 ? (int) (((double) current / total) * 100) : 0);
        payload.put("message", message != null ? message : "");
        payload.put("candidate", currentResult != null ? currentResult : Collections.emptyMap());

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("PROGRESS")
                        .data(payload));
            } catch (Exception ex) {
                removeEmitter(jobId, emitter);
            }
        }
    }

    public void completeProgress(Long jobId, String finalMessage) {
        List<SseEmitter> emitters = emittersByJob.get(jobId);
        if (emitters == null) return;

        Map<String, Object> completePayload = new HashMap<>();
        completePayload.put("jobId", jobId);
        completePayload.put("message", finalMessage != null ? finalMessage : "All resumes processed successfully");

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("COMPLETED")
                        .data(completePayload));
                emitter.complete();
            } catch (Exception ex) {
                // Ignore error during completion
            }
        }
        emittersByJob.remove(jobId);
    }

    private void removeEmitter(Long jobId, SseEmitter emitter) {
        List<SseEmitter> list = emittersByJob.get(jobId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emittersByJob.remove(jobId);
            }
        }
    }
}
