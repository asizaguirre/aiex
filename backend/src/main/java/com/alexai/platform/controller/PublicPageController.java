package com.alexai.platform.controller;

import com.alexai.platform.client.OllamaClient;
import com.alexai.platform.cqrs.PageCommandService;
import com.alexai.platform.cqrs.PageQueryService;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/pages")
@CrossOrigin
public class PublicPageController {

    private final AdminAuthService adminAuthService;
    private final UserAccessService userAccessService;
    private final PublicPageService publicPageService;
    private final PageCommandService pageCommandService;
    private final PageQueryService pageQueryService;
    private final OllamaClient ollamaClient;
    private final com.alexai.platform.service.CustomAgentService customAgentService;
    private final Path mediaStorageDir = Paths.get(System.getenv().getOrDefault("PUBLIC_MEDIA_DIR", "db/public_media"));

    public PublicPageController(AdminAuthService adminAuthService, UserAccessService userAccessService, PublicPageService publicPageService,
                                PageCommandService pageCommandService, PageQueryService pageQueryService,
                                OllamaClient ollamaClient,
                                com.alexai.platform.service.CustomAgentService customAgentService) {
        this.adminAuthService = adminAuthService;
        this.userAccessService = userAccessService;
        this.publicPageService = publicPageService;
        this.pageCommandService = pageCommandService;
        this.pageQueryService = pageQueryService;
        this.ollamaClient = ollamaClient;
        this.customAgentService = customAgentService;
        try {
            Files.createDirectories(mediaStorageDir);
        } catch (IOException ignored) {}
    }

    @GetMapping
    public ResponseEntity<?> listPages(@RequestParam String email) {
        if (!isClient(email)) return denied();
        // LADO DE LEITURA do CQRS: consulta via Elasticsearch (com fallback)
        List<Map<String, Object>> pages = pageQueryService.listByOwner(email.trim().toLowerCase(), adminAuthService.isAdmin(email));
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
        try {
            // LADO DE ESCRITA do CQRS: persiste na fonte da verdade e publica evento para a projeção
            Map<String, Object> page = pageCommandService.createPage(slug, title, content, email.trim().toLowerCase());
            return ResponseEntity.status(HttpStatus.CREATED).body(pageWithUrl(page));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", exception.getMessage()));
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Não foi possível publicar a página."));
        }
    }

