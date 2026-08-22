package com.alexai.platform.controller;

import com.alexai.platform.service.AdminAuthService;
import com.alexai.platform.service.PublicPageService;
import com.alexai.platform.service.UserAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pages")
@CrossOrigin
public class PublicPageController {

    private final AdminAuthService adminAuthService;
    private final UserAccessService userAccessService;
    private final PublicPageService publicPageService;

    public PublicPageController(AdminAuthService adminAuthService, UserAccessService userAccessService, PublicPageService publicPageService) {
        this.adminAuthService = adminAuthService;
        this.userAccessService = userAccessService;
        this.publicPageService = publicPageService;
    }

    @GetMapping
    public ResponseEntity<?> listPages(@RequestParam String email) {
        if (!isClient(email)) return denied();
        List<Map<String, Object>> pages = publicPageService.readPages().stream()
                .filter(page -> email.equalsIgnoreCase(String.valueOf(page.get("ownerEmail"))) || adminAuthService.isAdmin(email))
                .toList();
        return ResponseEntity.ok(pages);
    }

    @PostMapping
    public ResponseEntity<?> createPage(@RequestParam String email, @RequestBody Map<String, String> body) {
        if (!isClient(email)) return denied();
        String slug = body.getOrDefault("slug", "").trim().toLowerCase();
        String title = body.getOrDefault("title", "").trim();
        String content = body.getOrDefault("content", "").trim();
        if (!slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Use um endpoint com letras minúsculas, números e hífens."));
        }
        if (title.isBlank() || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Informe título e conteúdo da página."));
        }
        if (publicPageService.findBySlug(slug) != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Este endpoint já está em uso."));
        }

        Map<String, Object> page = new HashMap<>();
        page.put("id", String.valueOf(System.currentTimeMillis()));
        page.put("slug", slug);
        page.put("title", title);
        page.put("content", content);
        page.put("ownerEmail", email.trim().toLowerCase());
        page.put("createdAt", System.currentTimeMillis());
        try {
            List<Map<String, Object>> pages = publicPageService.readPages();
            pages.add(page);
            publicPageService.writePages(pages);
            return ResponseEntity.status(HttpStatus.CREATED).body(pageWithUrl(page));
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Não foi possível publicar a página."));
        }
    }

    @GetMapping(value = {"/{slug}", "/public/{slug}"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> publicPage(@PathVariable String slug) {
        List<Map<String, Object>> pages = publicPageService.readPages();
        Map<String, Object> page = pages.stream()
            .filter(item -> slug.equalsIgnoreCase(String.valueOf(item.get("slug"))))
            .findFirst()
            .orElse(null);
        if (page == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(renderPage(page));
    }

    @GetMapping("/data/{slug}")
    public ResponseEntity<?> pageData(@PathVariable String slug, @RequestParam String email) {
        if (!isClient(email)) return denied();
        Map<String, Object> page = publicPageService.findBySlug(slug);
        if (page == null || (!adminAuthService.isAdmin(email) && !email.equalsIgnoreCase(String.valueOf(page.get("ownerEmail"))))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pageWithUrl(page));
    }

    @PutMapping("/{slug}")
    public ResponseEntity<?> updatePage(@PathVariable String slug, @RequestParam String email, @RequestBody Map<String, String> body) {
        if (!isClient(email)) return denied();
        List<Map<String, Object>> pages = publicPageService.readPages();
        Map<String, Object> page = pages.stream()
            .filter(item -> slug.equalsIgnoreCase(String.valueOf(item.get("slug"))))
            .findFirst()
            .orElse(null);
        if (page == null || (!adminAuthService.isAdmin(email) && !email.equalsIgnoreCase(String.valueOf(page.get("ownerEmail"))))) {
            return ResponseEntity.notFound().build();
        }

        String newSlug = body.getOrDefault("slug", "").trim().toLowerCase();
        String title = body.getOrDefault("title", "").trim();
        String content = body.getOrDefault("content", "").trim();
        if (!newSlug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Use um endpoint com letras minúsculas, números e hífens."));
        }
        if (title.isBlank() || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Informe título e conteúdo da página."));
        }
        Map<String, Object> conflictingPage = pages.stream()
            .filter(item -> newSlug.equalsIgnoreCase(String.valueOf(item.get("slug"))))
            .findFirst()
            .orElse(null);
        if (conflictingPage != null && !String.valueOf(page.get("id")).equals(String.valueOf(conflictingPage.get("id")))) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Este endpoint já está em uso."));
        }

        page.put("slug", newSlug);
        page.put("title", title);
        page.put("content", content);
        page.put("updatedAt", System.currentTimeMillis());
        try {
            publicPageService.writePages(pages);
            return ResponseEntity.ok(pageWithUrl(page));
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Não foi possível salvar a edição."));
        }
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<?> deletePage(@PathVariable String slug, @RequestParam String email) {
        if (!isAuthorized(email)) return denied();
        List<Map<String, Object>> pages = publicPageService.readPages();
        Map<String, Object> page = publicPageService.findBySlug(slug);
        if (page == null || (!adminAuthService.isAdmin(email) && !email.equalsIgnoreCase(String.valueOf(page.get("ownerEmail"))))) {
            return ResponseEntity.notFound().build();
        }
        pages.removeIf(item -> slug.equalsIgnoreCase(String.valueOf(item.get("slug"))));
        try {
            publicPageService.writePages(pages);
            return ResponseEntity.noContent().build();
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Não foi possível remover a página."));
        }
    }

    private boolean isAuthorized(String email) {
        return adminAuthService.isAdmin(email) || userAccessService.isAllowed(email);
    }

    private boolean isClient(String email) {
        return userAccessService.isAllowed(email);
    }

    private ResponseEntity<Map<String, String>> denied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Autentique-se para gerenciar suas páginas."));
    }

    private Map<String, Object> pageWithUrl(Map<String, Object> page) {
        Map<String, Object> result = new HashMap<>(page);
        result.put("publicUrl", "/public/" + page.get("slug"));
        return result;
    }

    private String renderPage(Map<String, Object> page) {
        String title = escapeHtml(String.valueOf(page.get("title")));
        String content = escapeHtml(String.valueOf(page.get("content"))).replace("\n", "<br>");
        return "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>"
                + title + "</title><style>body{margin:0;background:#0d1117;color:#e6edf3;font:16px system-ui,sans-serif}main{max-width:760px;margin:12vh auto;padding:32px}h1{font-size:clamp(2rem,5vw,4rem);margin:0 0 24px;color:#58a6ff}p{line-height:1.8;color:#c9d1d9;white-space:normal}</style></head><body><main><h1>"
                + title + "</h1><p>" + content + "</p></main></body></html>";
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#039;");
    }
}
