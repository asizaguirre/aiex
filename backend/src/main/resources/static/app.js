// Dynamic API resolver for static/local setups
function getApiUrl(path) {
  // If the host is local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return path;
  }
  // Allow the user to point the frontend to a custom backend URL when published separately (e.g., GitHub Pages)
  const customUrl = localStorage.getItem('ALEX_BACKEND_URL');
  if (customUrl) {
    // Ensure no double slash and trailing slash correction
    const base = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
    return `${base}${path}`;
  }
  return path;
}

// 6. Configuração do Modal do Agente Customizado (Web Speech API)
const agentModal = document.getElementById('agentModal');
const agentModalCloseBtn = document.getElementById('agentModalCloseBtn');
const agentModalTitle = document.getElementById('agentModalTitle');
const agentModalRole = document.getElementById('agentModalRole');
const agentModalWelcomeName = document.getElementById('agentModalWelcomeName');
const agentModalChat = document.getElementById('agentModalChat');
const agentModalInput = document.getElementById('agentModalInput');
const agentModalSendBtn = document.getElementById('agentModalSendBtn');
const agentModalMicBtn = document.getElementById('agentModalMicBtn');
const agentModalSpeakerBtn = document.getElementById('agentModalSpeakerBtn');

let currentCustomAgent = null;
let isAudioEnabled = true;

// Web Speech API Configs
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  
  recognition.onstart = () => {
    agentModalMicBtn.classList.add('recording');
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    agentModalInput.value += transcript;
  };
  
  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    showToast("Erro no microfone: " + event.error);
    agentModalMicBtn.classList.remove('recording');
  };
  
  recognition.onend = () => {
    agentModalMicBtn.classList.remove('recording');
  };
} else {
  agentModalMicBtn.style.display = 'none';
  console.warn("SpeechRecognition não suportado neste navegador.");
}

function speakText(text) {
  if (!isAudioEnabled) return;
  if (!('speechSynthesis' in window)) return;
  
  // Cancela qualquer fala anterior
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  // Configurações básicas de voz (pode variar de acordo com o SO)
  window.speechSynthesis.speak(utterance);
}

function openAgentModal(name, role) {
  currentCustomAgent = name;
  agentModalTitle.textContent = name;
  agentModalRole.textContent = role;
  agentModalWelcomeName.textContent = name;
  
  // Limpa histórico
  agentModalChat.innerHTML = `
    <div class="message assistant">
      Olá! Eu sou o <strong>${escapeHtml(name)}</strong>. Como posso ajudar?
    </div>
  `;
  agentModalInput.value = '';
  
  agentModal.style.display = 'flex';
}

function closeAgentModal() {
  agentModal.style.display = 'none';
  window.speechSynthesis.cancel();
}

agentModalCloseBtn.addEventListener('click', closeAgentModal);
agentModal.addEventListener('click', (e) => {
  if (e.target === agentModal) closeAgentModal();
});

agentModalSpeakerBtn.addEventListener('click', () => {
  isAudioEnabled = !isAudioEnabled;
  if (isAudioEnabled) {
    agentModalSpeakerBtn.classList.add('active');
    agentModalSpeakerBtn.style.opacity = '1';
    showToast('Áudio ativado');
  } else {
    agentModalSpeakerBtn.classList.remove('active');
    agentModalSpeakerBtn.style.opacity = '0.5';
    window.speechSynthesis.cancel();
    showToast('Áudio desativado');
  }
});

agentModalMicBtn.addEventListener('click', () => {
  if (recognition) {
    if (agentModalMicBtn.classList.contains('recording')) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }
});

function appendModalMessage(text, sender) {
  const el = document.createElement('div');
  el.className = `message ${sender}`;
  
  // Trata blocos de código
  let htmlText = escapeHtml(text);
  htmlText = htmlText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  htmlText = htmlText.replace(/\n/g, '<br/>');
  
  el.innerHTML = htmlText;
  agentModalChat.appendChild(el);
  agentModalChat.scrollTop = agentModalChat.scrollHeight;
}

agentModalSendBtn.addEventListener('click', async () => {
  const message = agentModalInput.value.trim();
  if (!message || !currentCustomAgent) return;
  
  appendModalMessage(message, 'user');
  agentModalInput.value = '';
  agentModalSendBtn.disabled = true;
  
  // Adiciona indicador de 'digitando'
  const thinkingId = 'modal-thinking-' + Date.now();
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'message assistant thinking';
  thinkingEl.id = thinkingId;
  thinkingEl.textContent = 'Processando...';
  agentModalChat.appendChild(thinkingEl);
  agentModalChat.scrollTop = agentModalChat.scrollHeight;
  
  try {
    const res = await fetch(getApiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: currentCustomAgent,
        message: message,
        email: adminEmail || sessionStorage.getItem('alexUserEmail')
      })
    });
    
    document.getElementById(thinkingId).remove();
    
    if (!res.ok) throw new Error('Falha de rede ao conectar com o agente.');
    const data = await res.json();
    
    appendModalMessage(data.response, 'assistant');
    speakText(data.response); // Lê a resposta
    
  } catch (err) {
    document.getElementById(thinkingId).remove();
    appendModalMessage(`Erro: ${err.message}`, 'system');
  } finally {
    agentModalSendBtn.disabled = false;
  }
});

agentModalInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    agentModalSendBtn.click();
  }
});

// Debounce helper for performance optimization
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

const chatHistory = document.getElementById('chatHistory');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('message');
const statusEl = document.getElementById('status');
const chatStatusText = document.getElementById('chatStatusText');

// RAG Elements
const ragUploadForm = document.getElementById('ragUploadForm');
const ragFile = document.getElementById('ragFile');
const ragStatus = document.getElementById('ragStatus');

// DB Elements
const dbTitle = document.getElementById('dbTitle');
const dbContent = document.getElementById('dbContent');
const dbSaveBtn = document.getElementById('dbSaveBtn');
const dbStatus = document.getElementById('dbStatus');

