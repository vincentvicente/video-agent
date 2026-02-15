package com.vincent.agent.rag;

import com.vincent.agent.mapper.DocumentMapper;
import com.vincent.agent.model.entity.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.parser.apache.pdfbox.ApachePdfBoxDocumentParser;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final EmbeddingStore<TextSegment> embeddingStore;
    private final EmbeddingModel embeddingModel;
    private final DocumentMapper documentMapper;

    public Document ingestDocument(MultipartFile file) {
        // Save document metadata
        Document doc = new Document();
        doc.setFilename(file.getOriginalFilename());
        doc.setFileType(file.getContentType());
        doc.setFileSize(file.getSize());
        doc.setStatus("PROCESSING");
        documentMapper.insert(doc);

        try {
            // Parse document
            dev.langchain4j.data.document.Document langchainDoc;
            if (file.getOriginalFilename() != null && file.getOriginalFilename().endsWith(".pdf")) {
                langchainDoc = new ApachePdfBoxDocumentParser().parse(file.getInputStream());
            } else {
                String content = new String(file.getBytes());
                langchainDoc = dev.langchain4j.data.document.Document.from(content);
            }

            // Split and ingest
            DocumentSplitter splitter = DocumentSplitters.recursive(500, 50);
            EmbeddingStoreIngestor ingestor = EmbeddingStoreIngestor.builder()
                    .documentSplitter(splitter)
                    .embeddingModel(embeddingModel)
                    .embeddingStore(embeddingStore)
                    .build();

            ingestor.ingest(langchainDoc);

            doc.setStatus("COMPLETED");
            doc.setChunkCount(splitter.split(langchainDoc).size());
            documentMapper.updateById(doc);

            log.info("Document ingested: {} ({} chunks)", doc.getFilename(), doc.getChunkCount());
        } catch (Exception e) {
            doc.setStatus("FAILED");
            documentMapper.updateById(doc);
            log.error("Failed to ingest document: {}", doc.getFilename(), e);
            throw new RuntimeException("Document ingestion failed", e);
        }

        return doc;
    }
}
