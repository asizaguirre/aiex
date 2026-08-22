package com.alexai.platform.controller;

import com.alexai.platform.service.AdminAuthService;
import com.alexai.platform.service.CustomAgentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/agents/custom")
@CrossOrigin
public class CustomAgentController {

    @Autowired
    private AdminAuthService adminAuthService;
    
    @Autowired
    private CustomAgentService customAgentService;

    @GetMapping
    public List<Map<String, Object>> getCustomAgents() {
        return customAgentService.readAgents();
    }

    @PostMapping
    public Map<String, Object> addCustomAgent(@RequestBody Map<String, Object> agentData) throws IOException {
        List<Map<String, Object>> agents = customAgentService.readAgents();
        
        Map<String, Object> newAgent = new HashMap<>(agentData);
        // Generate a simple ID
        newAgent.put("id", String.valueOf(System.currentTimeMillis()));
        newAgent.put("createdAt", System.currentTimeMillis());

        agents.add(newAgent);
        customAgentService.writeAgents(agents);
        return newAgent;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCustomAgent(@PathVariable String id, @RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "");

        if (!adminAuthService.isAdmin(email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("status", "DENIED", "message", "Apenas administradores podem remover agentes instanciados."));
        }

        List<Map<String, Object>> agents = customAgentService.readAgents();
        boolean removed = agents.removeIf(agent -> id.equals(agent.get("id")));

        if (removed) {
            try {
                customAgentService.writeAgents(agents);
                return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Agente removido com sucesso."));
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("status", "ERROR", "message", "Erro ao salvar a exclusão."));
            }
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "NOT_FOUND", "message", "Agente não encontrado."));
        }
    }
}