    @GetMapping(value = {"/{slug}", "/public/{slug}"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> publicPage(@PathVariable String slug) {
        // LADO DE LEITURA do CQRS
        Map<String, Object> page = pageQueryService.findBySlug(slug);
        if (page == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(renderPage(page));
    }

    @GetMapping("/data/{slug}")
    public ResponseEntity<?> pageData(@PathVariable String slug, @RequestParam String email) {
        if (!isClient(email)) return denied();
        Map<String, Object> page = pageQueryService.findBySlug(slug);
        if (page == null || (!adminAuthService.isAdmin(email) && !email.equalsIgnoreCase(String.valueOf(page.get("ownerEmail"))))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pageWithUrl(page));
    }

    @PostMapping("/{slug}/chat")
    public ResponseEntity<?> pageChat(@PathVariable String slug, @RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "").trim();
        if (message.isBlank() || message.length() > 1000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Envie uma pergunta de até 1000 caracteres."));
        }
        Map<String, Object> page = pageQueryService.findBySlug(slug);
        if (page == null) return ResponseEntity.notFound().build();
        String context = String.valueOf(page.getOrDefault("content", ""));
        String agentContext = "";
        Matcher agentMatcher = Pattern.compile("\\[chatbot:(.*?)\\]", Pattern.CASE_INSENSITIVE).matcher(context);
        if (agentMatcher.find()) {
            Map<String, Object> agent = customAgentService.getAgentByNameAndOwner(
                agentMatcher.group(1).trim(), String.valueOf(page.getOrDefault("ownerEmail", "")));
            if (agent != null) {
            agentContext = "\n\nCONFIGURAÇÃO DO AGENTE DO CLIENTE:\nNome: "
                + agent.getOrDefault("name", "") + "\nObjetivo: "
                + agent.getOrDefault("role", agent.getOrDefault("description", ""));
            }
        }
        String prompt = "Você é o assistente comercial da página pública '" + page.get("title") + "'. "
                + "Responda somente com base no conteúdo abaixo. Se a informação não existir, diga que não sabe e convide o visitante a entrar em contato. "
                + "Seja breve, cordial e não invente preços, prazos ou políticas.\n\n"
                + "CONTEÚDO DA PÁGINA:\n" + context.substring(0, Math.min(context.length(), 12000)) + agentContext
                + "\n\nPERGUNTA DO VISITANTE:\n" + message;
        return ResponseEntity.ok(Map.of("reply", ollamaClient.generate(prompt)));
    }

    @PutMapping("/{slug}")
    public ResponseEntity<?> updatePage(@PathVariable String slug, @RequestParam String email, @RequestBody Map<String, String> body) {
        if (!isClient(email)) return denied();
        String newSlug = body.getOrDefault("slug", "").trim().toLowerCase();
        String title = body.getOrDefault("title", "").trim();
        String content = body.getOrDefault("content", "").trim();
        if (!newSlug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Use um endpoint com letras minúsculas, números e hífens."));
        }
        if (title.isBlank() || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Informe título e conteúdo da página."));
        }
        try {
            // LADO DE ESCRITA do CQRS
            Map<String, Object> page = pageCommandService.updatePage(slug, newSlug, title, content,
                    email.trim().toLowerCase(), adminAuthService.isAdmin(email));
            return ResponseEntity.ok(pageWithUrl(page));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", exception.getMessage()));
        } catch (SecurityException exception) {
            return ResponseEntity.notFound().build();
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Não foi possível salvar a edição."));
        }
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<?> deletePage(@PathVariable String slug, @RequestParam String email) {
        if (!isAuthorized(email)) return denied();
        try {
            // LADO DE ESCRITA do CQRS
            pageCommandService.deletePage(slug, email.trim().toLowerCase(), adminAuthService.isAdmin(email));
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException exception) {
            return ResponseEntity.notFound().build();
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
        String slug = escapeHtml(String.valueOf(page.get("slug")));
        String formattedContent = formatContent(String.valueOf(page.get("content")), slug);
        
        return "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\"><title>"
                + title + " · AlEx Platform</title><link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin><link href=\"https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap\" rel=\"stylesheet\">"
                + "<style>"
                + "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}"
                + "body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Plus Jakarta Sans',sans-serif;background-color:#f5f5f7;color:#1d1d1f;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 16px;background-image:radial-gradient(circle at 10% 10%,rgba(0,113,227,0.04) 0%,transparent 40%),radial-gradient(circle at 90% 90%,rgba(88,86,214,0.04) 0%,transparent 40%);background-attachment:fixed;line-height:1.6;-webkit-font-smoothing:antialiased;}"
                + "header{width:100%;max-width:900px;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;margin-bottom:20px;background:rgba(255,255,255,0.85);border:1px solid rgba(0,0,0,0.07);border-radius:16px;backdrop-filter:blur(24px);box-shadow:0 1px 3px rgba(0,0,0,0.04);}"
                + ".logo{display:flex;align-items:center;gap:10px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;font-weight:700;font-size:1.15rem;color:#1d1d1f;letter-spacing:-0.02em;}"
                + ".orb{width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#0071e3,#5856d6);box-shadow:0 0 10px rgba(0,113,227,0.4)}"
                + ".badge{font-family:'Fira Code',monospace;font-size:0.72rem;padding:3px 10px;border-radius:9999px;background:rgba(0,113,227,0.08);color:#0071e3;border:1px solid rgba(0,113,227,0.2);font-weight:600}"
                + "main{width:100%;max-width:900px;background:rgba(255,255,255,0.92);border:1px solid rgba(0,0,0,0.08);border-radius:22px;padding:44px 36px;backdrop-filter:blur(24px);box-shadow:0 16px 40px -10px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.03);}"
                + "h1{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;font-size:clamp(1.9rem,4.5vw,2.6rem);font-weight:800;letter-spacing:-0.03em;line-height:1.2;margin-bottom:20px;color:#1d1d1f;}"
                + "h2{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;font-size:clamp(1.35rem,3.2vw,1.75rem);font-weight:700;color:#0071e3;margin:28px 0 12px 0;letter-spacing:-0.02em;}"
                + "h3{font-size:1.2rem;font-weight:700;color:#5856d6;margin:20px 0 10px 0;letter-spacing:-0.01em;}"
                + "p{margin-bottom:16px;color:#515154;font-size:1.02rem;line-height:1.75;}"
                + "ul{margin:12px 0 20px 24px;color:#515154;}"
                + "li{margin-bottom:8px;line-height:1.6;}"
                + "blockquote{border-left:4px solid #0071e3;padding:12px 18px;background:rgba(0,113,227,0.04);border-radius:0 10px 10px 0;margin:18px 0;color:#1d1d1f;font-style:italic}"
                + "hr{border:none;border-top:1px solid rgba(0,0,0,0.08);margin:28px 0}"
                + ".page-media-box{margin:22px 0;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);background:#fbfbfd;box-shadow:0 4px 16px rgba(0,0,0,0.05);}"
                + ".page-img{width:100%;height:auto;display:block;border-radius:16px;object-fit:cover;max-height:550px}"
                + ".page-video{width:100%;display:block;border-radius:16px;max-height:500px;background:#000}"
                + ".video-responsive{position:relative;padding-bottom:56.25%;height:0;overflow:hidden}"
                + ".video-responsive iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:16px}"
                + ".btn-cta{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:14px 28px;background:#0071e3;color:#ffffff;font-weight:700;font-size:1.02rem;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(0,113,227,0.3);transition:all 0.2s cubic-bezier(0.16,1,0.3,1);margin:8px 0}"
                + ".btn-cta:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,113,227,0.4);filter:brightness(1.06)}"
                + ".btn-whatsapp{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:14px 28px;background:#25D366;color:#ffffff;font-weight:700;font-size:1.02rem;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(37,211,102,0.3);transition:all 0.2s cubic-bezier(0.16,1,0.3,1);margin:8px 0}"
                + ".btn-whatsapp:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(37,211,102,0.4);filter:brightness(1.06)}"
                + ".page-card{background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.07);border-radius:14px;padding:22px;margin:18px 0;transition:transform 0.2s,border-color 0.2s}"
                + ".page-card:hover{border-color:rgba(0,113,227,0.3);transform:translateY(-2px)}"
                + ".page-link{color:#0071e3;font-weight:600;text-decoration:underline;}"
                + ".pricing-table{width:100%;border-collapse:collapse;margin:24px 0;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;overflow:hidden}.pricing-table th,.pricing-table td{text-align:left;padding:14px;border-bottom:1px solid rgba(0,0,0,.07)}.pricing-table th{background:#f0f6ff;color:#0071e3;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}.pricing-table tr:last-child td{border-bottom:0}.page-chatbot{margin:28px 0;padding:18px;border:1px solid rgba(0,113,227,.2);border-radius:16px;background:#f7fbff}.page-chatbot strong{display:block;color:#0071e3;margin-bottom:6px}.page-chatbot p{font-size:.9rem;margin:0 0 12px}.page-chatbot form{display:flex;gap:8px}.page-chatbot input{flex:1;padding:11px;border:1px solid #cbd8e8;border-radius:10px}.page-chatbot button{border:0;border-radius:10px;padding:11px 16px;background:#0071e3;color:#fff;font-weight:700;cursor:pointer}.chatbot-reply{margin-top:12px;padding:10px 12px;border-radius:10px;background:#fff;color:#515154;font-size:.9rem;white-space:pre-wrap}"
                + ".footer-actions{display:flex;align-items:center;justify-content:space-between;padding-top:24px;margin-top:32px;border-top:1px solid rgba(0,0,0,0.08);font-size:0.85rem;color:#86868b}"
                + ".btn-copy{padding:8px 16px;background:rgba(0,113,227,0.08);border:1px solid rgba(0,113,227,0.2);color:#0071e3;font-weight:600;border-radius:10px;cursor:pointer;transition:all 0.2s;font-size:0.85rem}"
                + ".btn-copy:hover{background:#0071e3;color:#ffffff;}"
                + "@media(max-width:600px){main{padding:22px} header{padding:12px 14px} .btn-cta, .btn-whatsapp{width:100%}}"
                + "</style></head><body>"
                + "<header><div class=\"logo\"><div class=\"orb\"></div>AlEx Platform</div><span class=\"badge\">Página Pública</span></header>"
                + "<main><h1>" + title + "</h1><div class=\"content-box\">" + formattedContent + "</div>"
                + "<div class=\"footer-actions\"><span>Publicado com AlEx Platform v2</span><button class=\"btn-copy\" onclick=\"navigator.clipboard.writeText(window.location.href);this.textContent='Link Copiado!';setTimeout(()=>this.textContent='Copiar Link',2000)\">Copiar Link</button></div>"
                + "<script>document.querySelectorAll('.page-chatbot form').forEach(function(form){form.addEventListener('submit',async function(event){event.preventDefault();var input=form.querySelector('input');var reply=form.querySelector('.chatbot-reply');var button=form.querySelector('button');if(!input.value.trim())return;button.disabled=true;reply.textContent='Pensando...';try{var response=await fetch('/api/pages/" + slug + "/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:input.value.trim()})});var data=await response.json();reply.textContent=data.reply||data.message||'Não foi possível responder agora.'}catch(error){reply.textContent='Não foi possível conectar ao assistente agora.'}finally{button.disabled=false}})})</script>"
                + "</main></body></html>";
    }

    public static String formatContent(String raw) {
        return formatContent(raw, "");
    }

    public static String formatContent(String raw, String pageSlug) {
        if (raw == null || raw.isBlank()) return "";
        String text = escapeHtml(raw);

        Matcher pricingMatcher = Pattern.compile("\\[pricing\\]\\s*([\\s\\S]*?)\\s*\\[/pricing\\]", Pattern.CASE_INSENSITIVE).matcher(text);
        StringBuffer pricingBuffer = new StringBuffer();
        while (pricingMatcher.find()) {
            String[] rows = pricingMatcher.group(1).trim().split("\\n");
            StringBuilder table = new StringBuilder("<table class=\"pricing-table\"><thead><tr>");
            if (rows.length > 0) {
                for (String cell : rows[0].split("\\|")) table.append("<th>").append(cell.trim()).append("</th>");
                table.append("</tr></thead><tbody>");
                for (int i = 1; i < rows.length; i++) {
                    if (rows[i].isBlank()) continue;
                    table.append("<tr>");
                    for (String cell : rows[i].split("\\|")) table.append("<td>").append(cell.trim()).append("</td>");
                    table.append("</tr>");
                }
            }
            table.append("</tbody></table>");
            pricingMatcher.appendReplacement(pricingBuffer, Matcher.quoteReplacement(table.toString()));
        }
        pricingMatcher.appendTail(pricingBuffer);
        text = pricingBuffer.toString();

        Matcher colorMatcher = Pattern.compile("\\[color:(#[0-9a-f]{6})\\]([\\s\\S]*?)\\[/color\\]", Pattern.CASE_INSENSITIVE).matcher(text);
        StringBuffer colorBuffer = new StringBuffer();
        while (colorMatcher.find()) {
            String block = "<div style=\"padding:16px;border-left:4px solid " + colorMatcher.group(1)
                + ";background:rgba(0,113,227,.06);border-radius:0 10px 10px 0\">"
                + colorMatcher.group(2) + "</div>";
            colorMatcher.appendReplacement(colorBuffer, Matcher.quoteReplacement(block));
        }
        colorMatcher.appendTail(colorBuffer);
        text = colorBuffer.toString();

        Matcher chatbotMatcher = Pattern.compile("\\[chatbot:(.*?)\\]\\((.*?)\\)", Pattern.CASE_INSENSITIVE).matcher(text);
        StringBuffer chatbotBuffer = new StringBuffer();
        while (chatbotMatcher.find()) {
            String widget = "<div class=\"page-chatbot\"><strong>◌ " + chatbotMatcher.group(1) + "</strong><p>" + chatbotMatcher.group(2) + "</p><form><input placeholder=\"Pergunte sobre esta página...\" maxlength=\"1000\" /><button type=\"submit\">Enviar</button><div class=\"chatbot-reply\"></div></form></div>";
            chatbotMatcher.appendReplacement(chatbotBuffer, Matcher.quoteReplacement(widget));
        }
        chatbotMatcher.appendTail(chatbotBuffer);
        text = chatbotBuffer.toString();

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
            if (trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<div") || trimmed.startsWith("<table") || trimmed.startsWith("<blockquote") || trimmed.startsWith("<hr")) {
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
