package com.alexai.platform.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Mantém o Ollama SEMPRE A POSTOS:
 * 1. No arranque, aguarda o Ollama subir e pré-carrega o modelo em memória (warmup).
 * 2. Usa keep_alive=-1 para o modelo nunca ser descarregado entre requisições.
 * 3. Reaquece periodicamente caso o modelo saia da memória.
 */
@Component
public class OllamaWarmup implements ApplicationRunner {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ollama.url}")
    private String ollamaUrl;

    @Value("${ollama.model}")
    private String model;

    @Value("${ollama.warmup.enabled:true}")
    private boolean warmupEnabled;

    private volatile boolean modelReady = false;

    @Override
    public void run(ApplicationArguments args) {
        if (!warmupEnabled) return;
        Thread warmupThread = new Thread(() -> {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 1. Garante que o modelo foi baixado (pull é idempotente)
            for (int attempt = 1; attempt <= 60; attempt++) {
                try {
                    restTemplate.postForObject(ollamaUrl + "/api/pull",
                            new HttpEntity<>(Map.of("name", model, "stream", false), headers), Map.class);
                    break;
                } catch (Exception ex) {
                    System.out.println("[OLLAMA-WARMUP] Aguardando Ollama subir (tentativa " + attempt + ")...");
                    try { Thread.sleep(3000); } catch (InterruptedException e) { return; }
                }
            }

            // 2. Pré-carrega o modelo em memória com keep_alive=-1 (nunca descarrega)
            for (int attempt = 1; attempt <= 10; attempt++) {
                try {
                    Map<String, Object> body = Map.of(
                            "model", model,
                            "prompt", "ok",
                            "stream", false,
                            "keep_alive", -1
                    );
                    restTemplate.postForObject(ollamaUrl + "/api/generate",
                            new HttpEntity<>(body, headers), Map.class);
                    modelReady = true;
                    System.out.println("[OLLAMA-WARMUP] Modelo '" + model + "' carregado e SEMPRE PRONTO (keep_alive=-1).");
                    break;
                } catch (Exception ex) {
                    System.out.println("[OLLAMA-WARMUP] Tentativa " + attempt + " de carregar modelo falhou: " + ex.getMessage());
                    try { Thread.sleep(5000); } catch (InterruptedException e) { return; }
                }
            }

            // 3. Vigia: se o modelo sair da memória, reaquece a cada 5 minutos
            while (true) {
                try { Thread.sleep(300_000); } catch (InterruptedException e) { return; }
                if (!modelReady || !isModelLoaded()) {
                    try {
                        Map<String, Object> body = Map.of(
                                "model", model, "prompt", "ok", "stream", false, "keep_alive", -1
                        );
                        restTemplate.postForObject(ollamaUrl + "/api/generate",
                                new HttpEntity<>(body, headers), Map.class);
                        modelReady = true;
                        System.out.println("[OLLAMA-WARMUP] Modelo reaquecido e pronto.");
                    } catch (Exception ignored) {}
                }
            }
        }, "ollama-warmup");
        warmupThread.setDaemon(true);
        warmupThread.start();
    }

    @SuppressWarnings("unchecked")
    private boolean isModelLoaded() {
        try {
            Map<String, Object>[] models = restTemplate.getForObject(ollamaUrl + "/api/ps", Map[].class);
            if (models == null) return false;
            for (Map<String, Object> m : models) {
                if (String.valueOf(m.get("name")).startsWith(model.split(":")[0])) return true;
            }
            return false;
        } catch (Exception ex) {
            return false;
        }
    }

    public boolean isModelReady() {
        return modelReady;
    }
}