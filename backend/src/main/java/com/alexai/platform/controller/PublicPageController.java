package com.alexai.platform.controller;

import com.alexai.platform.service.AdminAuthService;
import com.alexai.platform.service.PublicPageService;
import com.alexai.platform.service.UserAccessService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/api/pages")
@CrossOrigin
public class PublicPageController {

    private final AdminAuthService adminAuthService;
    private final UserAccessService userAccessService;
    private final PublicPageService publicPageService;
    private final Path mediaStorageDir = Paths.get(System.getenv().getOrDefault("PUBLIC_MEDIA_DIR", "db/public_media"));

    public PublicPageController(AdminAuthService adminAuthService, UserAccessService userAccessService, PublicPageService publicPageService) {
        this.adminAuthService = adminAuthService;
        this.userAccessService = userAccessService;
        this.publicPageService = publicPageService;
        try {
            Files.createDirectories(mediaStorageDir);
        } catch (IOException ignored) {}
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

    // ─── UPLOAD DE FOTOS E VÍDEOS ──────────────────────────────────────────
    @PostMapping(path = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadMedia(@RequestParam("file") MultipartFile file,
                                         @RequestParam(value = "email", required = false) String email) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Nenhum arquivo enviado."));
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null) originalName = "media_" + System.currentTimeMillis();
        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String extension = "";
        int dotIdx = safeName.lastIndexOf('.');
        if (dotIdx >= 0) {
            extension = safeName.substring(dotIdx).toLowerCase();
        }

        String mediaType = "image";
        if (extension.matches("\\.(mp4|webm|mov|mkv|ogg)")) {
            mediaType = "video";
        } else if (!extension.matches("\\.(png|jpg|jpeg|webp|gif|svg|bmp)")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Formato não suportado. Envie imagens (JPG, PNG, WEBP, GIF, SVG) ou vídeos (MP4, WEBM)."));
        }

        String uniqueFileName = System.currentTimeMillis() + "_" + safeName;
        try {
            Files.createDirectories(mediaStorageDir);
            Path targetPath = mediaStorageDir.resolve(uniqueFileName);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            String publicUrl = "/api/pages/media/" + uniqueFileName;
            Map<String, Object> result = new HashMap<>();
            result.put("fileName", uniqueFileName);
            result.put("originalName", originalName);
            result.put("url", publicUrl);
            result.put("type", mediaType);
            result.put("size", file.getSize());
            result.put("createdAt", System.currentTimeMillis());
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Falha ao salvar arquivo de mídia: " + e.getMessage()));
        }
    }

