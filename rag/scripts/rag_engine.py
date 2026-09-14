#!/usr/bin/env python3
"""
RAG Engine otimizado para RTX 3050 8GB + Ollama
Projeto: alex-platform-v2
"""

from pathlib import Path
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    DirectoryLoader,
    PyPDFLoader,
    TextLoader,
    UnstructuredWordDocumentLoader,
)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document

BASE_DIR = Path(__file__).parent.parent.parent
DOCS_DIR = BASE_DIR / "data" / "docs"
VECTORSTORE_DIR = BASE_DIR / "rag" / "vectorstore"

LLM_MODEL = "qwen2.5:7b-instruct-q4_K_M"
EMBEDDING_MODEL = "nomic-embed-text"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

def get_llm(temperature: float = 0.2):
    return ChatOllama(model=LLM_MODEL, temperature=temperature, num_ctx=8192)

def get_embeddings():
    return OllamaEmbeddings(model=EMBEDDING_MODEL)

def load_documents(docs_path: Path = DOCS_DIR) -> list[Document]:
    if not docs_path.exists():
        docs_path.mkdir(parents=True, exist_ok=True)
        print(f"Pasta criada: {docs_path}")
        print("Coloque seus documentos (PDF, TXT, MD, DOCX) nessa pasta.")
        return []

    loaders = [
        DirectoryLoader(str(docs_path), glob="**/*.pdf", loader_cls=PyPDFLoader),
        DirectoryLoader(str(docs_path), glob="**/*.txt", loader_cls=TextLoader),
        DirectoryLoader(str(docs_path), glob="**/*.md", loader_cls=TextLoader),
        DirectoryLoader(str(docs_path), glob="**/*.docx", loader_cls=UnstructuredWordDocumentLoader),
    ]

    documents = []
    for loader in loaders:
        try:
            docs = loader.load()
            documents.extend(docs)
            if docs:
                print(f"✓ Carregados {len(docs)} documentos ({loader.glob})")
        except Exception as e:
            print(f"Erro ao carregar {loader.glob}: {e}")

    return documents

def create_vectorstore(documents: list[Document], force_recreate: bool = False):
    embeddings = get_embeddings()

    if VECTORSTORE_DIR.exists() and not force_recreate:
        print("Carregando vectorstore existente...")
        return Chroma(persist_directory=str(VECTORSTORE_DIR), embedding_function=embeddings)

    if not documents:
        raise ValueError("Nenhum documento encontrado. Coloque arquivos em data/docs/")

    print(f"Indexando {len(documents)} documentos...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    splits = splitter.split_documents(documents)
    print(f"Total de chunks: {len(splits)}")

    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        persist_directory=str(VECTORSTORE_DIR),
    )
    print(f"Vectorstore salvo em: {VECTORSTORE_DIR}")
    return vectorstore

def build_rag_chain(vectorstore):
    llm = get_llm()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    template = """Você é um assistente especialista no projeto Alex Platform.
Use APENAS o contexto abaixo para responder.
Se a informação não estiver no contexto, diga claramente que não encontrou.

Contexto:
{context}

Pergunta: {question}

Resposta clara e objetiva:"""

    prompt = ChatPromptTemplate.from_template(template)

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain

def main():
    print("=" * 60)
    print("  RAG Engine - Alex Platform v3")
    print("=" * 60)

    documents = load_documents()
    vectorstore = create_vectorstore(documents, force_recreate=False)
    rag_chain = build_rag_chain(vectorstore)

    print("\nRAG pronto! Digite suas perguntas (ou 'sair' para terminar)\n")

    while True:
        question = input("Pergunta: ").strip()
        if question.lower() in ["sair", "exit", "quit", "q"]:
            break
        if not question:
            continue

        print("\nPensando...")
        answer = rag_chain.invoke(question)
        print(f"\nResposta:\n{answer}\n")
        print("-" * 60)

if __name__ == "__main__":
    main()
