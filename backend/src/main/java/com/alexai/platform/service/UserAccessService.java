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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class UserAccessService {

    private final Path databasePath = Paths.get(System.getenv().getOrDefault("USER_DB_PATH", "db/users.json"));
    private final Path requestsPath = Paths.get(System.getenv().getOrDefault("ACCESS_REQUESTS_PATH", "db/access_requests.json"));
    private final ObjectMapper objectMapper = new ObjectMapper();

    public synchronized List<Map<String, Object>> readUsers() {
        File file = databasePath.toFile();
        if (!file.exists()) return new ArrayList<>();
        try {
            return objectMapper.readValue(file, new TypeReference<>() {});
        } catch (IOException exception) {
            return new ArrayList<>();
        }
    }

    public synchronized void writeUsers(List<Map<String, Object>> users) throws IOException {
        Path parent = databasePath.getParent();
        if (parent != null) Files.createDirectories(parent);
        objectMapper.writeValue(databasePath.toFile(), users);
    }

    public boolean isAllowed(String email) {
        if (email == null || email.isBlank()) return false;
        return readUsers().stream().anyMatch(user -> email.trim().equalsIgnoreCase(String.valueOf(user.get("email")).trim()));
    }

    public synchronized List<Map<String, Object>> readRequests() {
        File file = requestsPath.toFile();
        if (!file.exists()) return new ArrayList<>();
        try {
            return objectMapper.readValue(file, new TypeReference<>() {});
        } catch (IOException exception) {
            return new ArrayList<>();
        }
    }

    public synchronized void writeRequests(List<Map<String, Object>> requests) throws IOException {
        Path parent = requestsPath.getParent();
        if (parent != null) Files.createDirectories(parent);
        objectMapper.writeValue(requestsPath.toFile(), requests);
    }

    public synchronized boolean addAccessRequest(String email, String name) {
        if (email == null || email.isBlank() || !email.contains("@")) return false;
        String cleanEmail = email.trim().toLowerCase();
        String cleanName = (name == null || name.isBlank()) ? cleanEmail : name.trim();

        // If already allowed as a user, no need to add request
        if (isAllowed(cleanEmail)) return false;

        List<Map<String, Object>> requests = readRequests();
        boolean alreadyPending = requests.stream().anyMatch(req -> cleanEmail.equalsIgnoreCase(String.valueOf(req.get("email"))));
        if (alreadyPending) {
            return false;
        }

        Map<String, Object> newReq = new HashMap<>();
        newReq.put("id", String.valueOf(System.currentTimeMillis()));
        newReq.put("email", cleanEmail);
        newReq.put("name", cleanName);
        newReq.put("createdAt", System.currentTimeMillis());
        newReq.put("status", "PENDING");
        requests.add(newReq);

        try {
            writeRequests(requests);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    public synchronized Map<String, Object> approveRequest(String id) throws IOException {
        List<Map<String, Object>> requests = readRequests();
        Optional<Map<String, Object>> match = requests.stream()
                .filter(req -> id.equals(String.valueOf(req.get("id"))))
                .findFirst();

        if (match.isEmpty()) {
            return null;
        }

        Map<String, Object> req = match.get();
        String email = String.valueOf(req.get("email")).trim().toLowerCase();
        String name = String.valueOf(req.get("name")).trim();

        // Add to users if not already existing
        List<Map<String, Object>> users = readUsers();
        boolean alreadyExists = users.stream().anyMatch(u -> email.equalsIgnoreCase(String.valueOf(u.get("email"))));
        Map<String, Object> newUser = new HashMap<>();
        if (!alreadyExists) {
            newUser.put("id", String.valueOf(System.currentTimeMillis()));
            newUser.put("email", email);
            newUser.put("name", name.isBlank() ? email : name);
            newUser.put("createdAt", System.currentTimeMillis());
            users.add(newUser);
            writeUsers(users);
        } else {
            newUser = users.stream().filter(u -> email.equalsIgnoreCase(String.valueOf(u.get("email")))).findFirst().orElse(req);
        }

        // Remove from requests list
        requests.removeIf(r -> id.equals(String.valueOf(r.get("id"))));
        writeRequests(requests);

        return newUser;
    }

    public synchronized boolean rejectRequest(String id) throws IOException {
        List<Map<String, Object>> requests = readRequests();
        boolean removed = requests.removeIf(r -> id.equals(String.valueOf(r.get("id"))));
        if (removed) {
            writeRequests(requests);
        }
        return removed;
    }
}
