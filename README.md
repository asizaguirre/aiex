# AlEx Platform v3 — Multi-Agent AI Commerce Platform

> **Alia descobre. Alex constrói. Você vende.**
> **Alia discovers. Alex builds. You sell.**

![Java 25](https://img.shields.io/badge/Java-25_LTS-red) ![Spring Boot 3.5](https://img.shields.io/badge/Spring_Boot-3.5.12-green) ![Ollama](https://img.shields.io/badge/Ollama-always_ready-orange) ![RAG](https://img.shields.io/badge/RAG-Tika_%2B_JSON-blue) ![CQRS+ES](https://img.shields.io/badge/CQRS-Elasticsearch_8.15-yellow) ![Docker](https://img.shields.io/badge/Docker-ready-blue) ![Self-hosted](https://img.shields.io/badge/Data-100%25_yours-purple)

**Sem código, sem agência: descreva sua oferta em uma frase e publique uma página de vendas com chatbot, preços, fotos e WhatsApp.**
**No code, no agency: describe your offer in one sentence and publish a sales page with chatbot, pricing, photos, and WhatsApp.**

> **💰 Publique em minutos, não em semanas. A IA entende português, monta a oferta e entrega um link público pronto para vender.**
> **💰 Publish in minutes, not weeks. The AI understands your language, builds the offer, and hands you a public link ready to sell.**

Plataforma de comércio e produtividade com múltiplos agentes de IA para criar agentes especializados, páginas públicas, ofertas, catálogos e experiências digitais a partir de linguagem natural e ferramentas visuais.

A multi-agent commerce and productivity platform for building specialized agents, public pages, offers, catalogs, and digital experiences through natural language and visual tools.

## ✨ Visão do produto | Product vision

> **💰 Publique em minutos, não em semanas. O agente entende português, monta a oferta e entrega um link público pronto para vender.**
> **💰 Publish in minutes, not weeks. The agent understands your language, builds the offer, and hands you a public link ready to sell.**

### Português

A AlEx Platform reúne descoberta de requisitos, engenharia, RAG e publicação em
um único workspace. O cliente entra com sua conta autorizada, constrói seus
agentes e publica suas próprias páginas. Cada página e cada agente ficam
vinculados ao e-mail do proprietário (`ownerEmail`).

O administrador do sistema tem um workspace separado para autorizar clientes,
acompanhar solicitações (`/api/admin/users`, `/api/admin/requests`) e monitorar o pipeline. Clientes não recebem acesso às
ferramentas administrativas.

**Cadeia de valor:** você fala → Alia organiza → Alex constrói → você compartilha o link `/public/{slug}`.

### English

AlEx Platform combines requirements discovery, engineering, RAG, and publishing
in one workspace. An authorized customer signs in, builds their own agents, and
publishes their own pages. Every page and agent is tied to its owner's email (`ownerEmail`).

The system administrator has a separate workspace for approving customers,
reviewing access requests (`/api/admin/users`, `/api/admin/requests`), and monitoring the pipeline. Customers do not see
administrative tools.

**Value chain:** you talk → Alia organizes → Alex builds → you share the `/public/{slug}` link.

## 🎯 Para quem é | Who it is for

| Público | Valor em português | Value in English |
| --- | --- | --- |
| 🏪 Donos de negócios locais | Crie presença digital, catálogo ou página de vendas sem começar do zero. Restaurante, imobiliária, clínica, loja: oferta vira link em minutos. | Build a digital presence, catalog, or sales page without starting from scratch. Restaurant, real estate, clinic, store: an offer becomes a link in minutes. |
| 📣 Marketing e vendas | Transforme uma oferta em uma página pública com mídia, preços, CTA, WhatsApp e chatbot ancorado no conteúdo. | Turn an offer into a public page with media, pricing, CTAs, WhatsApp, and a content-grounded chatbot. |
| 🧭 Times de produto | Converse com Alia para descobrir requisitos e use Alex para estruturar soluções. Estudo de mercado + Co-Pilot no editor. | Talk to Alia to discover requirements and use Alex to structure solutions. Market study + Co-Pilot inside the editor. |
| 💻 Desenvolvedores | Execute localmente, mantenha os dados sob seu controle e estenda os endpoints Spring Boot. CQRS com fallback sem downtime. | Run locally, keep data under your control, and extend the Spring Boot endpoints. CQRS with zero-downtime fallback. |

## 🤖 O sistema de agentes | The agent system

| Componente | Português | English |
| --- | --- | --- |
| **Alia** | Descobre requisitos, contexto de negócio, público e critérios de sucesso. | Discovers requirements, business context, audience, and success criteria. |
| **Alex** | Atua como arquiteto e engenheiro para construir telas e soluções. | Acts as an architect and engineer for building screens and solutions. |
| **Agente de páginas** | Recebe instruções naturais e cria, edita, lista, busca ou remove páginas. | Turns natural-language instructions into page create, update, list, search, or delete actions. |
| **Agentes customizados** | Cada cliente pode construir agentes próprios vinculados ao seu e-mail. | Each customer can build custom agents tied to their email. |
| **RAG** | Alimenta os agentes com documentos autorizados em PDF, TXT ou DOCX. | Grounds agents with authorized PDF, TXT, or DOCX documents. |
| **Ollama** | Executa o modelo localmente, com configuração de URL e modelo por ambiente. | Runs the model locally, with environment-configurable URL and model. |

O sistema deve manter revisão humana para decisões importantes e usar apenas
dados autorizados pelo cliente. A IA não substitui validação comercial, jurídica
ou operacional.

The system should keep a human review step for important decisions and use only
customer-authorized data. AI does not replace commercial, legal, or operational
validation.

## ✅ Capacidades verificadas | Verified capabilities

| Capacidade | Endpoint ou interface |
| --- | --- |
| Health check | `GET /actuator/health` ou `GET /api/health` |
| Login e autorização | `POST /api/access/verify` |
| Chat multiagente | `POST /api/chat` |
| Upload para RAG | `POST /api/upload` |
| Fonte da Verdade | `GET /api/db` e `POST /api/db` |
| Pipeline de tela dinâmica | `POST /api/pipeline/run` |
| Agentes customizados | `GET/POST /api/agents/custom` |
| Páginas via agente | `POST /api/agent/pages/chat` |
| Páginas do proprietário | `GET /api/pages?email=...` |
| Criar página | `POST /api/pages?email=...` |
| Ler dados para edição | `GET /api/pages/data/{slug}?email=...` |
| Editar página | `PUT /api/pages/{slug}?email=...` |
| Remover página | `DELETE /api/pages/{slug}?email=...` |
| Página pública | `GET /public/{slug}` |
| Chatbot público da página | `POST /api/pages/{slug}/chat` |
| Upload de fotos e vídeos | `POST /api/pages/media` |
| Administração de clientes | `/api/admin/users` e `/api/admin/requests` |

## 🌐 Estúdio visual de páginas | Visual page studio

### Português

Na sessão **Publicar Página Acessível**, o cliente encontra um fluxo visual
para construir e publicar uma página pública:

- título, slug e conteúdo estruturado;
- editor com área de conteúdo rolável e prévia ao vivo;
- cabeçalhos, parágrafos, separadores e blocos de destaque;
- upload e inserção de imagens e vídeos;
- vídeos do YouTube;
- botões de ação e links de WhatsApp;
- tabelas de produtos, planos e preços;
- chatbot conectado ao conteúdo da página e ao agente do cliente;
- templates por segmento de negócio;
- edição integral de uma página publicada, preservando seu proprietário;
- visualização desktop e mobile antes de abrir o link público.

O conteúdo usa uma sintaxe Markdown enriquecida e blocos visuais. O cliente não
precisa editar HTML para publicar uma página.

### English

In **Publish Public Page**, customers get a visual workflow for building and
publishing a public page:

- title, slug, and structured content;
- scrollable content editor with live preview;
- headings, paragraphs, dividers, and highlighted sections;
- image and video upload and insertion;
- YouTube videos;
- action buttons and WhatsApp links;
- product, plan, and pricing tables;
- a chatbot grounded in the page and the customer's agent;
- business-segment templates;
- full editing of an existing page while preserving ownership;
- desktop and mobile preview before opening the public link.

The editor uses enriched Markdown and visual blocks. Customers do not need to
write HTML to publish a page.

## 🧭 Sessões principais | Main sessions

### S1 — Login e onboarding | Login and onboarding

```text
Google Identity Services
				|
				v
POST /api/access/verify
				|
				+--> authorized=true  -> workspace do cliente
				|
				+--> admin=true       -> administração do sistema
				|
				+--> authorized=false -> pedido de acesso para aprovação
```

Resultado para o cliente: acesso controlado por identidade e aprovação.
Customer outcome: controlled access through identity and approval.

### S2 — Construção com Alia e Alex | Building with Alia and Alex

```text
Cliente: "Quero um agente para atender pedidos da minha loja."
Alia: descobre usuários, objetivo, entradas, saídas e limites.
Alex: transforma requisitos aprovados em uma solução executável.
```

Resultado: uma conversa vira requisitos organizados e um próximo passo técnico.
Outcome: a conversation becomes organized requirements and an actionable
technical next step.

### S3 — Agente exclusivo do cliente | Customer-owned agent

```json
{
	"name": "Assistente de vendas",
	"role": "Responder dúvidas sobre catálogo e oferta",
	"ownerEmail": "cliente@exemplo.com"
}
```

O backend filtra agentes por `ownerEmail`; somente o proprietário ou o
administrador pode removê-los.

The backend filters agents by `ownerEmail`; only the owner or administrator can
remove them.

### S4 — Pipeline de tela dinâmica | Dynamic screen pipeline

```json
{
	"title": "Cadastro de clientes",
	"fields": [
		{"name": "name", "label": "Nome", "type": "text"},
		{"name": "message", "label": "Mensagem", "type": "textarea"}
	],
	"submitAction": "Cadastro recebido"
}
```

O endpoint `POST /api/pipeline/run` devolve a tela dinâmica compilada para o
workspace.

`POST /api/pipeline/run` returns the compiled dynamic screen for the workspace.

### S5 — Agente de páginas | Page agent

```text
Cliente: "Crie uma página para meu bolo de chocolate por R$ 45."
Agente: action=create, slug=bolo-chocolate, title e conteúdo em Markdown.
Resultado: /public/bolo-chocolate
```

O agente suporta `create`, `update`, `delete`, `list` e `search`.

The page agent supports `create`, `update`, `delete`, `list`, and `search`.

### S6 — RAG e Fonte da Verdade | RAG and source of truth

```text
POST /api/upload
	-> arquivo salvo em rag/documents
	-> texto extraído com Apache Tika
	-> metadados gravados em .meta.json
	-> agente consulta o contexto autorizado
```

Resultado: respostas mais contextualizadas usando documentos do negócio.
Outcome: more contextual answers grounded in business documents.

### S7 — Estúdio de páginas | Page studio

```text
Título + conteúdo
				+ fotos e vídeos
				+ tabela de preços
				+ CTA / WhatsApp
				+ chatbot do agente
				v
Prévia desktop/mobile -> Publicar -> /public/{slug}
```

Resultado: o cliente constrói uma página comercial sem depender de uma agência
para cada alteração.

Outcome: customers can build and update a commercial page without relying on an
agency for every change.

### S8 — Observabilidade | Observability

O administrador pode acompanhar o monitor de pipeline e consultar o health
check da aplicação. O backend expõe métricas e estado por Actuator.

Administrators can use the pipeline monitor and application health check. The
backend exposes status and health through Actuator.

## 🏗️ Arquitetura | Architecture

```text
Cliente / Agente IA
				|
				v
PublicPageController ou ProductPageAgentController
				|
				v
PageCommandService
				|
				+--> db/public_pages.json  (fonte da verdade)
				|
				+--> evento upsert/delete
										|
										v
					PageProjectionPublisher
										|
										v
							Elasticsearch
										|
										v
							PageQueryService
										|
										+--> /public/{slug}
										+--> fallback para JSON se ES estiver indisponível
```

### Português

O lado de escrita nunca depende do Elasticsearch: grava primeiro na fonte da
verdade e publica um evento para a projeção. O lado de leitura consulta o índice
quando disponível e retorna ao JSON quando necessário.

### English

The write side never depends on Elasticsearch: it writes to the source of truth
first and publishes an event to the projection. The read side uses the index
when available and falls back to JSON when needed.

## 🧱 Stack | Technology stack

- Java 25 LTS
- Spring Boot 3.5.12
- Maven
- Spring Boot static frontend
- Ollama
- Elasticsearch 8.15.3
- Apache Tika 2.9.0
- Docker Compose
- JSON persistence for local ownership and access data

## 🚀 Início rápido | Quick start

### Português

Requisitos: Linux para instalação automática, Docker para o modo padrão e um
JDK 25 para execução local.

```bash
# Instalar dependências do sistema no Linux
./alex.sh --install-system-deps

# Iniciar em Docker (modo padrão)
./alex.sh

# Executar Java e Ollama diretamente no sistema
./alex.sh --local
```

O serviço fica disponível em `http://localhost:8080`. Para operação manual:

```bash
./admin.sh start
./admin.sh status
./admin.sh stop
```

### English

Requirements: Linux for automatic installation, Docker for the default mode,
and JDK 25 for local execution.

```bash
# Install system dependencies on Linux
./alex.sh --install-system-deps

# Start with Docker (default mode)
./alex.sh

# Run Java and Ollama directly on the host
./alex.sh --local
```

The service is available at `http://localhost:8080`. For manual operations:

```bash
./admin.sh start
./admin.sh status
./admin.sh stop
```

## ⚙️ Configuração | Configuration

Variáveis principais / Main variables:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `8080` | Porta HTTP do backend / backend HTTP port |
| `OLLAMA_URL` | `http://localhost:11434` | URL do Ollama |
| `OLLAMA_MODEL` | `qwen2.5-coder:7b` | Modelo principal |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | URL do Elasticsearch |
| `ELASTICSEARCH_ENABLED` | `true` | Ativa a projeção de leitura |
| `OLLAMA_WARMUP_ENABLED` | `true` | Pré-aquecimento do modelo |
| `USER_DB_PATH` | `db/users.json` | Usuários autorizados |
| `PUBLIC_PAGE_DB_PATH` | `db/public_pages.json` | Páginas públicas |
| `PUBLIC_MEDIA_DIR` | `db/public_media` | Fotos e vídeos publicados |

### Administração | Administration

O administrador padrão desta versão é `asizaguirre@gmail.com`. Os demais
usuários cadastrados são clientes. O backend aplica essa regra fixa para evitar
que uma configuração externa promova clientes indevidamente.

The default administrator for this version is `asizaguirre@gmail.com`. Other
registered users are customers. The backend enforces this fixed rule so an
external configuration cannot accidentally promote customers.

Os clientes autorizados ficam em `db/users.json`. Solicitações pendentes ficam
em `db/access_requests.json`.

Authorized customers are stored in `db/users.json`. Pending requests are stored
in `db/access_requests.json`.

## 🔐 Ownership e segurança | Ownership and security

- Cada página recebe `ownerEmail` no momento da criação.
- Listagens de clientes filtram por `ownerEmail`.
- Atualização e exclusão exigem que o solicitante seja o proprietário ou o administrador.
- Agentes customizados seguem a mesma regra de propriedade.
- Páginas públicas podem ser visualizadas pelo link sem login.
- Dados persistentes ficam em diretórios locais ou volumes Docker configurados.

Every page receives an `ownerEmail` at creation time. Customer lists are filtered
by ownership, and updates or deletes require the owner or administrator. Custom
agents follow the same ownership rule. Public pages are viewable by link without
login, while persistent data remains in configured local directories or Docker
volumes.

Para produção, configure seu próprio Google Client ID, restrinja as origens no
Google Cloud Console e proteja o acesso aos arquivos persistentes.

For production, configure your own Google Client ID, restrict authorized origins
in Google Cloud Console, and protect access to persistent files.

## 📁 Estrutura do projeto | Project structure

```text
backend/
	src/main/java/com/alexai/platform/
		controller/     # REST API e páginas públicas
		cqrs/           # comandos, projeção e consultas
		service/        # agentes, acesso e regras de negócio
		client/         # cliente Ollama e warmup
	src/main/resources/static/  # frontend do workspace
db/                 # usuários, páginas e mídia pública
rag/                # documentos e motor RAG
config/             # templates de configuração
docs/               # arquitetura e guias
scripts/            # setup e túnel
```

## 🧪 Verificação | Verification

```bash
# Compilar o backend sem executar testes
export JAVA_HOME=/home/alam/.jdk/jdk-25.0.2
export PATH="$JAVA_HOME/bin:$PATH"
mvn -B -DskipTests package -f backend/pom.xml

# Conferir saúde do serviço
curl http://localhost:8080/actuator/health
```

Expected health response / Resposta esperada:

```json
{"status":"UP"}
```

## 📚 Documentação complementar | Further documentation

- [Arquitetura CQRS](docs/ARQUITETURA-CQRS.md)
- [Guia de páginas web para leigos](docs/GUIA-PAGINA-WEB-PARA-LEIGOS.md)
- [Política de segurança e controle do repositório](SECURITY.md)
- [Deploy no Render](RENDER_DEPLOY.md)
- [Configuração do WireGuard](RENDER_WIREGUARD_CONFIG.md)

## 💬 Quer usar no seu negócio? | Want to use it in your business?

### Português

1. Entre com sua conta Google ou solicite acesso.
2. Aguarde a aprovação do administrador.
3. Construa seu agente e sua primeira página pública.
4. Compartilhe o link com seus clientes.

Ideal para restaurantes, imobiliárias, clínicas, lojas, consultorias, cursos e
serviços profissionais.

### English

1. Sign in with Google or request access.
2. Wait for administrator approval.
3. Build your agent and first public page.
4. Share the link with your customers.

Suitable for restaurants, real estate, clinics, stores, consultancies, courses,
and professional services.

---

**AlEx Platform v3** — self-hosted, customer-owned data, and a workspace built
to turn ideas into useful digital experiences.
**AlEx Platform v3** — self-hosted, customer-owned data, and a workspace built
to turn ideas into useful digital experiences.