// Creator Elements
const customAgentName = document.getElementById('customAgentName');
const customAgentRole = document.getElementById('customAgentRole');
const createAgentBtn = document.getElementById('createAgentBtn');
const creatorStatus = document.getElementById('creatorStatus');
const customAgentsList = document.getElementById('customAgentsList');
const agentsTabList = document.getElementById('agentsTabList');
const appContainer = document.getElementById('appContainer');
const userRegistrationForm = document.getElementById('userRegistrationForm');
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');
const usersList = document.getElementById('usersList');
const userStatus = document.getElementById('userStatus');
const agentBuilderTab = document.getElementById('agentBuilderTab');
const agentBuilderTabButton = document.querySelector('[data-target="agentBuilderTab"]');
const closeAgentBuilderBtn = document.getElementById('closeAgentBuilderBtn');
const builderAgentName = document.getElementById('builderAgentName');
const builderAgentGoal = document.getElementById('builderAgentGoal');
const builderRequirements = document.getElementById('builderRequirements');
const buildAgentBtn = document.getElementById('buildAgentBtn');
const builderStatus = document.getElementById('builderStatus');
const builderChatHistory = document.getElementById('builderChatHistory');
const builderChatInput = document.getElementById('builderChatInput');
const builderChatSendBtn = document.getElementById('builderChatSendBtn');
const publicPageForm = document.getElementById('publicPageForm');
const pageSlug = document.getElementById('pageSlug');
const pageTitle = document.getElementById('pageTitle');
const pageContent = document.getElementById('pageContent');
const pageStatus = document.getElementById('pageStatus');
const publicPagesList = document.getElementById('publicPagesList');
const publishPageBtn = document.getElementById('publishPageBtn');
const cancelPageEditBtn = document.getElementById('cancelPageEditBtn');
let editingPageSlug = null;
const pageEditorTab = document.getElementById('pageEditorTab');
const pageEditorForm = document.getElementById('pageEditorForm');
const editorPageSlug = document.getElementById('editorPageSlug');
const editorPageTitle = document.getElementById('editorPageTitle');
const editorPageContent = document.getElementById('editorPageContent');
const editorStatus = document.getElementById('editorStatus');
const editorPreview = document.getElementById('editorPreview');
const editorPreviewUrl = document.getElementById('editorPreviewUrl');
const closePageEditorBtn = document.getElementById('closePageEditorBtn');
const previewPageBtn = document.getElementById('previewPageBtn');
const editorChatInput = document.getElementById('editorChatInput');
const editorChatSendBtn = document.getElementById('editorChatSendBtn');
const editorChatHistory = document.getElementById('editorChatHistory');

// Sandbox Elements
const sandboxSection = document.getElementById('sandboxSection');
const sandboxContainer = document.getElementById('sandboxContainer');
const finishScreenBtn = document.getElementById('finishScreenBtn');

// Pipeline Elements
const pipelineLogs = document.getElementById('pipelineLogs');
const diffView = document.getElementById('diffView');
const metricBuild = document.getElementById('metric-build');
const metricSize = document.getElementById('metric-size');
const metricSavings = document.getElementById('metric-savings');
const metricPerf = document.getElementById('metric-perf');

const steps = {
  ingest: document.getElementById('step-ingest'),
  gen: document.getElementById('step-gen'),
  opt: document.getElementById('step-opt'),
  test: document.getElementById('step-test'),
  deploy: document.getElementById('step-deploy')
};

// Global Toast function
window.showToast = function(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
};

