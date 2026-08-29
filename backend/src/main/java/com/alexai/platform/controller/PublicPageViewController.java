package com.alexai.platform.controller;

import com.alexai.platform.cqrs.PageQueryService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Renderização pública das páginas — usa o LADO DE LEITURA do CQRS
 * (Elasticsearch primeiro, com fallback para a fonte da verdade).
 */
@RestController
@RequestMapping("/public")
public class PublicPageViewController {

    private final PageQueryService pageQueryService;

    public PublicPageViewController(PageQueryService pageQueryService) {
        this.pageQueryService = pageQueryService;
    }

    @GetMapping(value = "/{slug}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> view(@PathVariable String slug) {
        Map<String, Object> page = pageQueryService.findBySlug(slug);
        if (page == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(PublicPageController.renderPage(page));
    }
}
