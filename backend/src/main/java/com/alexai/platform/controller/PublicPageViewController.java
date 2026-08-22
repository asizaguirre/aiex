package com.alexai.platform.controller;

import com.alexai.platform.service.PublicPageService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/public")
public class PublicPageViewController {

    private final PublicPageService publicPageService;

    public PublicPageViewController(PublicPageService publicPageService) {
        this.publicPageService = publicPageService;
    }

    @GetMapping(value = "/{slug}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> view(@PathVariable String slug) {
        Map<String, Object> page = publicPageService.findBySlug(slug);
        if (page == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(renderPage(page));
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
