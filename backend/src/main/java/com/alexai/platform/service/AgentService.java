package com.alexai.platform.service;

import com.alexai.platform.client.OllamaClient;
import com.alexai.platform.dto.ChatRequest;
import com.alexai.platform.dto.ChatResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AgentService {

    private final OllamaClient ollamaClient;
    private final CustomAgentService customAgentService;

    public AgentService(OllamaClient ollamaClient, CustomAgentService customAgentService) {
        this.ollamaClient = ollamaClient;
        this.customAgentService = customAgentService;
    }

    public ChatResponse execute(ChatRequest request) {
        String agent = request.getAgent();
        if (agent == null || agent.isBlank()) {
            agent = "alex";
        }

        String context = getRagAndDbContext();
        String systemPrompt;
        List<String> ragDetails = new ArrayList<>();

        if (agent.equalsIgnoreCase("alia")) {
            systemPrompt = """
                    Você é Alia, especialista em conhecimento, RAG, organização de informações e análise documental.
                    Seu objetivo é ajudar a atender qualquer necessidade do cliente final:
                    1. Explicar o que o usuário quer para realizar o pedido do cliente.
                    2. Permitir que o usuário envie um documento para o RAG para definir comportamentos de agentes.
                    3. Permitir que o usuário adicione ou gerencie dados na Fonte da Verdade (DB).
                    4. Pedir para criar um agente específico que fará alguma coisa.
                    5. Se for necessário criar uma nova tela/página para atender ao pedido do cliente, você deve PARAMETRIZAR o engenheiro de software Alex.
                    
                    Para parametrizar o Alex, explique brevemente o que você está criando para o cliente e, em seguida, inclua obrigatoriamente um bloco JSON estruturado no final de sua mensagem exatamente assim:
                    ```json
                    {
                      "type": "create_screen",
                      "title": "[Título da Tela]",
                      "fields": [
                        {"name": "[id_campo_1]", "label": "[Nome do Campo 1]", "type": "text|number|textarea", "placeholder": "[Dica do campo 1]"},
                        ...
                      ],
                      "submitAction": "[Mensagem exibida ao salvar]"
                    }
                    ```
                    O sistema lerá este JSON e criará a tela dinamicamente usando a pipeline do Alex.
                    """;

            ragDetails.add("Agente Alia lê documentos de rag/documents e a fonte da verdade (DB).");
            ragDetails.add("Caso o usuário peça uma tela, Alia parametrizará o Alex via JSON.");
        } else if (agent.equalsIgnoreCase("alex")) {
            systemPrompt = """
                    Você é AlEx, Arquiteto de Soluções e Engenheiro de Software especialista em Java, Cloud, arquitetura de software, pipelines de deploy e otimização de performance.
                    Seu objetivo é criar pipelines eficientes e otimizar a performance de sistemas.
                    Na plataforma, você cria o código para as telas parametrizadas por Alia, executa testes e otimiza o código (por exemplo, debouncing, CSS dinâmico, menor consumo de rede, tratamento de vazamento de memória).
                    Explique as otimizações e o fluxo da pipeline quando for solicitado.
                    """;

            ragDetails.add("Agente Alex responde como engenheiro de software e otimizador de performance.");
            ragDetails.add("Alex cria pipelines e refatora código para as necessidades do cliente.");
        } else {
            // Busca o custom agent
            Map<String, Object> customAgent = customAgentService.getAgentByName(agent);
            if (customAgent != null) {
                String name = (String) customAgent.get("name");
                String role = (String) customAgent.get("role");
                
                systemPrompt = String.format("""
                        Você é %s. Seu objetivo principal é: %s.
                        Responda de acordo com a sua função, mantendo seu personagem e objetivo.
                        Você também tem acesso aos dados da Fonte da Verdade e Documentos do sistema caso necessário.
                        """, name, role);
                        
                ragDetails.add("Agente Customizado: " + name);
                ragDetails.add("Função: " + role);
            } else {
                systemPrompt = "Você é um assistente prestativo. Seu nome é " + agent + ".";
                ragDetails.add("Agente genérico instanciado sem dados prévios.");
            }
        }

        // Prepend context if found
        String fullPrompt = systemPrompt;
        if (!context.isBlank()) {
            fullPrompt += "\n\nCONTEXTO DO RAG E FONTE DA VERDADE (DB):\n" + context;
        }
        fullPrompt += "\n\nUsuário:\n" + request.getMessage();

        String response = ollamaClient.generate(fullPrompt);

        return new ChatResponse(
                agent,
                response,
                systemPrompt,
                ragDetails
        );
    }

    private String getRagAndDbContext() {
        StringBuilder context = new StringBuilder();

        // 1. Read RAG documents
        String ragDir = System.getenv().getOrDefault("RAG_STORAGE_DIR", "/IA/workspace/alex-platform-v2/rag/documents");
        File dir = new File(ragDir);
        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles((d, name) -> name.endsWith(".meta.json"));
            if (files != null && files.length > 0) {
                context.append("\n=== DOCUMENTOS RAG (COMPORTAMENTO DE AGENTES) ===\n");
                ObjectMapper om = new ObjectMapper();
                for (File f : files) {
                    try {
                        Map meta = om.readValue(f, Map.class);
                        context.append("- Documento: ").append(meta.get("fileName")).append("\n");
                        context.append("  Agente Alvo: ").append(meta.get("agent")).append("\n");
                        context.append("  Trecho: ").append(meta.get("textExcerpt")).append("\n\n");
                    } catch (Exception e) {
                        // ignore
                    }
                }
            }
        }

        // 2. Read DB records (Fonte da Verdade)
        File dbFile = new File("/IA/workspace/alex-platform-v2/db/database.json");
        if (dbFile.exists() && dbFile.isFile()) {
            try {
                ObjectMapper om = new ObjectMapper();
                List<Map> records = om.readValue(dbFile, List.class);
                if (records != null && !records.isEmpty()) {
                    context.append("\n=== REGISTROS DA FONTE DA VERDADE (DB) ===\n");
                    for (Map r : records) {
                        context.append("- Título: ").append(r.get("title")).append("\n");
                        context.append("  Conteúdo: ").append(r.get("content")).append("\n\n");
                    }
                }
            } catch (Exception e) {
                // ignore
            }
        }

        return context.toString();
    }
}
