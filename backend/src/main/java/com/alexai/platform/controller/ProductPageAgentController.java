package com.alexai.platform.controller;

import com.alexai.platform.cqrs.PageCommandService;
import com.alexai.platform.cqrs.PageQueryService;
import com.alexai.platform.service.ProductPageAgentService;
import com.alexai.platform.service.UserAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoints do AGENTE CONSTRUTOR DE PÁGINAS + consultas CQRS.
 *
 * POST /api/agent/pages/chat  → instrução em linguagem natural (IA cria/edita/remove/lista/busca)
 * GET  /api/agent/pages       → lista páginas (lado de LEITURA do CQRS)
 * GET  /api/agent/pages/search?q= → busca textual (Elasticsearch)
 * POST /api/agent/pages/rebuild → ressincroniza a projeção de leitura
 */
@RestController
@RequestMapping("/api/agent/pages")
@CrossOrigin
public class ProductPageAgentController {

    private final ProductPageAgentService agentService;
    private final PageQueryService pageQueryService;
    private final PageCommandService pageCommandService;
    private final UserAccessService userAccessService;
    private final com.alexai.platform.service.AdminAuthService adminAuthService;

    public ProductPageAgentController(ProductPageAgentService agentService,
                                      PageQueryService pageQueryService,
                                      PageCommandService pageCommandService,
                                      UserAccessService userAccessService,
                                      com.alexai.platform.service.AdminAuthService adminAuthService) {
        this.agentService = agentService;
        this.pageQueryService = pageQueryService;
        this.pageCommandService = pageCommandService;
        this.userAccessService = userAccessService;
        this.adminAuthService = adminAuthService;
    }

    /** Instrução em linguagem natural para o agente de páginas. */
    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        String instruction = body.getOrDefault("instruction", body.getOrDefault("message", "")).trim();
        if (email.isEmpty() || !isAuthorized(email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Autentique-se para usar o agente de páginas."));
        }
        if (instruction.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Envie uma instrução para a IA."));
        }
        return ResponseEntity.ok(agentService.handleInstruction(email, instruction));
    }

    /** Lista páginas do usuário (lado de leitura). */
    @GetMapping
    public ResponseEntity<?> list(@RequestParam String email) {
        if (!isAuthorized(email)) return denied();
        return ResponseEntity.ok(pageQueryService.listByOwner(email.trim().toLowerCase(), adminAuthService.isAdmin(email)));
    }

    /** Busca textual nas páginas (Elasticsearch). */
    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String email, @RequestParam String q) {
        if (!isAuthorized(email)) return denied();
        return ResponseEntity.ok(pageQueryService.search(q, email.trim().toLowerCase(), adminAuthService.isAdmin(email)));
    }

    /** Ressincroniza a projeção de leitura (Elasticsearch) a partir da fonte da verdade. */
    @PostMapping("/rebuild")
    public ResponseEntity<?> rebuild(@RequestParam String email) {
        if (!adminAuthService.isAdmin(email)) return denied();
        try {
            int count = pageCommandService.rebuildProjection();
            return ResponseEntity.ok(Map.of("message", "Projeção ressincronizada.", "pages", count));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Falha ao ressincronizar: " + ex.getMessage()));
        }
    }

    private boolean isAuthorized(String email) {
        return adminAuthService.isAdmin(email) || userAccessService.isAllowed(email);
    }

    private ResponseEntity<Map<String, String>> denied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Autentique-se para gerenciar suas páginas."));
    }
}