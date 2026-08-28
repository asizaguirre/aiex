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
        return ResponseEntity.ok(PublicPageController.renderPage(page));
    }
}