    @GetMapping("/media/{fileName}")
    public ResponseEntity<Resource> serveMedia(@PathVariable String fileName) {
        try {
            Path filePath = mediaStorageDir.resolve(fileName).normalize();
            File file = filePath.toFile();
            if (!file.exists() || !file.canRead()) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new FileSystemResource(file);
            String probeType = Files.probeContentType(filePath);
            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            if (probeType != null) {
                mediaType = MediaType.parseMediaType(probeType);
            } else if (fileName.endsWith(".mp4")) {
                mediaType = MediaType.parseMediaType("video/mp4");
            } else if (fileName.endsWith(".webm")) {
                mediaType = MediaType.parseMediaType("video/webm");
            } else if (fileName.endsWith(".webp")) {
                mediaType = MediaType.parseMediaType("image/webp");
            }

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/media")
    public ResponseEntity<?> listMedia() {
        List<Map<String, Object>> mediaList = new ArrayList<>();
        File dir = mediaStorageDir.toFile();
        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                Arrays.sort(files, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
                for (File f : files) {
                    if (f.isFile()) {
                        String name = f.getName();
                        String type = name.matches(".*\\.(mp4|webm|mov|mkv|ogg)$") ? "video" : "image";
                        Map<String, Object> item = new HashMap<>();
                        item.put("fileName", name);
                        item.put("url", "/api/pages/media/" + name);
                        item.put("type", type);
                        item.put("size", f.length());
                        item.put("createdAt", f.lastModified());
                        mediaList.add(item);
                    }
                }
            }
        }
        return ResponseEntity.ok(mediaList);
    }

    private boolean isAuthorized(String email) {
        return adminAuthService.isAdmin(email) || userAccessService.isAllowed(email);
    }

    private boolean isClient(String email) {
        return adminAuthService.isAdmin(email) || userAccessService.isAllowed(email);
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

    public static String renderPage(Map<String, Object> page) {
        String title = escapeHtml(String.valueOf(page.get("title")));
        String formattedContent = formatContent(String.valueOf(page.get("content")));
        
        return "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\"><title>"
                + title + " · AlEx Platform</title><link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin><link href=\"https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Outfit:wght@500;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap\" rel=\"stylesheet\">"
                + "<style>"
                + "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}"
                + "body{font-family:'Plus Jakarta Sans',sans-serif;background-color:#080c14;color:#f8fafc;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:28px 16px;background-image:radial-gradient(circle at 10% 10%,rgba(56,189,248,0.08) 0%,transparent 40%),radial-gradient(circle at 90% 90%,rgba(192,132,252,0.08) 0%,transparent 40%);background-attachment:fixed;line-height:1.6}"
                + "header{width:100%;max-width:880px;display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:24px;background:rgba(13,19,31,0.85);border:1px solid rgba(255,255,255,0.08);border-radius:14px;backdrop-filter:blur(14px)}"
                + ".logo{display:flex;align-items:center;gap:10px;font-family:'Outfit',sans-serif;font-weight:800;font-size:1.15rem;color:#fff}"
                + ".orb{width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#38bdf8,#c084fc);box-shadow:0 0 12px rgba(56,189,248,0.5)}"
                + ".badge{font-family:'Fira Code',monospace;font-size:0.72rem;padding:3px 10px;border-radius:9999px;background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-weight:600}"
                + "main{width:100%;max-width:880px;background:rgba(22,31,48,0.75);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:40px;backdrop-filter:blur(16px);box-shadow:0 20px 50px rgba(0,0,0,0.55)}"
                + "h1{font-family:'Outfit',sans-serif;font-size:clamp(1.9rem,4.5vw,2.6rem);font-weight:800;letter-spacing:-0.03em;line-height:1.2;margin-bottom:22px;background:linear-gradient(135deg,#ffffff 30%,#38bdf8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}"
                + "h2{font-family:'Outfit',sans-serif;font-size:clamp(1.35rem,3.2vw,1.75rem);font-weight:700;color:#38bdf8;margin:28px 0 12px 0;letter-spacing:-0.01em;}"
                + "h3{font-size:1.2rem;font-weight:700;color:#c084fc;margin:20px 0 10px 0;}"
                + "p{margin-bottom:16px;color:#cbd5e1;font-size:1.04rem;line-height:1.8;}"
                + "ul{margin:12px 0 20px 24px;color:#cbd5e1;}"
                + "li{margin-bottom:8px;line-height:1.6;}"
                + "blockquote{border-left:4px solid #38bdf8;padding:12px 18px;background:rgba(56,189,248,0.06);border-radius:0 10px 10px 0;margin:18px 0;color:#e2e8f0;font-style:italic}"
                + "hr{border:none;border-top:1px solid rgba(255,255,255,0.1);margin:28px 0}"
                + ".page-media-box{margin:22px 0;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.3);box-shadow:0 12px 30px rgba(0,0,0,0.4)}"
                + ".page-img{width:100%;height:auto;display:block;border-radius:14px;object-fit:cover;max-height:550px}"
                + ".page-video{width:100%;display:block;border-radius:14px;max-height:500px;background:#000}"
                + ".video-responsive{position:relative;padding-bottom:56.25%;height:0;overflow:hidden}"
                + ".video-responsive iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:14px}"
                + ".btn-cta{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:15px 32px;background:linear-gradient(135deg,#38bdf8,#0284c7);color:#ffffff;font-weight:800;font-size:1.08rem;border-radius:12px;text-decoration:none;box-shadow:0 6px 20px rgba(56,189,248,0.35);transition:all 0.25s ease;margin:8px 0}"
                + ".btn-cta:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(56,189,248,0.5);filter:brightness(1.1)}"
                + ".btn-whatsapp{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:15px 32px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;font-weight:800;font-size:1.08rem;border-radius:12px;text-decoration:none;box-shadow:0 6px 20px rgba(34,197,94,0.35);transition:all 0.25s ease;margin:8px 0}"
                + ".btn-whatsapp:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(34,197,94,0.5);filter:brightness(1.1)}"
                + ".page-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:22px;margin:18px 0;transition:transform 0.2s,border-color 0.2s}"
                + ".page-card:hover{border-color:rgba(56,189,248,0.3);transform:translateY(-2px)}"
                + ".page-link{color:#38bdf8;font-weight:600;text-decoration:underline;}"
                + ".footer-actions{display:flex;align-items:center;justify-content:space-between;padding-top:28px;margin-top:32px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.85rem;color:#94a3b8}"
                + ".btn-copy{padding:9px 16px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;font-weight:600;border-radius:10px;cursor:pointer;transition:all 0.2s;font-size:0.85rem}"
                + ".btn-copy:hover{background:#38bdf8;color:#000}"
                + "@media(max-width:600px){main{padding:22px} header{padding:12px 14px} .btn-cta, .btn-whatsapp{width:100%}}"
                + "</style></head><body>"
                + "<header><div class=\"logo\"><div class=\"orb\"></div>AlEx Platform</div><span class=\"badge\">Página Pública</span></header>"
                + "<main><h1>" + title + "</h1><div class=\"content-box\">" + formattedContent + "</div>"
                + "<div class=\"footer-actions\"><span>Publicado com AlEx Platform v2</span><button class=\"btn-copy\" onclick=\"navigator.clipboard.writeText(window.location.href);this.textContent='Link Copiado!';setTimeout(()=>this.textContent='Copiar Link',2000)\">Copiar Link</button></div>"
                + "</main></body></html>";
    }

    public static String formatContent(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String text = escapeHtml(raw);

        // Images: ![alt](url)
        text = text.replaceAll("!\\[(.*?)\\]\\((.*?)\\)", "<div class=\"page-media-box\"><img src=\"$2\" alt=\"$1\" class=\"page-img\" loading=\"lazy\" /></div>");

        // Videos: [video:legenda](url) or [video](url)
        text = text.replaceAll("\\[video(?::(.*?))?\\]\\((.*?)\\)", "<div class=\"page-media-box\"><video controls class=\"page-video\" playsinline preload=\"metadata\"><source src=\"$2\" />Seu navegador não suporta reprodução de vídeo.</video></div>");

        // YouTube Embed: [youtube](url)
        text = text.replaceAll("\\[youtube\\]\\(https?://(?:www\\.)?(?:youtube\\.com/watch\\?v=|youtu\\.be/)([a-zA-Z0-9_-]+).*?\\)", "<div class=\"page-media-box video-responsive\"><iframe src=\"https://www.youtube.com/embed/$1\" allowfullscreen></iframe></div>");

        // WhatsApp Direct Button: [whatsapp:5511999999999?text=ola](Falar no WhatsApp)
        text = text.replaceAll("\\[whatsapp:([^\\]]+)\\]\\((.*?)\\)", "<div style=\"margin:20px 0;\"><a href=\"https://wa.me/$1\" target=\"_blank\" rel=\"noopener\" class=\"btn-whatsapp\">💬 $2 ↗</a></div>");

        // Button CTA: [button:TEXTO](URL)
        text = text.replaceAll("\\[button:(.*?)\\]\\((.*?)\\)", "<div style=\"margin:20px 0;\"><a href=\"$2\" target=\"_blank\" rel=\"noopener\" class=\"btn-cta\">$1 ↗</a></div>");

        // Generic Markdown links: [TEXTO](URL)
        text = text.replaceAll("\\[(.*?)\\]\\((.*?)\\)", "<a href=\"$2\" target=\"_blank\" rel=\"noopener\" class=\"page-link\">$1</a>");

        // Headers
        text = text.replaceAll("(?m)^### (.*)$", "<h3>$1</h3>");
        text = text.replaceAll("(?m)^## (.*)$", "<h2>$1</h2>");
        text = text.replaceAll("(?m)^# (.*)$", "<h1>$1</h1>");

        // Bold & Italic
        text = text.replaceAll("\\*\\*(.*?)\\*\\*", "<strong>$1</strong>");
        text = text.replaceAll("\\*(.*?)\\*", "<em>$1</em>");

        // Horizontal Rules
        text = text.replaceAll("(?m)^---+$", "<hr>");

        // Blockquotes
        text = text.replaceAll("(?m)^> (.*)$", "<blockquote>$1</blockquote>");

        // Lists
        text = text.replaceAll("(?m)^\\s*-\\s+(.*)$", "<li>$1</li>");
        text = text.replaceAll("(<li>.*</li>)", "<ul>$1</ul>");
        text = text.replaceAll("</ul>\\s*<ul>", "");

        // Paragraphs
        String[] parts = text.split("\n\n");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) continue;
            if (trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<div") || trimmed.startsWith("<blockquote") || trimmed.startsWith("<hr")) {
                sb.append(trimmed);
            } else {
                sb.append("<p>").append(trimmed.replace("\n", "<br>")).append("</p>");
            }
        }
        return sb.toString();
    }

    public static String escapeHtml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#039;");
    }
}
