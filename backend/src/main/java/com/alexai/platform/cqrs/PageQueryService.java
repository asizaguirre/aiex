package com.alexai.platform.cqrs;

import com.alexai.platform.service.PublicPageService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * LADO DE LEITURA do CQRS (Query).
 *
 * Todas as consultas de páginas públicas passam por aqui.
 * Estratégia: Elasticsearch primeiro (rápido, full-text); se indisponível,
 * faz fallback transparente para a fonte da verdade (JSON) — o cliente nunca fica sem resposta.
 */
@Service
public class PageQueryService {

    private final ElasticsearchClient elasticsearch;
    private final PublicPageService publicPageService;

    public PageQueryService(ElasticsearchClient elasticsearch, PublicPageService publicPageService) {
        this.elasticsearch = elasticsearch;
        this.publicPageService = publicPageService;
    }

    /** Busca página por slug (usada na renderização pública). */
    public Map<String, Object> findBySlug(String slug) {
        if (elasticsearch.isEnabled()) {
            Map<String, Object> hit = elasticsearch.findByTerm(PageCommandService.INDEX, "slug", slug.toLowerCase());
            if (hit != null) return hit;
        }
        // Fallback: fonte da verdade
        return publicPageService.findBySlug(slug);
    }

    /** Lista páginas de um dono (ou todas, se admin). */
    public List<Map<String, Object>> listByOwner(String ownerEmail, boolean isAdmin) {
        if (elasticsearch.isEnabled()) {
            List<Map<String, Object>> hits = elasticsearch.searchAll(PageCommandService.INDEX,
                    isAdmin ? null : ownerEmail);
            if (!hits.isEmpty()) return hits;
            if (isAdmin) {
                // Elasticsearch vazio mas pode haver dados só no JSON
                return publicPageService.readPages();
            }
        }
        List<Map<String, Object>> pages = publicPageService.readPages();
        if (isAdmin) return pages;
        return pages.stream()
                .filter(p -> ownerEmail.equalsIgnoreCase(String.valueOf(p.get("ownerEmail"))))
                .toList();
    }

    /** Busca textual (título + conteúdo) — só possível graças ao Elasticsearch. */
    public List<Map<String, Object>> search(String query, String ownerEmail, boolean isAdmin) {
        if (!elasticsearch.isEnabled()) {
            return listByOwner(ownerEmail, isAdmin);
        }
        String safe = query.replace("\"", "\\\\\"");
        String esQuery = """
                {"query":{"bool":{"must":[{"multi_match":{"query":"%s","fields":["title^3","content"]}}]%s}},
                 "size":50,"sort":[{"_score":{"order":"desc"}}]}"""
                .formatted(safe, isAdmin ? "" : ",{\"filter\":[{\"term\":{\"ownerEmail\":\"" + ownerEmail.replace("\"", "\\\\\"") + "\"}}]}");
        try {
            var response = new org.springframework.web.client.RestTemplate().postForObject(
                    elasticsearch.getUrl() + "/" + PageCommandService.INDEX + "/_search",
                    jsonEntity(esQuery), Map.class);
            if (response == null) return List.of();
            @SuppressWarnings("unchecked")
            Map<String, Object> hits = (Map<String, Object>) response.get("hits");
            if (hits == null) return List.of();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> hitList = (List<Map<String, Object>>) hits.get("hits");
            List<Map<String, Object>> results = new java.util.ArrayList<>();
            if (hitList != null) {
                for (Map<String, Object> hit : hitList) {
                    Object source = hit.get("_source");
                    if (source instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> src = (Map<String, Object>) source;
                        src.put("_score", hit.get("_score"));
                        results.add(src);
                    }
                }
            }
            return results;
        } catch (Exception ex) {
            return listByOwner(ownerEmail, isAdmin);
        }
    }

    private org.springframework.http.HttpEntity<String> jsonEntity(String body) {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        return new org.springframework.http.HttpEntity<>(body, headers);
    }
}