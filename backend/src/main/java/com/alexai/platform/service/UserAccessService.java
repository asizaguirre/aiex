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
public class UserAccessService {

    private final Path databasePath = Paths.get(System.getenv().getOrDefault("USER_DB_PATH", "db/users.json"));
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Map<String, Object>> readUsers() {
        File file = databasePath.toFile();
        if (!file.exists()) return new ArrayList<>();
        try {
            return objectMapper.readValue(file, new TypeReference<>() {});
        } catch (IOException exception) {
            return new ArrayList<>();
        }
    }

    public void writeUsers(List<Map<String, Object>> users) throws IOException {
        Path parent = databasePath.getParent();
        if (parent != null) Files.createDirectories(parent);
        objectMapper.writeValue(databasePath.toFile(), users);
    }

    public boolean isAllowed(String email) {
        if (email == null || email.isBlank()) return false;
        return readUsers().stream().anyMatch(user -> email.equalsIgnoreCase(String.valueOf(user.get("email"))));
    }
}
