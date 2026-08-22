# AlEx AI Platform v2

Enterprise AI Agent Platform.

## Stack

- Java 21
- Spring Boot 3.5
- Spring Boot static frontend
- Ollama
- Docker

## Architecture

Multi-agent AI platform with RAG and memory.

## Status

Under development.

## Como iniciar

Use um único ponto de entrada. Na primeira execução, instale as dependências
manualmente ou deixe o script fazê-lo em Linux:

```bash
./alex.sh --install-system-deps
```

O modo Docker é o padrão. Ele constrói o backend, inicia Ollama, baixa o
modelo dos agentes, o modelo do RAG e o modelo de embeddings, cria as pastas
persistentes, aguarda o health check e abre `http://localhost:8080` no
navegador:

```bash
./alex.sh
```

Para executar Java e Ollama diretamente no sistema:

```bash
./alex.sh --local
```

Os documentos do RAG ficam em `rag/documents`. A execução pode ser repetida;
Docker e Ollama preservam os dados e os modelos em volumes locais.
