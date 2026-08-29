package com.alexai.platform.controller;

import com.alexai.platform.service.AdminAuthService;
import com.alexai.platform.service.UserAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class AdminController {

    private final AdminAuthService adminAuthService;
    private final UserAccessService userAccessService;

    public AdminController(AdminAuthService adminAuthService, UserAccessService userAccessService) {
        this.adminAuthService = adminAuthService;
        this.userAccessService = userAccessService;
    }

    @GetMapping("/auth/config")
    public Map<String, Object> getAuthConfig() {
        String clientId = System.getenv().getOrDefault("GOOGLE_CLIENT_ID", "800464070591-33nvvitct598mb53dccehl15q8cjm4m9.apps.googleusercontent.com");
        return Map.of(
            "googleClientId", clientId,
            "platformVersion", "2.0.0",
            "authMode", "GOOGLE_AND_DIRECT"
        );
    }

    @PostMapping("/access/verify")
    public Map<String, Object> verifyAccess(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        String name = body.getOrDefault("name", "").trim();
        boolean admin = adminAuthService.isAdmin(email);
        boolean allowed = admin || userAccessService.isAllowed(email);

        // If not authorized and not admin, automatically register an access request
        boolean requestCreated = false;
        if (!allowed && !email.isBlank() && email.contains("@")) {
            requestCreated = userAccessService.addAccessRequest(email, name);
        }

        return Map.of(
            "authorized", allowed,
            "admin", admin,
            "email", email,
            "name", name.isBlank() ? email : name,
            "requestRegistered", requestCreated || !allowed
        );
    }

    @PostMapping("/access/request")
    public ResponseEntity<?> requestAccess(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        String name = body.getOrDefault("name", "").trim();
        if (email.isBlank() || !email.contains("@")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Informe um e-mail válido."));
        }
        boolean created = userAccessService.addAccessRequest(email, name);
        return ResponseEntity.ok(Map.of("registered", created, "message", "Pedido de acesso registrado com sucesso."));
    }

    @GetMapping("/admin/users")
    public ResponseEntity<?> listUsers(@RequestParam String adminEmail) {
        if (!adminAuthService.isAdmin(adminEmail)) return denied();
        return ResponseEntity.ok(userAccessService.readUsers());
    }

    @PostMapping("/admin/users")
    public ResponseEntity<?> addUser(@RequestParam String adminEmail, @RequestBody Map<String, String> body) {
        if (!adminAuthService.isAdmin(adminEmail)) return denied();
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        String name = body.getOrDefault("name", "").trim();
        if (email.isBlank() || !email.contains("@")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Informe um e-mail válido."));
        }

        List<Map<String, Object>> users = userAccessService.readUsers();
        boolean alreadyExists = users.stream().anyMatch(user -> email.equalsIgnoreCase(String.valueOf(user.get("email"))));
        if (alreadyExists) return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Este usuário já está cadastrado."));

        Map<String, Object> user = new HashMap<>();
        user.put("id", String.valueOf(System.currentTimeMillis()));
        user.put("email", email);
        user.put("name", name.isBlank() ? email : name);
        user.put("createdAt", System.currentTimeMillis());
        users.add(user);
        try {
            userAccessService.writeUsers(users);
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Não foi possível salvar o usuário."));
        }
    }

    @DeleteMapping("/admin/users/{id}")
    public ResponseEntity<?> removeUser(@PathVariable String id, @RequestParam String adminEmail) {
        if (!adminAuthService.isAdmin(adminEmail)) return denied();
        List<Map<String, Object>> users = userAccessService.readUsers();
        if (!users.removeIf(user -> id.equals(String.valueOf(user.get("id"))))) {
            return ResponseEntity.notFound().build();
        }
        try {
            userAccessService.writeUsers(users);
            return ResponseEntity.noContent().build();
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Não foi possível remover o usuário."));
        }
    }

    @GetMapping("/admin/requests")
    public ResponseEntity<?> listRequests(@RequestParam String adminEmail) {
        if (!adminAuthService.isAdmin(adminEmail)) return denied();
        return ResponseEntity.ok(userAccessService.readRequests());
    }

    @PostMapping("/admin/requests/{id}/approve")
    public ResponseEntity<?> approveRequest(@PathVariable String id, @RequestParam String adminEmail) {
        if (!adminAuthService.isAdmin(adminEmail)) return denied();
        try {
            Map<String, Object> user = userAccessService.approveRequest(id);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(user);
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erro ao aprovar pedido de acesso."));
        }
    }

    @PostMapping("/admin/requests/{id}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable String id, @RequestParam String adminEmail) {
        if (!adminAuthService.isAdmin(adminEmail)) return denied();
        try {
            boolean removed = userAccessService.rejectRequest(id);
            if (!removed) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.noContent().build();
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erro ao recusar pedido de acesso."));
        }
    }

    @DeleteMapping("/admin/requests/{id}")
    public ResponseEntity<?> deleteRequest(@PathVariable String id, @RequestParam String adminEmail) {
        return rejectRequest(id, adminEmail);
    }

    private ResponseEntity<Map<String, String>> denied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Apenas administradores podem gerenciar usuários e pedidos de acesso."));
    }
}
