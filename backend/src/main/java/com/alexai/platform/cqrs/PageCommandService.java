package com.alexai.platform.cqrs;

import com.alexai.platform.service.PublicPageService;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * LADO DE ESCRITA do CQRS (Command).
 *
 * Toda alteração de páginas de produtos passa por aqui:
 * 1. Valida e persiste na FONTE DA VERDADE (db/public_pages.json).
 * 2. Publica um evento para o lado de leitura atualizar a projeção (Elasticsearch).
 *
 * O lado de escrita NUNCA lê do Elasticsearch — separação total de responsabilidades.
 */
@Service
public class PageCommandService {

    public static final String INDEX = "public_pages";

    private final PublicPageService publicPageService;   // fonte da verdade (JSON)
    private final PageProjectionPublisher projectionPublisher;

    public PageCommandService(PublicPageService publicPageService,
                              PageProjectionPublisher projectionPublisher) {
        this.publicPageService = publicPageService;
        this.projectionPublisher = projectionPublisher;
    }

    /** Cria uma nova página de produto. */
    public Map<String, Object> createPage(String slug, String title, String content, String ownerEmail) throws IOException {
        List<Map<String, Object>> pages = publicPageService.readPages();

        if (pages.stream().anyMatch(p -> slug.equalsIgnoreCase(String.valueOf(p.get("slug"))))) {
            throw new IllegalArgumentException("Este endpoint já está em uso.");
        }

        Map<String, Object> page = new HashMap<>();
        page.put("id", String.valueOf(System.currentTimeMillis()));
        page.put("slug", slug);
        page.put("title", title);
        page.put("content", content);
        page.put("ownerEmail", ownerEmail.trim().toLowerCase());
        page.put("createdAt", System.currentTimeMillis());

        pages.add(page);
        publicPageService.writePages(pages);

        // Evento: atualiza a projeção de leitura
        projectionPublisher.publishUpsert(page);
        return page;
    }

    /** Atualiza uma página existente (dono ou admin). */
    public Map<String, Object> updatePage(String slug, String newSlug, String title, String content, String requesterEmail, boolean isAdmin) throws IOException {
        List<Map<String, Object>> pages = publicPageService.readPages();
        Map<String, Object> page = pages.stream()
                .filter(item -> slug.equalsIgnoreCase(String.valueOf(item.get("slug"))))
                .findFirst()
                .orElse(null);

        if (page == null) throw new IllegalArgumentException("Página não encontrada.");
        if (!isAdmin && !requesterEmail.equalsIgnoreCase(String.valueOf(page.get("ownerEmail")))) {
            throw new SecurityException("Você não tem permissão para editar esta página.");
        }

        String finalSlug = (newSlug == null || newSlug.isBlank()) ? slug : newSlug;
        if (!finalSlug.equals(slug)) {
            boolean conflict = pages.stream()
                    .anyMatch(item -> finalSlug.equalsIgnoreCase(String.valueOf(item.get("slug")))
                            && !String.valueOf(page.get("id")).equals(String.valueOf(item.get("id"))));
            if (conflict) throw new IllegalArgumentException("Este endpoint já está em uso.");
        }

        page.put("slug", finalSlug);
        page.put("title", title);
        page.put("content", content);
        page.put("updatedAt", System.currentTimeMillis());
        publicPageService.writePages(pages);

        projectionPublisher.publishUpsert(page);
        return page;
    }

    /** Remove uma página (dono ou admin). */
    public void deletePage(String slug, String requesterEmail, boolean isAdmin) throws IOException {
        List<Map<String, Object>> pages = publicPageService.readPages();
        Map<String, Object> page = pages.stream()
                .filter(item -> slug.equalsIgnoreCase(String.valueOf(item.get("slug"))))
                .findFirst()
                .orElse(null);

        if (page == null) throw new IllegalArgumentException("Página não encontrada.");
        if (!isAdmin && !requesterEmail.equalsIgnoreCase(String.valueOf(page.get("ownerEmail")))) {
            throw new SecurityException("Você não tem permissão para remover esta página.");
        }

        pages.removeIf(item -> slug.equalsIgnoreCase(String.valueOf(item.get("slug"))));
        publicPageService.writePages(pages);

        projectionPublisher.publishDelete(String.valueOf(page.get("id")));
    }

    /** Reindexa todas as páginas da fonte da verdade para o Elasticsearch. */
    public int rebuildProjection() throws IOException {
        List<Map<String, Object>> pages = publicPageService.readPages();
        for (Map<String, Object> page : pages) {
            projectionPublisher.publishUpsert(page);
        }
        return pages.size();
    }
}