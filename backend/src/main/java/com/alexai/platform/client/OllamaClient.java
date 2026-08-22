package com.alexai.platform.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class OllamaClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ollama.url}")
    private String ollamaUrl;

    @Value("${ollama.model}")
    private String model;

    public String generate(String prompt) {
        String url = ollamaUrl + "/api/generate";
        Map<String, Object> body = Map.of(
                "model", model,
                "prompt", prompt,
                "stream", false
        );

        try {
            Map response = restTemplate.postForObject(url, body, Map.class);
            if (response != null && response.containsKey("response")) {
                return response.get("response").toString();
            }
            return "Erro: Resposta vazia do Ollama.";
        } catch (Exception ex) {
            return "⚠️ Erro de Conexão com a IA (Ollama)\n\n" +
                   "Não foi possível conectar ao Ollama em: " + ollamaUrl + "\n\n" +
                   "Por favor, verifique se:\n" +
                   "1. O Ollama está instalado e rodando na sua máquina.\n" +
                   "2. O modelo '" + model + "' foi baixado executando:\n" +
                   "   `ollama pull " + model + "`\n\n" +
                   "Detalhes do erro: " + ex.getMessage();
        }
    }
}
