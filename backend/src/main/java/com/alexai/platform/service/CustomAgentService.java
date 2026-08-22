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
public class CustomAgentService {

    private final String DB_PATH = "/IA/workspace/alex-platform-v2/db/custom_agents.json";
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Map<String, Object>> readAgents() {
        File file = new File(DB_PATH);
        if (!file.exists()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(file, new TypeReference<List<Map<String, Object>>>() {});
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }

    public void writeAgents(List<Map<String, Object>> agents) throws IOException {
        Path path = Paths.get(DB_PATH);
        if (!Files.exists(path.getParent())) {
            Files.createDirectories(path.getParent());
        }
        objectMapper.writeValue(path.toFile(), agents);
    }

    public Map<String, Object> getAgentByName(String name) {
        if (name == null || name.isBlank()) return null;
        List<Map<String, Object>> agents = readAgents();
        for (Map<String, Object> agent : agents) {
            if (name.equalsIgnoreCase((String) agent.get("name"))) {
                return agent;
            }
        }
        return null;
    }
}
