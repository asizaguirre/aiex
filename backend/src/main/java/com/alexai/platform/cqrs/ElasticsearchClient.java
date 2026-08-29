package com.alexai.platform.cqrs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Cliente leve para o Elasticsearch usando REST puro (sem dependência oficial).
 * Faz parte do lado de LEITURA do CQRS: mantém a projeção das páginas de produtos.
 */
@Component
public class ElasticsearchClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final HttpHeaders jsonHeaders = new HttpHeaders();

    @Value("${elasticsearch.url:http://elasticsearch:9200}")
    private String elasticsearchUrl;

    @Value("${elasticsearch.enabled:true}")
    private boolean enabled;

    public ElasticsearchClient() {
        jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getUrl() {
        return elasticsearchUrl;
    }

    /** Verifica se o cluster está acessível. */
    public boolean isAvailable() {
        if (!enabled) return false;
        try {
            restTemplate.getForEntity(elasticsearchUrl + "/_cluster/health", String.class);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    /** Cria o índice se não existir, com mapping amigável para páginas. */
    public void ensureIndex(String index) {
        if (!enabled) return;
        try {
            Boolean exists = restTemplate.getForObject(elasticsearchUrl + "/" + index, String.class) != null;
            if (Boolean.TRUE.equals(exists)) return;
        } catch (Exception ignored) {
            // 404 cai aqui: índice não existe ainda
        }
        String mapping = """
                {
                  "mappings": {
                    "properties": {
                      "id":         {"type": "keyword"},
                      "slug":       {"type": "keyword"},
                      "title":      {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                      "content":    {"type": "text"},
                      "ownerEmail": {"type": "keyword"},
                      "createdAt":  {"type": "long"},
                      "updatedAt":  {"type": "long"}
                    }
                  }
                }""";
        try {
            restTemplate.exchange(elasticsearchUrl + "/" + index,
                    HttpMethod.PUT, new HttpEntity<>(mapping, jsonHeaders), String.class);
        } catch (Exception ignored) {
            // índice pode já ter sido criado concorrentemente
        }
    }

    /** Indexa (cria/atualiza) um documento. */
    public void index(String index, String id, Map<String, Object> document) {
        if (!enabled) return;
        try {
            restTemplate.put(elasticsearchUrl + "/" + index + "/_doc/" + id + "?refresh=wait_for",
                    new HttpEntity<>(document, jsonHeaders));
        } catch (Exception ex) {
            System.err.println("[CQRS] Falha ao indexar no Elasticsearch: " + ex.getMessage());
        }
    }

    /** Remove um documento pelo id. */
    public void delete(String index, String id) {
        if (!enabled) return;
        try {
            restTemplate.delete(elasticsearchUrl + "/" + index + "/_doc/" + id);
        } catch (Exception ex) {
            System.err.println("[CQRS] Falha ao remover do Elasticsearch: " + ex.getMessage());
        }
    }

    /** Busca um documento pelo id. Retorna null se não existir. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getById(String index, String id) {
        if (!enabled) return null;
        try {
            Map<String, Object> response = restTemplate.getForObject(
                    elasticsearchUrl + "/" + index + "/_doc/" + id, Map.class);
            if (response == null || !Boolean.TRUE.equals(response.get("found"))) return null;
            return (Map<String, Object>) response.get("_source");
        } catch (Exception ex) {
            return null;
        }
    }

    /** Busca por slug usando term query. Retorna null se não encontrar. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> findByTerm(String index, String field, String value) {
        if (!enabled) return null;
        String query = "{\"query\":{\"term\":{\"" + field + "\":\"" + value.replace("\"", "\\\\\"") + "\"}},\"size\":1}";
        try {
            Map<String, Object> response = restTemplate.postForObject(
                    elasticsearchUrl + "/" + index + "/_search",
                    new HttpEntity<>(query, jsonHeaders), Map.class);
            if (response == null) return null;
            Map<String, Object> hits = (Map<String, Object>) response.get("hits");
            if (hits == null) return null;
            java.util.List<Map<String, Object>> hitList = (java.util.List<Map<String, Object>>) hits.get("hits");
            if (hitList == null || hitList.isEmpty()) return null;
            return (Map<String, Object>) hitList.get(0).get("_source");
        } catch (Exception ex) {
            return null;
        }
    }

    /** Lista todos os documentos, opcionalmente filtrando por owner. */
    @SuppressWarnings("unchecked")
    public java.util.List<Map<String, Object>> searchAll(String index, String ownerEmail) {
        java.util.List<Map<String, Object>> results = new java.util.ArrayList<>();
        if (!enabled) return results;
        String query;
        if (ownerEmail == null || ownerEmail.isBlank()) {
            query = "{\"query\":{\"match_all\":{}},\"size\":1000,\"sort\":[{\"createdAt\":{\"order\":\"desc\"}}]}";
        } else {
            String safe = ownerEmail.replace("\"", "\\\\\"");
            query = "{\"query\":{\"term\":{\"ownerEmail\":\"" + safe + "\"}},\"size\":1000,\"sort\":[{\"createdAt\":{\"order\":\"desc\"}}]}";
        }
        try {
            Map<String, Object> response = restTemplate.postForObject(
                    elasticsearchUrl + "/" + index + "/_search",
                    new HttpEntity<>(query, jsonHeaders), Map.class);
            if (response == null) return results;
            Map<String, Object> hits = (Map<String, Object>) response.get("hits");
            if (hits == null) return results;
            java.util.List<Map<String, Object>> hitList = (java.util.List<Map<String, Object>>) hits.get("hits");
            if (hitList == null) return results;
            for (Map<String, Object> hit : hitList) {
                Object source = hit.get("_source");
                if (source instanceof Map) {
                    results.add((Map<String, Object>) source);
                }
            }
        } catch (Exception ex) {
            System.err.println("[CQRS] Falha na busca no Elasticsearch: " + ex.getMessage());
        }
        return results;
    }
}