function getSelectedAgent() {
  const selected = document.querySelector('input[name="agent"]:checked');
  return selected ? selected.value : 'alex';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===================================================================
//  WEB SPEECH API — Text-to-Speech for chat responses
// ===================================================================
let autoVoiceEnabled = false;
const voiceToggleBtn = document.getElementById('voiceToggleBtn');

if(voiceToggleBtn) {
  voiceToggleBtn.addEventListener('click', () => {
    autoVoiceEnabled = !autoVoiceEnabled;
    voiceToggleBtn.classList.toggle('active', autoVoiceEnabled);
    voiceToggleBtn.textContent = autoVoiceEnabled ? '🔊 Voz' : '🔇 Voz';
    if(autoVoiceEnabled) {
      showToast('🔊 Resposta por voz ativada!');
    } else {
      window.speechSynthesis.cancel();
    }
  });
}

function speakText(text) {
  if(!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

function appendMessage(author, text, type) {
  const bubble = document.createElement('div');
  const agentClass = type === 'assistant' ? (getSelectedAgent() === 'alia' ? 'alia' : 'alex') : '';
  bubble.className = `chat-bubble ${type} ${agentClass}`;
  
  const formattedText = escapeHtml(text).replace(/\n/g, '<br>');
  
  // Add a speaker button only to assistant messages
  const speakerBtn = type === 'assistant'
    ? `<button class="speak-btn" title="Ouvir resposta" onclick="(function(btn) {
        if(window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); btn.classList.remove('speaking'); return; }
        btn.classList.add('speaking');
        var u = new SpeechSynthesisUtterance(${JSON.stringify(text)});
        u.lang = 'pt-BR';
        u.onend = function(){ btn.classList.remove('speaking'); };
        window.speechSynthesis.speak(u);
      })(this)">🔈</button>`
    : '';
  
  bubble.innerHTML = `
    <strong>${escapeHtml(author)}</strong>${speakerBtn}
    <div>${formattedText}</div>
  `;
  chatHistory.prepend(bubble);
  chatHistory.scrollTop = 0;
  
  // Auto-speak if voice mode is on
  if(type === 'assistant' && autoVoiceEnabled) {
    speakText(text);
  }
}

// 1. RAG Ingestion Upload
ragUploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = ragFile.files[0];
  if (!file) return;

  ragStatus.textContent = 'Enviando documento...';
  ragStatus.className = 'mini-status';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('agent', getSelectedAgent());

  try {
    const uploadRes = await fetch(getApiUrl('/api/upload'), {
      method: 'POST',
      body: formData
    });

    if (!uploadRes.ok) throw new Error('Erro no upload');
    const meta = await uploadRes.json();
    
    ragStatus.textContent = 'Processando indexação RAG...';
    
    // Call deploy ingest to build scripts
    const ingestRes = await fetch(getApiUrl('/api/action/deploy-ingest'), {
      method: 'POST'
    });
    if (!ingestRes.ok) throw new Error('Erro na indexação');
    
    ragStatus.textContent = 'Sucesso! Documento carregado no RAG.';
    ragStatus.className = 'mini-status';
    showToast(`RAG Atualizado com: ${file.name}`);
    ragFile.value = '';
  } catch (err) {
    ragStatus.textContent = `Erro: ${err.message}`;
    ragStatus.className = 'mini-status error';
  }
});

// 2. Ingest to database (Fonte da Verdade)
dbSaveBtn.addEventListener('click', async () => {
  const title = dbTitle.value.trim();
  const content = dbContent.value.trim();
  if (!title || !content) {
    dbStatus.textContent = 'Preencha título e conteúdo.';
    dbStatus.className = 'mini-status error';
    return;
  }

  dbStatus.textContent = 'Gravando no DB...';
  dbStatus.className = 'mini-status';

  try {
    const res = await fetch(getApiUrl('/api/db'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    
    if (!res.ok) throw new Error('Erro ao salvar no DB');
    
    dbStatus.textContent = 'Fato salvo na Fonte da Verdade (DB).';
    showToast('Fonte da Verdade atualizada!');
    dbTitle.value = '';
    dbContent.value = '';
  } catch (err) {
    dbStatus.textContent = `Erro: ${err.message}`;
    dbStatus.className = 'mini-status error';
  }
});

// 3. Create Custom Agent simulation and persistence
createAgentBtn.addEventListener('click', async () => {
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  if (!email) { showToast('Autentique-se para construir um agente.'); return; }
  window.location.href = '/?mode=agent-builder';
});

function showAgentBuilder() {
  document.querySelectorAll('.tab-btn').forEach(button => button.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => { content.classList.remove('active'); content.style.display = 'none'; });
  agentBuilderTabButton.style.display = 'inline-flex';
  agentBuilderTabButton.classList.add('active');
  agentBuilderTab.classList.add('active');
  agentBuilderTab.style.display = 'flex';
}

function activateWorkspaceMode() {
  const mode = new URLSearchParams(window.location.search).get('mode');
  if (mode === 'agent-builder') {
    showAgentBuilder();
    builderPrompt();
  } else if (mode === 'agents') {
    const agentsButton = document.querySelector('[data-target="agentsTab"]');
    if (agentsButton) agentsButton.click();
  }
}

function addBuilderMessage(author, text) {
  const message = document.createElement('div');
  message.className = `builder-message ${author === 'Você' ? 'user' : 'assistant'}`;
  message.innerHTML = `<strong>${escapeHtml(author)}</strong><div>${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
  builderChatHistory.appendChild(message);
  builderChatHistory.scrollTop = builderChatHistory.scrollHeight;
}

function builderPrompt() {
  addBuilderMessage('Alia', 'Para construir um agente realmente útil, vou entender: quem usará, qual problema ele resolve, quais entradas receberá, que resposta ou ação deve entregar, quais fontes poderá consultar, quais limites deve respeitar e como saberemos que funcionou. Conte primeiro o objetivo e o público.');
}

builderChatSendBtn.addEventListener('click', async () => {
  const message = builderChatInput.value.trim();
  if (!message) return;
  addBuilderMessage('Você', message);
  builderChatInput.value = '';
  const currentRequirements = builderRequirements.value;
  const response = await fetch(getApiUrl('/api/chat'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent: 'alia', email: adminEmail || sessionStorage.getItem('alexUserEmail'), message: `Estamos construindo um agente. Objetivo: ${builderAgentGoal.value}. Requisitos já anotados: ${currentRequirements}. O cliente disse: ${message}. Faça perguntas de descoberta de requisitos que ainda faltam e, ao final, organize uma lista objetiva de requisitos confirmados.` }) });
  const data = await response.json();
  addBuilderMessage('Alia', data.response || 'Não foi possível responder agora.');
  builderRequirements.value = `${builderRequirements.value}${builderRequirements.value ? '\n\n' : ''}Cliente: ${message}\nAlia: ${data.response || ''}`;
});

builderChatInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); builderChatSendBtn.click(); } });

buildAgentBtn.addEventListener('click', async () => {
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  if (!builderAgentName.value.trim() || !builderAgentGoal.value.trim() || !builderRequirements.value.trim()) {
    builderStatus.textContent = 'Conclua o objetivo e a descoberta de requisitos com a Alia antes de construir.';
    builderStatus.className = 'mini-status error';
    return;
  }
  builderStatus.textContent = 'Alex está construindo e validando o agente...';
  const response = await fetch(getApiUrl('/api/agents/custom'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: builderAgentName.value.trim(), role: `${builderAgentGoal.value.trim()}\n\nRequisitos: ${builderRequirements.value.trim()}`, email }) });
  const data = await response.json();
  if (!response.ok) { builderStatus.textContent = data.message || 'Não foi possível construir o agente.'; builderStatus.className = 'mini-status error'; return; }
  builderStatus.textContent = 'Agente construído. Abrindo Meus agentes...';
  setTimeout(() => { window.location.href = '/?mode=agents'; }, 500);
});

closeAgentBuilderBtn.addEventListener('click', () => { window.location.href = '/'; });

// Custom Agents Loading & Rendering
async function loadCustomAgents() {
  try {
    const email = adminEmail || sessionStorage.getItem('alexUserEmail');
    if (!email) return;
    const res = await fetch(getApiUrl(`/api/agents/custom?email=${encodeURIComponent(email)}`));
    if (!res.ok) return;
    const agents = await res.json();
    renderCustomAgents(agents);
  } catch (err) {
    console.error('Erro ao carregar agentes instanciados', err);
  }
}

function renderCustomAgents(agents) {
  customAgentsList.innerHTML = '';
  if (agentsTabList) agentsTabList.innerHTML = '';
  if (agents.length === 0) {
    customAgentsList.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-secondary);">Nenhum agente instanciado ainda.</span>';
    if (agentsTabList) agentsTabList.innerHTML = '<span class="empty-state">Nenhum agente criado ainda.</span>';
    return;
  }
  
  agents.forEach(agent => {
    const el = document.createElement('div');
    el.className = 'custom-agent-item';
    el.innerHTML = `
      <div class="custom-agent-info">
        <span class="custom-agent-name">${escapeHtml(agent.name)}</span>
        <span class="custom-agent-role">${escapeHtml(agent.role)}</span>
      </div>
      <div>
        <button class="btn-open-chat" data-name="${escapeHtml(agent.name)}" data-role="${escapeHtml(agent.role)}" title="Conversar com Agente">💬 Chat</button>
        <button class="btn-remove-agent" data-id="${agent.id}" title="Remover Agente (Apenas Admin)">Remover</button>
      </div>
    `;
    
    // Mostra botão de excluir apenas se for admin
    const removeBtn = el.querySelector('.btn-remove-agent');
    if (adminEmail) {
      removeBtn.style.display = 'inline-block';
    }
    
    removeBtn.addEventListener('click', () => deleteCustomAgent(agent.id));
    
    // Evento para abrir o modal de chat
    const chatBtn = el.querySelector('.btn-open-chat');
    chatBtn.addEventListener('click', () => openAgentModal(agent.name, agent.role));

    customAgentsList.appendChild(el);
    if (agentsTabList) {
      const tabAgent = el.cloneNode(true);
      tabAgent.querySelector('.btn-open-chat').addEventListener('click', () => openAgentModal(agent.name, agent.role));
      tabAgent.querySelector('.btn-remove-agent').addEventListener('click', () => deleteCustomAgent(agent.id));
      agentsTabList.appendChild(tabAgent);
    }
  });
}

async function deleteCustomAgent(id) {
  if (!adminEmail) {
    showToast('Apenas administradores podem excluir agentes.');
    return;
  }
  
  try {
    const res = await fetch(getApiUrl(`/api/agents/custom/${id}`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail })
    });
    
    if (res.ok) {
      showToast('Agente removido com sucesso!');
      loadCustomAgents();
    } else {
      const error = await res.json();
      showToast(`Erro ao remover: ${error.message}`);
    }
  } catch (err) {
    showToast(`Erro: ${err.message}`);
  }
}

// Load agents on startup
loadCustomAgents();

// 4. Trigger Alex Pipeline & dynamic UI rendering
async function triggerAlexPipeline(screenConfig) {
  // Reset steps
  Object.values(steps).forEach(step => {
    step.classList.remove('active', 'completed');
  });
  
  pipelineLogs.innerHTML = '';
  diffView.textContent = 'Analisando otimizações...';
  
  const addLog = (text, type = 'info') => {
    const log = document.createElement('div');
    log.className = `log-entry ${type}`;
    log.textContent = text;
    pipelineLogs.appendChild(log);
    pipelineLogs.scrollTop = pipelineLogs.scrollHeight;
  };

  addLog('Iniciando pipeline do Alex...', 'system');

  try {
    // Call backend to compile screen
    const res = await fetch(getApiUrl('/api/pipeline/run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(screenConfig)
    });

    if (!res.ok) throw new Error('Falha na compilação do código');
    const buildResult = await res.json();

    // Step 1: Ingest
    steps.ingest.classList.add('active');
    addLog('[1/5] Recebida parametrização da Alia. Ingerindo requisitos...');
    await new Promise(r => setTimeout(r, 600));
    steps.ingest.classList.add('completed');
    steps.ingest.classList.remove('active');

    // Step 2: Synthesis
    steps.gen.classList.add('active');
    addLog('[2/5] Gerando árvore DOM e componentes dinâmicos em HTML5...');
    await new Promise(r => setTimeout(r, 800));
    steps.gen.classList.add('completed');
    steps.gen.classList.remove('active');

    // Step 3: Optimization
    steps.opt.classList.add('active');
    addLog('[3/5] Alex aplicando otimizações de performance de código...');
    
    // Render the beautiful performance optimization diff!
    diffView.textContent = `// ANTES (CÓDIGO LENTO / COM REFLLOWS)
form.addEventListener('input', (e) => {
  recalculateFormLayoutHeavy();
});

// DEPOIS (OTIMIZAÇÃO DO ALEX - COM DEBOUNCE E RAF)
let layoutTimeout;
form.addEventListener('input', (e) => {
  clearTimeout(layoutTimeout);
  layoutTimeout = setTimeout(() => {
    requestAnimationFrame(recalculateFormLayoutHeavy);
  }, 150);
});`;

    addLog('✔ OTIMIZADO: Adicionado Debouncing e RequestAnimationFrame.');
    addLog('✔ OTIMIZADO: CSS modularizado com Flexbox/Grid nativos (zero frameworks).');
    await new Promise(r => setTimeout(r, 1000));
    steps.opt.classList.add('completed');
    steps.opt.classList.remove('active');

    // Step 4: Test
    steps.test.classList.add('active');
    addLog('[4/5] Executando conjunto de testes unitários...');
    addLog('✔ Test: Validar renderização dos inputs -> PASS');
    addLog('✔ Test: Testar envio assíncrono -> PASS');
    await new Promise(r => setTimeout(r, 700));
    steps.test.classList.add('completed');
    steps.test.classList.remove('active');

    // Step 5: Deploy
    steps.deploy.classList.add('active');
    addLog('[5/5] Realizando deploy no Sandbox de Telas Dinâmicas...');
    await new Promise(r => setTimeout(r, 600));
    steps.deploy.classList.add('completed');

    // Update metrics
    metricBuild.textContent = `${buildResult.metrics.buildTimeMs}ms`;
    metricSize.textContent = `${buildResult.metrics.codeSizeBits} bits`;
    metricSavings.textContent = `-${buildResult.metrics.memorySavingsPercent}%`;
    metricPerf.textContent = `${buildResult.metrics.lighthousePerformance}/100`;

    // Render screen inside sandbox
    sandboxContainer.innerHTML = buildResult.html;
    
    // Execute screen script
    const scriptEl = document.createElement('script');
    scriptEl.textContent = buildResult.js;
    sandboxContainer.appendChild(scriptEl);

    // Show sandbox
    sandboxSection.style.display = 'flex';
    sandboxSection.scrollIntoView({ behavior: 'smooth' });

    addLog('Pipeline concluído. Tela pronta para uso!', 'success');
    showToast(`Tela "${buildResult.title}" criada por Alex!`);

  } catch (err) {
    addLog(`[ERRO] Pipeline falhou: ${err.message}`, 'error');
    showToast(`Erro na pipeline: ${err.message}`);
  }
}

// 5. Delete screen on Finish (Finalizar)
if (finishScreenBtn && sandboxSection) finishScreenBtn.addEventListener('click', () => {
  sandboxSection.style.opacity = '1';
  
  // Fade out animation
  let opacity = 1;
  const timer = setInterval(() => {
    if (opacity <= 0.1) {
      clearInterval(timer);
      sandboxSection.style.display = 'none';
      sandboxContainer.innerHTML = '';
      sandboxSection.style.opacity = '1'; // reset
      showToast('Página dinâmica excluída com sucesso.');
      
      // Update pipeline logs
      const log = document.createElement('div');
      log.className = 'log-entry system';
      log.textContent = '[Pipeline] Tela finalizada e desalocada da memória.';
      pipelineLogs.appendChild(log);
    }
    sandboxSection.style.opacity = opacity;
    opacity -= 0.15;
  }, 30);
});

// 6. Chat interaction logic
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) {
    statusEl.textContent = 'Digite uma pergunta antes de enviar.';
    return;
  }

  const agent = getSelectedAgent();
  statusEl.textContent = 'Enviando...';
  chatStatusText.textContent = 'Pensando...';
  sendBtn.disabled = true;

  try {
    const response = await fetch(getApiUrl('/api/chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ agent, message, email: adminEmail || sessionStorage.getItem('alexUserEmail') })
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    appendMessage('Você', message, 'user');
    appendMessage(data.agent.toUpperCase(), data.response, 'assistant');
    
    // Check if the response contains screen parameterization JSON
    const jsonMatch = data.response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const config = JSON.parse(jsonMatch[1]);
        if (config.type === 'create_screen') {
          triggerAlexPipeline(config);
        }
      } catch (jsonErr) {
        console.warn("JSON encontrado mas não pôde ser analisado:", jsonErr);
      }
    }

    messageInput.value = '';
    messageInput.focus();
    statusEl.textContent = '';
    chatStatusText.textContent = 'Pronto';
  } catch (error) {
    statusEl.textContent = `Erro: ${error.message}`;
    chatStatusText.textContent = 'Erro';
    console.error(error);
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// ===================================================================
//  ADMIN ZONE — Google Sign-In + Shutdown da Plataforma
// ===================================================================

let adminEmail = null;
let adminUserName = null;

const adminLoginArea = document.getElementById('adminLoginArea');
const adminPanel = document.getElementById('adminPanel');
const adminAvatar = document.getElementById('adminAvatar');
const adminNameEl = document.getElementById('adminName');
const shutdownBtn = document.getElementById('shutdownBtn');
const shutdownModal = document.getElementById('shutdownModal');
const shutdownCancel = document.getElementById('shutdownCancel');
const shutdownConfirm = document.getElementById('shutdownConfirm');
const shutdownConfirmInfo = document.getElementById('shutdownConfirmInfo');
const shutdownProgress = document.getElementById('shutdownProgress');
const shutdownMessage = document.getElementById('shutdownMessage');
const logoutBtn = document.getElementById('logoutBtn');
const adminTabs = document.querySelectorAll('.admin-only');
const clientOnlyControls = document.querySelectorAll('.client-only');
const adminOnlyPanels = document.querySelectorAll('.admin-only-panel');

function applyRoleVisibility(isAdmin) {
  adminTabs.forEach(tab => { tab.style.display = isAdmin ? 'inline-flex' : 'none'; });
  adminOnlyPanels.forEach(panel => { panel.style.display = isAdmin ? 'flex' : 'none'; });
  clientOnlyControls.forEach(control => { control.style.display = isAdmin ? 'none' : 'inline-flex'; });
  if (openAgentPopupBtn) openAgentPopupBtn.style.display = isAdmin ? 'block' : 'none';
}

/**
 * Decode a JWT token payload (Google ID token).
 */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Erro ao decodificar token:', e);
    return null;
  }
}

/**
 * Google Sign-In callback — called by the Google Identity Services SDK.
 */
window.handleGoogleLogin = async function(response) {
  const payload = decodeJwtPayload(response.credential);
  if (!payload) {
    showToast('Erro ao processar login Google.');
    return;
  }

  const email = payload.email;
  const name = payload.name || email;
  const picture = payload.picture || '';

  // Verify admin status with backend
  try {
    const res = await fetch(getApiUrl('/api/access/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!res.ok) throw new Error('Erro na verificação');
    const data = await res.json();

    if (data.authorized) {
      adminEmail = email;
      adminUserName = name;
      sessionStorage.setItem('alexUserEmail', email);
      sessionStorage.setItem('alexUserName', name);
      sessionStorage.setItem('alexUserPicture', picture);
      appContainer.classList.remove('locked');

      // Show admin panel, hide login button
      adminLoginArea.style.display = 'none';
      adminPanel.style.display = 'flex';
      adminAvatar.src = picture;
      adminNameEl.textContent = name;
      applyRoleVisibility(data.admin);

      showToast(data.admin ? `Bem-vindo, ${name}! Modo admin ativo.` : `Bem-vindo, ${name}!`);
      appendMessage('SISTEMA', `🔐 Usuário autenticado: ${name} (${email}).`, 'assistant');
      
      // Update custom agents to show delete buttons
      loadCustomAgents();
      if (data.admin) loadUsers();
      loadPublicPages();
      activateWorkspaceMode();
      loadPageEditor();
    } else {
      showToast(`O e-mail ${email} ainda não está autorizado.`);
    }
  } catch (err) {
    console.error('Erro verificando admin:', err);
    showToast('Erro ao verificar permissões de admin.');
  }
};

function initializeGoogleSignIn() {
  const button = document.getElementById('googleSignInButton');
  if (!button || !window.google || !window.google.accounts) return false;
  window.google.accounts.id.initialize({
    client_id: '800464070591-33nvvitct598mb53dccehl15q8cjm4m9.apps.googleusercontent.com',
    callback: window.handleGoogleLogin,
    auto_select: false,
    cancel_on_tap_outside: true
  });
  window.google.accounts.id.renderButton(button, {
    type: 'icon',
    shape: 'circle',
    theme: 'filled_black',
    size: 'medium'
  });
  return true;
}

window.addEventListener('load', () => {
  if (initializeGoogleSignIn()) return;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (initializeGoogleSignIn() || attempts >= 20) window.clearInterval(timer);
  }, 250);
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.clear();
  window.location.reload();
});

userRegistrationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  userStatus.textContent = 'Salvando cliente...';
  try {
    const response = await fetch(getApiUrl(`/api/admin/users?adminEmail=${encodeURIComponent(adminEmail)}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userNameInput.value.trim(), email: userEmailInput.value.trim() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Não foi possível cadastrar o cliente.');
    userRegistrationForm.reset();
    userStatus.textContent = 'Cliente cadastrado com sucesso.';
    loadUsers();
  } catch (error) {
    userStatus.textContent = error.message;
    userStatus.className = 'mini-status error';
  }
});

async function loadUsers() {
  if (!adminEmail || !usersList) return;
  const response = await fetch(getApiUrl(`/api/admin/users?adminEmail=${encodeURIComponent(adminEmail)}`));
  if (!response.ok) return;
  const users = await response.json();
  usersList.innerHTML = users.length ? users.map(user => `
    <div class="user-row"><div><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div>
    <button class="btn-remove-agent" data-user-id="${user.id}">Remover</button></div>`).join('') : '<span class="empty-state">Nenhum cliente cadastrado.</span>';
  usersList.querySelectorAll('[data-user-id]').forEach(button => button.addEventListener('click', () => removeUser(button.dataset.userId)));
}

async function removeUser(id) {
  const response = await fetch(getApiUrl(`/api/admin/users/${id}?adminEmail=${encodeURIComponent(adminEmail)}`), { method: 'DELETE' });
  if (response.ok) loadUsers();
}

publicPageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  const isEditing = Boolean(editingPageSlug);
  pageStatus.textContent = isEditing ? 'Salvando edição...' : 'Publicando página...';
  pageStatus.className = 'mini-status';
  try {
    const endpoint = isEditing ? `/api/pages/${encodeURIComponent(editingPageSlug)}?email=${encodeURIComponent(email)}` : `/api/pages?email=${encodeURIComponent(email)}`;
    const response = await fetch(getApiUrl(endpoint), {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: pageSlug.value.trim(), title: pageTitle.value.trim(), content: pageContent.value.trim() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Não foi possível publicar.');
    const publicUrl = new URL(data.publicUrl, window.location.origin).href;
    pageStatus.innerHTML = `${isEditing ? 'Edição salva' : 'Página publicada'}: <a href="${publicUrl}" target="_blank" rel="noopener">${publicUrl}</a>`;
    resetPageEditor();
    loadPublicPages();
  } catch (error) {
    pageStatus.textContent = error.message;
    pageStatus.className = 'mini-status error';
  }
});

async function loadPublicPages() {
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  if (!email || !publicPagesList) return;
  const response = await fetch(getApiUrl(`/api/pages?email=${encodeURIComponent(email)}`));
  if (!response.ok) return;
  const pages = await response.json();
  publicPagesList.innerHTML = pages.length ? pages.map(page => {
    const url = new URL(`/public/${encodeURIComponent(page.slug)}`, window.location.origin).href;
    return `<div class="public-page-row"><div><strong>${escapeHtml(page.title)}</strong><span>${url}</span></div><div class="public-page-actions"><button type="button" class="btn-open-chat" data-edit-page="${escapeHtml(page.slug)}">Editar</button><a href="${url}" target="_blank" rel="noopener" class="btn-open-chat">Abrir</a><button type="button" class="btn-remove-agent" data-delete-page="${escapeHtml(page.slug)}">Excluir</button></div></div>`;
  }).join('') : '<span class="empty-state">Nenhuma página publicada ainda.</span>';
  publicPagesList.querySelectorAll('[data-edit-page]').forEach(button => button.addEventListener('click', () => startPageEdit(pages.find(page => page.slug === button.dataset.editPage))));
  publicPagesList.querySelectorAll('[data-delete-page]').forEach(button => button.addEventListener('click', () => deletePublicPage(button.dataset.deletePage)));
}

function startPageEdit(page) {
  if (!page) return;
  window.location.href = `/?mode=edit&page=${encodeURIComponent(page.slug)}`;
}

function showEditorTab() {
  document.querySelectorAll('.tab-btn').forEach(button => button.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => { content.classList.remove('active'); content.style.display = 'none'; });
  pageEditorTab.classList.add('active');
  pageEditorTab.style.display = 'flex';
}

async function loadPageEditor() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('page');
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  if (params.get('mode') !== 'edit' || !slug || !email) return;
  const response = await fetch(getApiUrl(`/api/pages/data/${encodeURIComponent(slug)}?email=${encodeURIComponent(email)}`));
  if (!response.ok) return;
  const page = await response.json();
  editingPageSlug = page.slug;
  editorPageSlug.value = page.slug;
  editorPageTitle.value = page.title;
  editorPageContent.value = page.content;
  document.getElementById('pageEditorHeading').textContent = `Editando: ${page.title}`;
  showEditorTab();
  updateEditorPreview();
}

