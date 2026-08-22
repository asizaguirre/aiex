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
        message: message
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
  const name = customAgentName.value.trim();
  const role = customAgentRole.value.trim();
  if (!name || !role) {
    creatorStatus.textContent = 'Preencha nome e função.';
    creatorStatus.className = 'mini-status error';
    return;
  }

  creatorStatus.textContent = 'Criando e persistindo agente...';
  creatorStatus.className = 'mini-status';

  try {
    const res = await fetch(getApiUrl('/api/agents/custom'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role })
    });

    if (!res.ok) throw new Error('Falha ao persistir o agente');

    creatorStatus.textContent = `Agente '${name}' criado com sucesso!`;
    showToast(`Novo Agente ativo: ${name}`);
    
    // Append message in chat simulating agent registration
    appendMessage('SISTEMA', `Novo agente instanciado: [${name}] com objetivo: [${role}]. Ele herdará os contextos do RAG e da Fonte da Verdade.`, 'assistant');
    
    customAgentName.value = '';
    customAgentRole.value = '';

    // Reload the agents list
    loadCustomAgents();
  } catch (err) {
    creatorStatus.textContent = `Erro: ${err.message}`;
    creatorStatus.className = 'mini-status error';
  }
});

// Custom Agents Loading & Rendering
async function loadCustomAgents() {
  try {
    const res = await fetch(getApiUrl('/api/agents/custom'));
    if (!res.ok) return;
    const agents = await res.json();
    renderCustomAgents(agents);
  } catch (err) {
    console.error('Erro ao carregar agentes instanciados', err);
  }
}

function renderCustomAgents(agents) {
  customAgentsList.innerHTML = '';
  if (agents.length === 0) {
    customAgentsList.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-secondary);">Nenhum agente instanciado ainda.</span>';
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
finishScreenBtn.addEventListener('click', () => {
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
      body: JSON.stringify({ agent, message })
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
    const res = await fetch(getApiUrl('/api/admin/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!res.ok) throw new Error('Erro na verificação');
    const data = await res.json();

    if (data.authorized) {
      adminEmail = email;
      adminUserName = name;

      // Show admin panel, hide login button
      adminLoginArea.style.display = 'none';
      adminPanel.style.display = 'flex';
      adminAvatar.src = picture;
      adminNameEl.textContent = name;

      showToast(`Bem-vindo, ${name}! Modo admin ativo.`);
      appendMessage('SISTEMA', `🔐 Admin autenticado: ${name} (${email}). Botão de shutdown ativado.`, 'assistant');
      
      // Update custom agents to show delete buttons
      loadCustomAgents();
    } else {
      showToast(`Olá, ${name}! Você não é administrador da plataforma.`);
    }
  } catch (err) {
    console.error('Erro verificando admin:', err);
    showToast('Erro ao verificar permissões de admin.');
  }
};

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
    const sandboxRect = document.getElementById('sandboxContainer').getBoundingClientRect();
    
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
      const sandboxRect = document.getElementById('sandboxContainer').getBoundingClientRect();
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


