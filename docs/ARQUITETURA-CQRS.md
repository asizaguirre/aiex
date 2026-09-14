# 🏗️ Arquitetura CQRS — Páginas de Produtos (AlEx Platform v3)

## Visão geral

Implementação de **CQRS (Command Query Responsibility Segregation)** com **separação total de leitura e escrita**, usando **Elasticsearch** como banco de leitura (projeção), tudo dentro do Docker.

```
                          ┌──────────────────────────────────────────────┐
                          │              ESCRITA (Command)               │
                          │                                              │
  Cliente/Agente IA ────► │  PublicPageController                        │
  (REST / linguagem       │  ProductPageAgentController                  │
   natural)               │        │                                     │
                          │        ▼                                     │
                          │  PageCommandService                          │
                          │   • valida regras de negócio                 │
                          │   • persiste na FONTE DA VERDADE             │
                          │     (db/public_pages.json)                   │
                          │        │                                     │
                          │        ▼  evento (upsert/delete)             │
                          │  PageProjectionPublisher ────────┐           │
                          └──────────────────────────────────┼───────────┘
                                                             │
                                                             ▼
                          ┌──────────────────────────────────────────────┐
                          │               LEITURA (Query)                │
                          │                                              │
                          │  PageProjectionHandler                       │
                          │   • aplica eventos no Elasticsearch          │
                          │   • sincroniza tudo no arranque              │
                          │        │                                     │
                          │        ▼                                     │
                          │  ┌───────────────────┐                       │
                          │  │  ELASTICSEARCH    │ ◄── Docker            │
                          │  │  índice:          │                       │
                          │  │  public_pages     │                       │
                          │  └─────────┬─────────┘                       │
                          │            │                                 │
                          │            ▼                                 │
                          │  PageQueryService                            │
                          │   • findBySlug / listByOwner / search        │
                          │   • fallback p/ JSON se ES cair              │
                          │        │                                     │
                          │  PublicPageViewController  ──► /public/{slug}│
                          └──────────────────────────────────────────────┘
```

## Componentes

| Classe | Papel | Camada |
|--------|-------|--------|
| `cqrs/PageCommandService` | Valida e grava na fonte da verdade; emite eventos | Escrita |
| `cqrs/PageProjectionPublisher` | Publica eventos de mudança (em memória; trocável por Kafka/Rabbit) | Escrita → Leitura |
| `cqrs/PageProjectionHandler` | Aplica eventos no Elasticsearch; reindexa no arranque | Leitura |
| `cqrs/PageQueryService` | Todas as consultas (slug, listagem, busca textual) | Leitura |
| `cqrs/ElasticsearchClient` | Cliente REST leve do Elasticsearch (sem dependência oficial) | Leitura |
| `client/OllamaWarmup` | Mantém o modelo do Ollama **sempre carregado** (`keep_alive=-1`) | IA |

## Fluxo de escrita (exemplo: criar página)

1. `POST /api/pages` ou `POST /api/agent/pages/chat` (linguagem natural).
2. `PageCommandService.createPage()` valida slug/título/conteúdo.
3. Persiste em `db/public_pages.json` (fonte da verdade).
4. Publica evento `publishUpsert(page)`.
5. `PageProjectionHandler.onPageUpsert()` indexa no Elasticsearch (`refresh=wait_for`).

## Fluxo de leitura (exemplo: cliente abre a página)

1. `GET /public/{slug}` → `PublicPageViewController`.
2. `PageQueryService.findBySlug()` consulta o Elasticsearch (term query no campo `slug`).
3. Se o Elasticsearch estiver fora do ar → **fallback transparente** para o JSON.
4. Renderiza o HTML da página de produto.

## Ollama sempre a postos

- `OllamaWarmup` roda no arranque: faz `pull` do modelo (idempotente) e pré-carrega com `keep_alive=-1` (nunca sai da memória).
- Um vigia reaquece o modelo a cada 5 minutos se necessário.
- O serviço `ollama-init` no docker-compose baixa o modelo no primeiro `up`.
- Todas as chamadas de IA (`AgentService`, `ProductPageAgentService`) usam o `OllamaClient` central.

## Agente construtor de páginas

`ProductPageAgentService` recebe linguagem natural e executa ações via CQRS:

| Ação | O que faz |
|------|-----------|
| `create` | Gera página de vendas completa (Markdown) e publica |
| `update` | Edita página existente |
| `delete` | Remove página |
| `list` | Lista páginas do usuário |
| `search` | Busca textual no Elasticsearch |

### Endpoints novos

```
POST /api/agent/pages/chat          {"email": "...", "instruction": "crie a página do bolo..."}
GET  /api/agent/pages?email=...     lista páginas (leitura)
GET  /api/agent/pages/search?email=...&q=bolo   busca textual
POST /api/agent/pages/rebuild?email=... (admin) ressincroniza projeção
```

## Subir tudo com Docker

```bash
cd alex-platform-v2-main
docker compose up -d --build
```

Serviços: `alex-platform-v2` (8080), `ollama` (11434), `ollama-init` (one-shot), `elasticsearch` (9200).

> ⚙️ Variáveis úteis: `OLLAMA_MODEL` (padrão `qwen2.5-coder:7b`), `ELASTICSEARCH_ENABLED` (padrão `true`), `OLLAMA_WARMUP_ENABLED` (padrão `true`).

## Testes rápidos

```bash
# Saúde
curl http://localhost:8080/actuator/health

# Elasticsearch no ar
curl http://localhost:9200/_cluster/health

# Agente cria página de produto
curl -X POST http://localhost:8080/api/agent/pages/chat \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","instruction":"Crie a página do bolo de chocolate, preço R$45, WhatsApp 5511999999999, entrega em SP"}'

# Ver a página pública
curl http://localhost:8080/public/bolo-de-chocolate

# Buscar no Elasticsearch
curl "http://localhost:8080/api/agent/pages/search?email=seu@email.com&q=bolo"
```

## Garantias de consistência

- **Fonte da verdade única**: o JSON em `db/`. O Elasticsearch é descartável e reconstruível.
- **Reindexação no arranque**: ao subir, o handler sincroniza tudo automaticamente.
- **Rebuild manual**: `POST /api/agent/pages/rebuild` (admin).
- **Fallback de leitura**: se o ES estiver fora, as consultas caem para o JSON — zero downtime para o cliente.