package com.alexai.platform.cqrs;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * LADO DE LEITURA do CQRS (Query/Projection).
 *
 * Recebe eventos do lado de escrita e mantém a projeção no Elasticsearch,
 * que serve todas as consultas de páginas públicas com baixa latência.
 *
 * Também reindexa tudo no arranque (garante consistência após quedas).
 */
@Component
public class PageProjectionHandler implements ApplicationRunner {

    private final ElasticsearchClient elasticsearch;
    private final com.alexai.platform.service.PublicPageService publicPageService;

    public PageProjectionHandler(ElasticsearchClient elasticsearch,
                                 com.alexai.platform.service.PublicPageService publicPageService) {
        this.elasticsearch = elasticsearch;
        this.publicPageService = publicPageService;
    }

    /** Evento: página criada ou atualizada → indexa no Elasticsearch. */
    public void onPageUpsert(Map<String, Object> page) {
        if (!elasticsearch.isEnabled()) return;
        elasticsearch.ensureIndex(PageCommandService.INDEX);
        elasticsearch.index(PageCommandService.INDEX, String.valueOf(page.get("id")), page);
    }

    /** Evento: página removida → apaga do Elasticsearch. */
    public void onPageDelete(String pageId) {
        if (!elasticsearch.isEnabled()) return;
        elasticsearch.delete(PageCommandService.INDEX, pageId);
    }

    /** No arranque: cria o índice e sincroniza a fonte da verdade → Elasticsearch. */
    @Override
    public void run(ApplicationArguments args) {
        if (!elasticsearch.isEnabled()) {
            System.out.println("[CQRS] Elasticsearch desabilitado — projeção de leitura inativa.");
            return;
        }
        new Thread(() -> {
            // Aguarda o Elasticsearch subir (retry com backoff simples)
            for (int attempt = 1; attempt <= 30; attempt++) {
                if (elasticsearch.isAvailable()) break;
                try {
                    Thread.sleep(2000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
            try {
                elasticsearch.ensureIndex(PageCommandService.INDEX);
                int count = 0;
                for (Map<String, Object> page : publicPageService.readPages()) {
                    elasticsearch.index(PageCommandService.INDEX, String.valueOf(page.get("id")), page);
                    count++;
                }
                System.out.println("[CQRS] Projeção de leitura sincronizada: " + count + " páginas no Elasticsearch.");
            } catch (Exception ex) {
                System.err.println("[CQRS] Falha ao sincronizar projeção inicial: " + ex.getMessage());
            }
        }, "cqrs-startup-sync").start();
    }
}