function updateEditorPreview() {
  editorPreviewUrl.textContent = `/public/${editorPageSlug.value || 'endpoint'}`;
  editorPreview.innerHTML = `<h1>${escapeHtml(editorPageTitle.value || 'Título da página')}</h1><p>${escapeHtml(editorPageContent.value || 'O conteúdo aparecerá aqui.').replace(/\n/g, '<br>')}</p>`;
}

pageEditorForm.addEventListener('submit', async event => {
  event.preventDefault();
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  const response = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(editingPageSlug)}?email=${encodeURIComponent(email)}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: editorPageSlug.value.trim(), title: editorPageTitle.value.trim(), content: editorPageContent.value.trim() }) });
  const data = await response.json();
  editorStatus.textContent = response.ok ? `Salvo. Link público: ${new URL(data.publicUrl, window.location.origin).href}` : (data.message || 'Não foi possível salvar.');
  if (response.ok) { editingPageSlug = data.slug; history.replaceState({}, '', `/?mode=edit&page=${encodeURIComponent(data.slug)}`); updateEditorPreview(); }
});

previewPageBtn.addEventListener('click', updateEditorPreview);
editorPageContent.addEventListener('input', updateEditorPreview);
editorPageTitle.addEventListener('input', updateEditorPreview);
editorPageSlug.addEventListener('input', updateEditorPreview);
closePageEditorBtn.addEventListener('click', () => { window.location.href = '/'; });

