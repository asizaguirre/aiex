package com.alexai.platform.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class PublicPageService {

    private final Path databasePath = Paths.get(System.getenv().getOrDefault("PUBLIC_PAGE_DB_PATH", "db/public_pages.json"));
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Map<String, Object>> readPages() {
        File file = databasePath.toFile();
        if (!file.exists()) return new ArrayList<>();
        try {
            return objectMapper.readValue(file, new TypeReference<>() {});
        } catch (IOException exception) {
            return new ArrayList<>();
        }
    }

    public void writePages(List<Map<String, Object>> pages) throws IOException {
        Path parent = databasePath.getParent();
        if (parent != null) Files.createDirectories(parent);
        objectMapper.writeValue(databasePath.toFile(), pages);
    }

    public Map<String, Object> findBySlug(String slug) {
        return readPages().stream()
                .filter(page -> slug.equalsIgnoreCase(String.valueOf(page.get("slug"))))
                .findFirst()
                .orElse(null);
    }
}
