package com.alexai.platform.service;

import com.alexai.platform.client.OllamaClient;
import com.alexai.platform.cqrs.PageCommandService;
import com.alexai.platform.cqrs.PageQueryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AGENTE CONSTRUTOR DE PÁGINAS DE PRODUTOS.
 *
 * O cliente fala em linguagem natural ("crie a página do meu bolo de chocolate,
 * preço 45, whatsapp 5511...") e o agente:
 * 1. Interpreta o pedido com o Ollama (sempre a postos).
 * 2. Gera um plano estruturado em JSON (ação + conteúdo da página).
 * 3. Executa o plano no lado de ESCRITA do CQRS (PageCommandService).
 * 4. Devolve o link público da página.
 *
 * Ações suportadas: create, update, delete, list, search.
 */
@Service
public class ProductPageAgentService {

    private final OllamaClient ollamaClient;
    private final PageCommandService pageCommandService;
    private final PageQueryService pageQueryService;
    private final AdminAuthService adminAuthService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String SYSTEM_PROMPT = """
            Você é o Agente de Páginas da plataforma AlEx. Sua função é criar, editar, remover e listar
            PÁGINAS DE EXPOSIÇÃO DE PRODUTOS a partir de pedidos em linguagem natural do usuário.

            Responda SEMPRE com um único bloco JSON válido, sem texto antes ou depois, neste formato exato:
            ```json
            {
              "action": "create|update|delete|list|search",
              "slug": "endpoint-da-pagina-em-minusculas-com-hifens",
              "title": "Título comercial atraente do produto",
              "content": "Conteúdo completo da página em Markdown. Use ## para seções, **negrito**, listas com -, imagens com ![alt](url), botão WhatsApp com [whatsapp:5511999999999?text=ola](Falar no WhatsApp) e botões com [button:Texto](url). Inclua seções: sobre o produto, diferenciais em lista, preço e oferta, formas de contato e chamada final para ação.",
              "searchQuery": "termo de busca (apenas para action=search)",
              "message": "Mensagem curta e simpática em português explicando o que foi feito para o usuário"
            }
            ```

            REGRAS:
            - Para "create": preencha slug, title e content. O content deve ser uma página de vendas COMPLETA, persuasiva e bem formatada, usando os dados fornecidos pelo usuário (preço, contato, entrega, diferenciais). Se faltar informação, crie conteúdo genérico profissional e sinalize na mensagem o que o usuário pode pedir para ajustar depois.
            - Para "update": preencha slug da página a alterar e os novos title/content.
            - Para "delete": preencha apenas slug.
            - Para "list" ou "search": não preencha title/content.
            - O slug deve conter apenas letras minúsculas, números e hífens (ex.: bolo-chocolate-premium).
            - Nunca invente números de WhatsApp: use exatamente os que o usuário informar. Se não houver, use [button:Entrar em Contato](#contato) e avise na mensagem.
            - Escreva o content em português do Brasil, com tom comercial acolhedor.
            """;

    public ProductPageAgentService(OllamaClient ollamaClient,
                                   PageCommandService pageCommandService,
                                   PageQueryService pageQueryService,
                                   AdminAuthService adminAuthService) {
        this.ollamaClient = ollamaClient;
        this.pageCommandService = pageCommandService;
        this.pageQueryService = pageQueryService;
        this.adminAuthService = adminAuthService;
    }

    /** Ponto de entrada: instrução em linguagem natural → ação executada + resposta. */
    public Map<String, Object> handleInstruction(String email, String instruction) {
        Map<String, Object> result = new LinkedHashMap<>();
        boolean isAdmin = adminAuthService.isAdmin(email);

        // 1. Contexto: páginas existentes do usuário ajudam a IA a decidir update vs create
        StringBuilder contextBuilder = new StringBuilder();
        try {
            List<Map<String, Object>> existing = pageQueryService.listByOwner(email, isAdmin);
            contextBuilder.append("PÁGINAS JÁ EXISTENTES DO USUÁRIO:\n");
            if (existing.isEmpty()) {
                contextBuilder.append("(nenhuma ainda)\n");
            } else {
                for (Map<String, Object> p : existing) {
                    contextBuilder.append("- slug: ").append(p.get("slug"))
                            .append(" | título: ").append(p.get("title")).append("\n");
                }
            }
        } catch (Exception ignored) {}

        // 2. Pergunta ao Ollama (sempre a postos)
        String fullPrompt = SYSTEM_PROMPT + "\n\n" + contextBuilder
                + "\nPEDIDO DO USUÁRIO (email: " + email + "):\n" + instruction;
        String rawResponse = ollamaClient.generate(fullPrompt);

        // 3. Extrai o JSON da resposta
        Map<String, Object> plan = extractJson(rawResponse);
        if (plan == null) {
            result.put("success", false);
            result.put("agentReply", rawResponse);
            result.put("message", "A IA respondeu, mas não foi possível extrair um plano de ação. Tente reformular o pedido.");
            return result;
        }

        String action = String.valueOf(plan.getOrDefault("action", "create")).toLowerCase().trim();
        String slug = sanitizeSlug(String.valueOf(plan.getOrDefault("slug", "")));
        String title = String.valueOf(plan.getOrDefault("title", ""));
        String content = String.valueOf(plan.getOrDefault("content", ""));
        String agentMessage = String.valueOf(plan.getOrDefault("message", "Feito!"));

        result.put("action", action);
        result.put("agentReply", agentMessage);

        try {
            switch (action) {
                case "create" -> {
                    requireNonBlank(slug, "slug");
                    requireNonBlank(title, "título");
                    requireNonBlank(content, "conteúdo");
                    Map<String, Object> page = pageCommandService.createPage(slug, title, content, email);
                    result.put("success", true);
                    result.put("page", page);
                    result.put("publicUrl", "/public/" + page.get("slug"));
                    result.put("message", "✅ Página criada! " + agentMessage);
                }
                case "update" -> {
                    requireNonBlank(slug, "slug");
                    Map<String, Object> page = pageCommandService.updatePage(slug, slug, title, content, email, isAdmin);
                    result.put("success", true);
                    result.put("page", page);
                    result.put("publicUrl", "/public/" + page.get("slug"));
                    result.put("message", "✏️ Página atualizada! " + agentMessage);
                }
                case "delete" -> {
                    requireNonBlank(slug, "slug");
                    pageCommandService.deletePage(slug, email, isAdmin);
                    result.put("success", true);
                    result.put("message", "🗑️ Página removida! " + agentMessage);
                }
                case "search" -> {
                    String query = String.valueOf(plan.getOrDefault("searchQuery", instruction));
                    List<Map<String, Object>> found = pageQueryService.search(query, email, isAdmin);
                    result.put("success", true);
                    result.put("pages", found);
                    result.put("message", "🔎 " + agentMessage + " (" + found.size() + " página(s) encontrada(s))");
                }
                case "list" -> {
                    List<Map<String, Object>> pages = pageQueryService.listByOwner(email, isAdmin);
                    List<Map<String, Object>> withUrls = new ArrayList<>();
                    for (Map<String, Object> p : pages) {
                        Map<String, Object> copy = new LinkedHashMap<>(p);
                        copy.put("publicUrl", "/public/" + p.get("slug"));
                        withUrls.add(copy);
                    }
                    result.put("success", true);
                    result.put("pages", withUrls);
                    result.put("message", "📋 " + agentMessage + " (" + withUrls.size() + " página(s))");
                }
                default -> {
                    result.put("success", false);
                    result.put("message", "Ação desconhecida: " + action);
                }
            }
        } catch (IllegalArgumentException ex) {
            result.put("success", false);
            result.put("message", "⚠️ " + ex.getMessage());
        } catch (SecurityException ex) {
            result.put("success", false);
            result.put("message", "🔒 " + ex.getMessage());
        } catch (Exception ex) {
            result.put("success", false);
            result.put("message", "⚠️ Erro ao executar a ação: " + ex.getMessage());
        }
        return result;
    }

    /** Criação direta (sem IA) — usada pelo controller REST tradicional. */
    public Map<String, Object> createPageDirect(String email, String slug, String title, String content) throws Exception {
        return pageCommandService.createPage(sanitizeSlug(slug), title, content, email);
    }

    /** Extrai o primeiro bloco JSON ```json ... ``` ou objeto JSON solto da resposta da IA. */
    private Map<String, Object> extractJson(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            // Tenta bloco ```json ... ```
            Pattern blockPattern = Pattern.compile("```(?:json)?\\s*(\\{.*?})\\s*```", Pattern.DOTALL);
            Matcher matcher = blockPattern.matcher(raw);
            if (matcher.find()) {
                return objectMapper.readValue(matcher.group(1), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            }
            // Tenta o primeiro objeto JSON solto na resposta
            int start = raw.indexOf('{');
            int end = raw.lastIndexOf('}');
            if (start >= 0 && end > start) {
                return objectMapper.readValue(raw.substring(start, end + 1), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String sanitizeSlug(String slug) {
        if (slug == null) return "";
        return slug.trim().toLowerCase()
                .replaceAll("[^a-z0-9\\-]", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
    }

    private void requireNonBlank(String value, String field) {
        if (value == null || value.isBlank() || "null".equals(value)) {
            throw new IllegalArgumentException("A IA não informou o campo obrigatório: " + field + ".");
        }
    }
}