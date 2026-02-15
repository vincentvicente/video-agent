package com.vincent.agent.controller;

import com.vincent.agent.model.entity.Document;
import com.vincent.agent.rag.DocumentService;
import com.vincent.agent.rag.RetrievalService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RagController {

    private final DocumentService documentService;
    private final RetrievalService retrievalService;

    @PostMapping("/upload")
    public Document uploadDocument(@RequestParam("file") MultipartFile file) {
        return documentService.ingestDocument(file);
    }

    @GetMapping("/search")
    public Map<String, Object> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "5") int topK) {
        List<String> results = retrievalService.retrieve(query, topK);
        return Map.of("query", query, "results", results);
    }
}