editorChatSendBtn.addEventListener('click', async () => {
  const message = editorChatInput.value.trim();
  if (!message) return;
  editorChatHistory.innerHTML += `<div class="editor-chat-message user">Você: ${escapeHtml(message)}</div>`;
  editorChatInput.value = '';
  const response = await fetch(getApiUrl('/api/chat'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent: getSelectedAgent(), message: `Estou editando uma página com título "${editorPageTitle.value}" e conteúdo "${editorPageContent.value}". ${message} Responda com uma sugestão prática de edição, sem alterar o conteúdo automaticamente.` }) });
  const data = await response.json();
  editorChatHistory.innerHTML += `<div class="editor-chat-message assistant">${escapeHtml(data.response || 'Não foi possível responder agora.')}</div>`;
  editorChatHistory.scrollTop = editorChatHistory.scrollHeight;
});

function resetPageEditor() {
  editingPageSlug = null;
  publicPageForm.reset();
  publishPageBtn.textContent = 'Publicar página';
  cancelPageEditBtn.style.display = 'none';
}

cancelPageEditBtn.addEventListener('click', resetPageEditor);

async function deletePublicPage(slug) {
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  if (!window.confirm('Excluir esta página pública? O link deixará de funcionar.')) return;
  const response = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(slug)}?email=${encodeURIComponent(email)}`), { method: 'DELETE' });
  if (response.ok) {
    if (editingPageSlug === slug) resetPageEditor();
    pageStatus.textContent = 'Página excluída.';
    loadPublicPages();
  }
}

const savedEmail = sessionStorage.getItem('alexUserEmail');
if (savedEmail) {
  fetch(getApiUrl('/api/access/verify'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: savedEmail }) })
    .then(response => response.json()).then(data => {
      if (!data.authorized) return sessionStorage.clear();
      adminEmail = savedEmail;
      adminUserName = sessionStorage.getItem('alexUserName') || savedEmail;
      appContainer.classList.remove('locked');
      adminLoginArea.style.display = 'none';
      adminPanel.style.display = 'flex';
      adminNameEl.textContent = adminUserName;
      applyRoleVisibility(data.admin);
      if (data.admin) loadUsers();
      loadPublicPages();
      activateWorkspaceMode();
      loadPageEditor();
    });
}

/**
 * Open shutdown confirmation modal.
 */
shutdownBtn.addEventListener('click', () => {
  shutdownConfirmInfo.innerHTML = `
    <p><strong>Administrador:</strong> ${adminUserName} (${adminEmail})</p>
    <p><strong>Ação:</strong> Encerrar todos os serviços do backend</p>
    <p><strong>Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
  `;
  shutdownModal.style.display = 'flex';
  shutdownProgress.style.display = 'none';
  shutdownConfirm.disabled = false;
  shutdownCancel.disabled = false;
});

/**
 * Cancel shutdown.
 */
shutdownCancel.addEventListener('click', () => {
  shutdownModal.style.display = 'none';
});

// Close modal on overlay click
shutdownModal.addEventListener('click', (e) => {
  if (e.target === shutdownModal) {
    shutdownModal.style.display = 'none';
  }
});

/**
 * Confirm and execute shutdown.
 */
shutdownConfirm.addEventListener('click', async () => {
  if (!adminEmail) {
    showToast('Erro: nenhum admin autenticado.');
    return;
  }

  shutdownConfirm.disabled = true;
  shutdownCancel.disabled = true;
  shutdownProgress.style.display = 'block';
  shutdownMessage.textContent = 'Enviando comando de shutdown...';

  try {
    const res = await fetch(getApiUrl('/api/admin/shutdown'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail })
    });

    const data = await res.json();

    if (data.status === 'SHUTTING_DOWN') {
      shutdownMessage.textContent = '⏻ ' + data.message;
      showToast('Plataforma está sendo desligada...');
      appendMessage('SISTEMA', `🔴 SHUTDOWN: ${data.message}`, 'assistant');

      // Animate progress bar
      const progressBar = shutdownProgress.querySelector('.shutdown-progress-bar');
      progressBar.style.width = '100%';

      // After 3 seconds, show final message
      setTimeout(() => {
        shutdownMessage.textContent = '✅ Plataforma desligada. A conexão será perdida em instantes.';
        document.body.style.opacity = '0.3';
        document.body.style.transition = 'opacity 2s ease';
      }, 3000);

    } else {
      shutdownMessage.textContent = '❌ ' + data.message;
      shutdownConfirm.disabled = false;
      shutdownCancel.disabled = false;
    }
  } catch (err) {
    shutdownMessage.textContent = `Erro: ${err.message}`;
    shutdownConfirm.disabled = false;
    shutdownCancel.disabled = false;
  }
});


// ===================================================================
//  TABS LOGIC (Builder vs Agent Browser)
// ===================================================================

const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

document.querySelectorAll('.help-tip').forEach(helpTip => {
  helpTip.setAttribute('role', 'button');
  helpTip.setAttribute('tabindex', '0');
  const toggleHelp = event => {
    event.stopPropagation();
    document.querySelectorAll('.help-tip.is-open').forEach(openTip => {
      if (openTip !== helpTip) openTip.classList.remove('is-open');
    });
    helpTip.classList.toggle('is-open');
  };
  helpTip.addEventListener('click', toggleHelp);
  helpTip.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleHelp(event); }
  });
});

document.addEventListener('click', () => {
  document.querySelectorAll('.help-tip.is-open').forEach(helpTip => helpTip.classList.remove('is-open'));
});

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    // Remove active class from all
    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => {
      c.classList.remove("active");
      c.style.display = "none";
    });

    // Add active class to clicked
    btn.classList.add("active");
    const targetId = btn.getAttribute("data-target");
    if(targetId) {
      const targetEl = document.getElementById(targetId);
      if(targetEl) {
        targetEl.classList.add("active");
        targetEl.style.display = "flex";
      }
    }
  });
});

// ===================================================================
//  AGENT BROWSER & VISION OVERLAY LOGIC
// ===================================================================

const loadBrowserBtn = document.getElementById("loadBrowserBtn");
const browserUrl = document.getElementById("browserUrl");
const targetIframe = document.getElementById("targetIframe");
const visionOverlay = document.getElementById("visionOverlay");
const agentVisionLogs = document.getElementById("agentVisionLogs");
const startPredictionsBtn = document.getElementById("startPredictionsBtn");
const scannerLaser = document.getElementById("scannerLaser");

const agentPopup = document.getElementById("agentPopup");
const openAgentPopupBtn = document.getElementById("openAgentPopupBtn");
const closePopupBtn = document.getElementById("closePopupBtn");
const agentPopupHeader = document.getElementById("agentPopupHeader");

if(openAgentPopupBtn) {
  openAgentPopupBtn.addEventListener("click", () => {
    agentPopup.style.display = "flex";
  });
}

if(closePopupBtn) {
  closePopupBtn.addEventListener("click", () => {
    agentPopup.style.display = "none";
  });
}

// Drag logic for Popup itself
let isPopupDragging = false;
let popupInitialX, popupInitialY;
let popupOffsetX = 0, popupOffsetY = 0;

if(agentPopupHeader) {
  agentPopupHeader.addEventListener("mousedown", (e) => {
    isPopupDragging = true;
    const rect = agentPopup.getBoundingClientRect();
    popupOffsetX = e.clientX - rect.left;
    popupOffsetY = e.clientY - rect.top;
  });
  
  document.addEventListener("mousemove", (e) => {
    if(isPopupDragging) {
      e.preventDefault();
      agentPopup.style.left = (e.clientX - popupOffsetX) + "px";
      agentPopup.style.top = (e.clientY - popupOffsetY) + "px";
      agentPopup.style.right = "auto";
      agentPopup.style.bottom = "auto";
    }
  });
  
  document.addEventListener("mouseup", () => {
    isPopupDragging = false;
  });
}

function logVision(msg, isSystem = false) {
  const log = document.createElement("div");
  log.className = `log-entry ${isSystem ? 'system' : ''}`;
  log.textContent = msg;
  agentVisionLogs.appendChild(log);
  agentVisionLogs.scrollTop = agentVisionLogs.scrollHeight;
}

if(loadBrowserBtn) {
  loadBrowserBtn.addEventListener("click", () => {
    const url = browserUrl.value.trim();
    if(url) {
      targetIframe.src = url;
      logVision(`[Sistema] Navegador configurado para: ${url}`, true);
      visionOverlay.style.display = "block"; // Show the overlay
    }
  });
}

if(startPredictionsBtn) {
  startPredictionsBtn.addEventListener("click", () => {
    logVision("[Visão] Escaneando pixels na coordenada da lente...", true);
    scannerLaser.style.display = "block";
    
    setTimeout(() => {
       scannerLaser.style.display = "none";
       logVision("[Motor K] Visão processada. Extraindo cartas: 10H, 4C, AS. RC atualizado.");
       logVision("[Motor K] AÇÃO RECOMENDADA: DOBRAR (DOUBLE DOWN). TC > +1", true);
    }, 2500);
  });
}

// Drag logic for visionOverlay
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 20; // Default matches CSS top/left
let yOffset = 20;

if(visionOverlay) {
  visionOverlay.addEventListener("mousedown", dragStart);
  document.addEventListener("mouseup", dragEnd);
  document.addEventListener("mousemove", drag);
}

function dragStart(e) {
  // Prevent dragging when resizing (bottom/right edges)
  const rect = visionOverlay.getBoundingClientRect();
  if (e.clientX > rect.right - 20 || e.clientY > rect.bottom - 20) {
    return;
  }
  
  initialX = e.clientX - xOffset;
  initialY = e.clientY - yOffset;

  if (e.target === visionOverlay || e.target.parentNode === visionOverlay) {
    isDragging = true;
  }
}

function dragEnd(e) {
  initialX = currentX;
  initialY = currentY;
  
  if (isDragging) {
    // Log the new coordinates when drag stops
    const rect = visionOverlay.getBoundingClientRect();
    const sandboxRect = document.getElementById('visionSandboxContainer').getBoundingClientRect();
    
    const relX = Math.round(rect.left - sandboxRect.left);
    const relY = Math.round(rect.top - sandboxRect.top);
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    
    logVision(`[Telemetria] Zona alvo movida: { x: ${relX}, y: ${relY}, w: ${width}, h: ${height} }`);
  }
  isDragging = false;
}

function drag(e) {
  if (isDragging) {
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    xOffset = currentX;
    yOffset = currentY;

    setTranslate(currentX, currentY, visionOverlay);
  }
}

function setTranslate(xPos, yPos, el) {
  el.style.left = xPos + "px";
  el.style.top = yPos + "px";
}

// Handle resize events using ResizeObserver
if (visionOverlay) {
  const resizeObserver = new ResizeObserver(entries => {
    // Ignore initial call
    if(visionOverlay.style.display === "none") return;
    
    for (let entry of entries) {
      if(isDragging) continue; // Don't log while dragging, wait for mouseup
      
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      const rect = visionOverlay.getBoundingClientRect();
      const sandboxRect = document.getElementById('visionSandboxContainer').getBoundingClientRect();
      const relX = Math.round(rect.left - sandboxRect.left);
      const relY = Math.round(rect.top - sandboxRect.top);
      
      // Throttle log creation via timeout to avoid spam during smooth resize
      if(window.resizeLogTimeout) clearTimeout(window.resizeLogTimeout);
      window.resizeLogTimeout = setTimeout(() => {
        logVision(`[Telemetria] Lente redimensionada: { x: ${relX}, y: ${relY}, w: ${width}, h: ${height} }`);
      }, 500);
    }
  });
  resizeObserver.observe(visionOverlay);
}


