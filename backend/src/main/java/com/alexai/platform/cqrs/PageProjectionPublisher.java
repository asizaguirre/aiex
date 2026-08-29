package com.alexai.platform.cqrs;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Publica eventos de mudança (upsert/delete) do lado de ESCRITA para o lado de LEITURA.
 * Em produção real, isto iria para um message broker (Kafka/RabbitMQ).
 * Aqui usamos publicação direta em memória para manter a stack simples (Docker Compose).
 */
@Component
public class PageProjectionPublisher {

    private final PageProjectionHandler handler;

    public PageProjectionPublisher(PageProjectionHandler handler) {
        this.handler = handler;
    }

    /** Evento: página criada ou atualizada. */
    public void publishUpsert(Map<String, Object> page) {
        try {
            handler.onPageUpsert(page);
        } catch (Exception ex) {
            System.err.println("[CQRS] Falha ao publicar evento de upsert: " + ex.getMessage());
        }
    }

    /** Evento: página removida. */
    public void publishDelete(String pageId) {
        try {
            handler.onPageDelete(pageId);
        } catch (Exception ex) {
            System.err.println("[CQRS] Falha ao publicar evento de remoção: " + ex.getMessage());
        }
    }
}