package com.alexai.platform.controller;

import com.alexai.platform.service.AdminAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoint de shutdown da plataforma.
 * Apenas administradores autenticados (verificados por e-mail) podem desligar.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin
public class ShutdownController {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private AdminAuthService adminAuthService;

    /**
     * Verifica se o e-mail informado é administrador.
     * Usado pelo frontend para mostrar/esconder o botão de shutdown.
     */
    @PostMapping("/admin/verify")
    public Map<String, Object> verifyAdmin(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "");
        boolean authorized = adminAuthService.isAdmin(email);
        return Map.of(
                "authorized", authorized,
                "email", email
        );
    }

    /**
     * Desliga a plataforma (graceful shutdown do Spring Boot).
     * Requer que o body contenha um e-mail de administrador válido.
     */
    @PostMapping("/admin/shutdown")
    public Map<String, String> shutdown(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "");

        if (!adminAuthService.isAdmin(email)) {
            return Map.of(
                    "status", "DENIED",
                    "message", "Você não tem permissão para desligar a plataforma."
            );
        }

        // Schedule shutdown after response is sent
        new Thread(() -> {
            try {
                Thread.sleep(1500); // Wait 1.5s for response to be sent
            } catch (InterruptedException ignored) {
            }
            System.out.println("=== SHUTDOWN INICIADO POR ADMIN: " + email + " ===");
            SpringApplication.exit(context, () -> 0);
        }).start();

        return Map.of(
                "status", "SHUTTING_DOWN",
                "message", "AlEx Platform v2 está sendo desligada por " + email + "... Até breve!"
        );
    }
}
