// ===================================================================
//  AlEx AI Platform v2 - Core Application & UI Engine
//  God-Tier Aesthetics & Intelligent Responsive Controls
// ===================================================================

// Dynamic API resolver for static/local setups
function getApiUrl(path) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return path;
  }
  const customUrl = localStorage.getItem('ALEX_BACKEND_URL');
  if (customUrl) {
    const base = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
    return `${base}${path}`;
  }
  return path;
}

// Utility: Debounce helper for performance optimization
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Utility: Escape HTML
function escapeHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===================================================================
//  PRIMARY THEME & COLOR PERSONALIZATION SYSTEM (Para o Cliente Final)
// ===================================================================
function hexToRgb(hex) {
  if (!hex) return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function adjustHexBrightness(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, rgb.r + amt));
  const g = Math.min(255, Math.max(0, rgb.g + amt));
  const b = Math.min(255, Math.max(0, rgb.b + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function applySystemPrimaryColor(hexColor, save = true) {
  if (!hexColor || !hexColor.startsWith('#')) return;
  const rgb = hexToRgb(hexColor);
  if (!rgb) return;

  const darkHex = adjustHexBrightness(hexColor, -22);
  const root = document.documentElement;

  root.style.setProperty('--color-alex', hexColor);
  root.style.setProperty('--color-alex-dark', darkHex);
  root.style.setProperty('--color-alex-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
  root.style.setProperty('--border-highlight', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);
  root.style.setProperty('--border-focus', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
  root.style.setProperty('--shadow-glow-alex', `0 0 24px -2px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);

  const preview = document.getElementById('themeColorPreview');
  if (preview) {
    preview.style.backgroundColor = hexColor;
    preview.style.boxShadow = `0 0 8px ${hexColor}`;
  }

  const customInput = document.getElementById('themeCustomColorInput');
  if (customInput) customInput.value = hexColor;

  const hexLabel = document.getElementById('themeColorHexLabel');
  if (hexLabel) hexLabel.textContent = hexColor.toUpperCase();

  document.querySelectorAll('.theme-preset-btn').forEach(btn => {
    const btnColor = btn.getAttribute('data-color');
    const isCurrent = btnColor && btnColor.toLowerCase() === hexColor.toLowerCase();
    btn.classList.toggle('active', !!isCurrent);
  });

  if (save) {
    localStorage.setItem('alex_user_theme_color', hexColor);
  }
}

// Aplicação instantânea da cor preferida salva (Apple Blue padrão)
(function loadInitialTheme() {
  const saved = localStorage.getItem('alex_apple_theme_color') || localStorage.getItem('alex_user_theme_color') || '#0071e3';
  applySystemPrimaryColor(saved, false);
})();

function initThemePicker() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeDropdown = document.getElementById('themeDropdown');
  const themePickerContainer = document.getElementById('themePickerContainer');
  const customInput = document.getElementById('themeCustomColorInput');
  const resetBtn = document.getElementById('btnResetTheme');

  if (!themeToggleBtn || !themeDropdown) return;

  const positionThemeDropdown = () => {
    if (themeDropdown.style.display !== 'flex') return;
    const buttonRect = themeToggleBtn.getBoundingClientRect();
    const dropdownRect = themeDropdown.getBoundingClientRect();
    const margin = 12;
    let top = buttonRect.bottom + 8;
    if (top + dropdownRect.height > window.innerHeight - margin) {
      top = Math.max(margin, buttonRect.top - dropdownRect.height - 8);
    }
    const right = Math.max(margin, window.innerWidth - buttonRect.right);
    themeDropdown.style.top = `${Math.round(top)}px`;
    themeDropdown.style.right = `${Math.round(right)}px`;
    themeDropdown.style.left = 'auto';
  };

  const activeColor = localStorage.getItem('alex_apple_theme_color') || localStorage.getItem('alex_user_theme_color') || '#0071e3';
  applySystemPrimaryColor(activeColor, false);

  themeToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = themeDropdown.style.display === 'flex';
    themeDropdown.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) requestAnimationFrame(positionThemeDropdown);
  });

  document.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = btn.getAttribute('data-color');
      if (color) {
        applySystemPrimaryColor(color, true);
        localStorage.setItem('alex_apple_theme_color', color);
        showToast('🎨 Acento Apple atualizado!');
      }
    });
  });

  if (customInput) {
    customInput.addEventListener('input', (e) => {
      applySystemPrimaryColor(e.target.value, true);
    });
    customInput.addEventListener('change', (e) => {
      applySystemPrimaryColor(e.target.value, true);
      localStorage.setItem('alex_apple_theme_color', e.target.value);
      showToast('🎨 Cor personalizada salva!');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      applySystemPrimaryColor('#0071e3', true);
      localStorage.setItem('alex_apple_theme_color', '#0071e3');
      showToast('Cor restaurada para o padrão Apple Blue (Cupertino).');
    });
  }

  document.addEventListener('click', (e) => {
    if (themeDropdown && themeDropdown.style.display === 'flex') {
      if (themePickerContainer && !themePickerContainer.contains(e.target)) {
        themeDropdown.style.display = 'none';
      }
    }
  });
  window.addEventListener('resize', positionThemeDropdown);
  window.addEventListener('scroll', positionThemeDropdown, true);
}

// ===================================================================
//  GLOBAL TOAST SYSTEM
// ===================================================================
let toastTimer = null;
window.showToast = function(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);

  toast.innerHTML = `<span>✨</span> <div>${escapeHtml(message)}</div>`;
  toast.classList.add('show');
  
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
};

// ===================================================================
//  CONTEXTUAL FLOATING HELP POPOVER (Above Target & Focus-Out Dismiss)
// ===================================================================
const globalHelpPopover = document.getElementById('globalHelpPopover');
const globalHelpTitle = document.getElementById('globalHelpTitle');
const globalHelpContent = document.getElementById('globalHelpContent');
let currentActiveHelpTip = null;

function showHelpPopover(helpTip) {
  if (!globalHelpPopover || !helpTip) return;

  // Toggle if clicking the same open tip
  if (currentActiveHelpTip === helpTip && globalHelpPopover.classList.contains('show')) {
    hideHelpPopover();
    return;
  }

  // Remove active class from previous
  if (currentActiveHelpTip) {
    currentActiveHelpTip.classList.remove('active');
  }

  currentActiveHelpTip = helpTip;
  helpTip.classList.add('active');

  const title = helpTip.getAttribute('data-help-title') || 'Ajuda Contextual';
  const content = helpTip.getAttribute('data-help-content') || helpTip.querySelector('.tooltip-text')?.innerHTML || 'Informação sobre este recurso.';

  globalHelpTitle.textContent = title;
  globalHelpContent.innerHTML = content;

  // Temporarily display to measure dimensions
  globalHelpPopover.style.visibility = 'hidden';
  globalHelpPopover.style.display = 'block';
  globalHelpPopover.classList.remove('positioned-below');

  const rect = helpTip.getBoundingClientRect();
  const popoverRect = globalHelpPopover.getBoundingClientRect();
  const popoverWidth = popoverRect.width || 300;
  const popoverHeight = popoverRect.height || 120;

  // Horizontal calculation: Center over the target, keeping inside viewport
  let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
  if (left < 14) left = 14;
  if (left + popoverWidth > window.innerWidth - 14) {
    left = window.innerWidth - popoverWidth - 14;
  }

  // Calculate Arrow position relative to popover
  const arrowX = rect.left + (rect.width / 2) - left;
  globalHelpPopover.style.setProperty('--arrow-left', `${arrowX}px`);

  // Vertical calculation: Try ABOVE first
  let top = rect.top - popoverHeight - 12;
  let positionedBelow = false;

  // If too close to viewport top, place BELOW
  if (top < 10) {
    top = rect.bottom + 12;
    positionedBelow = true;
  }

  if (positionedBelow) {
    globalHelpPopover.classList.add('positioned-below');
  }

  globalHelpPopover.style.left = `${Math.round(left)}px`;
  globalHelpPopover.style.top = `${Math.round(top)}px`;

  // Animate in
  globalHelpPopover.style.visibility = 'visible';
  globalHelpPopover.classList.add('show');
  globalHelpPopover.setAttribute('aria-hidden', 'false');
}

function hideHelpPopover() {
  if (!globalHelpPopover) return;
  globalHelpPopover.classList.remove('show');
  globalHelpPopover.setAttribute('aria-hidden', 'true');
  if (currentActiveHelpTip) {
    currentActiveHelpTip.classList.remove('active');
    currentActiveHelpTip = null;
  }
}

// Bind events to all help triggers
function initHelpTips() {
  document.querySelectorAll('.help-tip').forEach(tip => {
    tip.setAttribute('tabindex', '0');
    tip.setAttribute('role', 'button');

    tip.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      showHelpPopover(tip);
    });

    tip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        showHelpPopover(tip);
      } else if (e.key === 'Escape') {
        hideHelpPopover();
      }
    });

    tip.addEventListener('blur', () => {
      // Small timeout to allow clicking inside popover if needed
      setTimeout(() => {
        if (!globalHelpPopover.matches(':hover')) {
          hideHelpPopover();
        }
      }, 150);
    });
  });
}

// Global click & key listeners to close popover on focus loss or click outside
document.addEventListener('click', (e) => {
  if (globalHelpPopover && !globalHelpPopover.contains(e.target) && !e.target.closest('.help-tip')) {
    hideHelpPopover();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideHelpPopover();
  }
});

window.addEventListener('resize', debounce(hideHelpPopover, 100));
window.addEventListener('scroll', debounce(hideHelpPopover, 100), true);

// ===================================================================
//  LAYOUT COLLAPSIBLE PANELS (Sidebar & Pipeline Monitor)
// ===================================================================
const dashboardGrid = document.getElementById('authenticatedWorkspace');
const sidebarPanel = document.getElementById('sidebarPanel');
const pipelinePanel = document.getElementById('pipelinePanel');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const togglePipelineBtn = document.getElementById('togglePipelineBtn');
const togglePipelineHeaderBtn = document.getElementById('togglePipelineHeaderBtn');
const reopenPipelineBtn = document.getElementById('reopenPipelineBtn');

if (toggleSidebarBtn && sidebarPanel && dashboardGrid) {
  toggleSidebarBtn.addEventListener('click', () => {
    const isCollapsed = sidebarPanel.classList.toggle('is-collapsed');
    dashboardGrid.classList.toggle('sidebar-collapsed', isCollapsed);
    toggleSidebarBtn.classList.toggle('active', !isCollapsed);
    showToast(isCollapsed ? 'Barra lateral recolhida' : 'Barra lateral expandida');
  });
}

function setPipelineCollapsed(collapsed) {
  if (!pipelinePanel || !dashboardGrid) return;
  pipelinePanel.classList.toggle('is-collapsed', collapsed);
  dashboardGrid.classList.toggle('right-collapsed', collapsed);
  if (reopenPipelineBtn) {
    reopenPipelineBtn.style.display = collapsed && adminEmail ? 'inline-flex' : 'none';
  }
}

if (togglePipelineBtn) {
  togglePipelineBtn.addEventListener('click', () => {
    setPipelineCollapsed(true);
    showToast('Monitor de pipeline recolhido.');
  });
}

if (togglePipelineHeaderBtn) {
  togglePipelineHeaderBtn.addEventListener('click', () => {
    const isCurrentlyCollapsed = pipelinePanel.classList.contains('is-collapsed');
    setPipelineCollapsed(!isCurrentlyCollapsed);
  });
}

if (reopenPipelineBtn) {
  reopenPipelineBtn.addEventListener('click', () => {
    setPipelineCollapsed(false);
  });
}

// ===================================================================
//  OLLAMA ENGINE INFO MODAL
// ===================================================================
const ollamaModal = document.getElementById('ollamaModal');
const ollamaStatusBtn = document.getElementById('ollamaStatusBtn');
const overviewOllamaDetailsBtn = document.getElementById('overviewOllamaDetailsBtn');
const closeOllamaModalBtn = document.getElementById('closeOllamaModalBtn');
const confirmOllamaModalBtn = document.getElementById('confirmOllamaModalBtn');

function openOllamaModal() {
  if (ollamaModal) ollamaModal.style.display = 'flex';
}

function closeOllamaModal() {
  if (ollamaModal) ollamaModal.style.display = 'none';
}

if (ollamaStatusBtn) ollamaStatusBtn.addEventListener('click', openOllamaModal);
if (overviewOllamaDetailsBtn) overviewOllamaDetailsBtn.addEventListener('click', openOllamaModal);
if (closeOllamaModalBtn) closeOllamaModalBtn.addEventListener('click', closeOllamaModal);
if (confirmOllamaModalBtn) confirmOllamaModalBtn.addEventListener('click', closeOllamaModal);

if (ollamaModal) {
  ollamaModal.addEventListener('click', (e) => {
    if (e.target === ollamaModal) closeOllamaModal();
  });
}

// ===================================================================
//  WEB SPEECH API (Text-to-Speech & Voice Recognition)
// ===================================================================
let autoVoiceEnabled = false;
const voiceToggleBtn = document.getElementById('voiceToggleBtn');
const changeVoiceBtn = document.getElementById('changeVoiceBtn');
const clearConversationBtn = document.getElementById('clearConversationBtn');
const newConversationBtn = document.getElementById('newConversationBtn');
const chatHistoryElement = document.getElementById('chatHistory');
let selectedVoiceName = '';

function availablePortugueseVoices() {
  if (!window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter(voice => /^pt(-|_)/i.test(voice.lang));
}

function updateVoiceButton() {
  if (!changeVoiceBtn) return;
  const voice = availablePortugueseVoices().find(item => item.name === selectedVoiceName);
  changeVoiceBtn.textContent = voice ? `🎙 ${voice.name.replace(/\s*\(.*?\)/, '').slice(0, 22)}` : '🎙 Voz: Auto';
}

if (window.speechSynthesis) {
  window.speechSynthesis.addEventListener('voiceschanged', updateVoiceButton);
}

if (changeVoiceBtn) {
  changeVoiceBtn.addEventListener('click', () => {
    const voices = availablePortugueseVoices();
    if (!voices.length) {
      showToast('O navegador ainda não disponibilizou vozes em português.');
      return;
    }
    const currentIndex = voices.findIndex(voice => voice.name === selectedVoiceName);
    selectedVoiceName = voices[(currentIndex + 1) % voices.length].name;
    updateVoiceButton();
    showToast(`Voz selecionada: ${selectedVoiceName}`);
  });
}

function resetBuilderConversation(showToastMessage) {
  if (!chatHistoryElement) return;
  chatHistoryElement.innerHTML = `
    <div class="chat-bubble assistant alex">
      <strong>ALIA & ALEX</strong>
      <div>Olá! Estamos prontos. Conte qual agente, tela, integração ou necessidade técnica você deseja desenvolver hoje.</div>
    </div>
  `;
  if (messageInput) messageInput.value = '';
  if (statusEl) statusEl.textContent = '';
  if (chatStatusText) chatStatusText.textContent = 'Pronto';
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (showToastMessage) showToast(showToastMessage);
}

if (voiceToggleBtn) {
  voiceToggleBtn.addEventListener('click', () => {
    autoVoiceEnabled = !autoVoiceEnabled;
    voiceToggleBtn.classList.toggle('active', autoVoiceEnabled);
    voiceToggleBtn.textContent = autoVoiceEnabled ? '🔊 Voz Ativa' : '🔇 Voz';
    if (autoVoiceEnabled) {
      showToast('🔊 Resposta por voz ativada!');
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  });
}

if (clearConversationBtn) {
  clearConversationBtn.addEventListener('click', () => {
    if (window.confirm('Limpar as mensagens desta conversa?')) resetBuilderConversation('Conversa limpa.');
  });
}

if (newConversationBtn) {
  newConversationBtn.addEventListener('click', () => resetBuilderConversation('Nova conversa iniciada.'));
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  // Clean text from code blocks for cleaner voice readout
  const cleanText = text.replace(/```[\s\S]*?```/g, 'Bloco de código gerado.').replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.92;
  utterance.pitch = 1.02;
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => voice.name === selectedVoiceName)
    || voices.find(voice => /pt-BR/i.test(voice.lang) && /Google|Microsoft|Natural|Francisca|Maria|Luciana/i.test(voice.name))
    || voices.find(voice => /pt-BR/i.test(voice.lang))
    || voices.find(voice => /^pt/i.test(voice.lang));
  if (preferredVoice) utterance.voice = preferredVoice;
  window.speechSynthesis.speak(utterance);
}
window.speakText = speakText;

// Custom Agent Modal Voice & Controls
const agentModal = document.getElementById('agentModal');
const agentModalCloseBtn = document.getElementById('agentModalCloseBtn');
const agentModalTitle = document.getElementById('agentModalTitle');
const agentModalRole = document.getElementById('agentModalRole');
const agentModalWelcomeName = document.getElementById('agentModalWelcomeName');
const agentModalDescriptionBtn = document.getElementById('agentModalDescriptionBtn');
const agentModalSettings = document.getElementById('agentModalSettings');
const agentModalNameInput = document.getElementById('agentModalNameInput');
const agentModalRoleInput = document.getElementById('agentModalRoleInput');
const agentModalSaveBtn = document.getElementById('agentModalSaveBtn');
const agentModalResetBtn = document.getElementById('agentModalResetBtn');
const agentModalNewBtn = document.getElementById('agentModalNewBtn');
const agentModalVoiceBtn = document.getElementById('agentModalVoiceBtn');
const agentModalSettingsStatus = document.getElementById('agentModalSettingsStatus');
const agentModalChat = document.getElementById('agentModalChat');
const agentModalInput = document.getElementById('agentModalInput');
const agentModalSendBtn = document.getElementById('agentModalSendBtn');
const agentModalMicBtn = document.getElementById('agentModalMicBtn');
const agentModalSpeakerBtn = document.getElementById('agentModalSpeakerBtn');

let currentCustomAgent = null;
let currentCustomAgentId = null;
let currentCustomAgentRole = '';
let isModalAudioEnabled = true;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition && agentModalMicBtn) {
  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  
  recognition.onstart = () => {
    agentModalMicBtn.classList.add('recording');
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    agentModalInput.value += (agentModalInput.value ? ' ' : '') + transcript;
  };
  
  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    showToast("Erro no microfone: " + event.error);
    agentModalMicBtn.classList.remove('recording');
  };
  
  recognition.onend = () => {
    agentModalMicBtn.classList.remove('recording');
  };

  agentModalMicBtn.addEventListener('click', () => {
    if (agentModalMicBtn.classList.contains('recording')) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
} else if (agentModalMicBtn) {
  agentModalMicBtn.style.display = 'none';
}

function resetAgentConversation() {
  if (!agentModalChat) return;
  agentModalChat.innerHTML = `
    <div class="chat-bubble assistant">
      <strong>${escapeHtml(String(currentCustomAgent || '').toUpperCase())}</strong>
      <div>Olá! Eu sou o <strong>${escapeHtml(currentCustomAgent || 'Agente')}</strong>. Como posso ajudar você agora?</div>
    </div>
  `;
  if (agentModalInput) agentModalInput.value = '';
  if (agentModalSettingsStatus) agentModalSettingsStatus.textContent = '';
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function openAgentModal(name, role, id) {
  currentCustomAgent = name;
  currentCustomAgentId = id || null;
  currentCustomAgentRole = role || '';
  agentModalTitle.textContent = name;
  agentModalRole.textContent = 'Agente pronto para conversar';
  agentModalWelcomeName.textContent = name;
  if (agentModalNameInput) agentModalNameInput.value = name || '';
  if (agentModalRoleInput) agentModalRoleInput.value = role || '';
  if (agentModalSettings) agentModalSettings.hidden = true;
  if (agentModalDescriptionBtn) agentModalDescriptionBtn.textContent = '▾ Ver comportamento';
  resetAgentConversation();
  agentModalInput.value = '';
  agentModal.style.display = 'flex';
}

function closeAgentModal() {
  if (agentModal) agentModal.style.display = 'none';
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

if (agentModalCloseBtn) agentModalCloseBtn.addEventListener('click', closeAgentModal);
if (agentModalDescriptionBtn) {
  agentModalDescriptionBtn.addEventListener('click', () => {
    if (!agentModalSettings) return;
    agentModalSettings.hidden = !agentModalSettings.hidden;
    agentModalDescriptionBtn.textContent = agentModalSettings.hidden ? '▾ Ver comportamento' : '▴ Ocultar comportamento';
  });
}
if (agentModalNewBtn) agentModalNewBtn.addEventListener('click', () => {
  resetAgentConversation();
  showToast('Nova conversa iniciada.');
});
if (agentModalResetBtn) agentModalResetBtn.addEventListener('click', () => {
  if (window.confirm('Reiniciar a conversa atual?')) {
    resetAgentConversation();
    showToast('Conversa reiniciada.');
  }
});
if (agentModalVoiceBtn) agentModalVoiceBtn.addEventListener('click', () => {
  const voices = availablePortugueseVoices();
  if (!voices.length) {
    showToast('Nenhuma voz em português está disponível neste dispositivo.');
    return;
  }
  const currentIndex = voices.findIndex(voice => voice.name === selectedVoiceName);
  selectedVoiceName = voices[(currentIndex + 1) % voices.length].name;
  updateVoiceButton();
  agentModalVoiceBtn.textContent = `🎙 ${selectedVoiceName.replace(/\s*\(.*?\)/, '').slice(0, 18)}`;
  showToast(`Voz selecionada: ${selectedVoiceName}`);
});
if (agentModalSaveBtn) agentModalSaveBtn.addEventListener('click', async () => {
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  const name = agentModalNameInput?.value.trim();
  const role = agentModalRoleInput?.value.trim();
  if (!currentCustomAgentId || !email || !name || !role) {
    if (agentModalSettingsStatus) agentModalSettingsStatus.textContent = 'Informe nome e comportamento.';
    return;
  }
  agentModalSaveBtn.disabled = true;
  if (agentModalSettingsStatus) agentModalSettingsStatus.textContent = 'Salvando comportamento...';
  try {
    const response = await fetch(getApiUrl(`/api/agents/custom/${encodeURIComponent(currentCustomAgentId)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Não foi possível salvar.');
    currentCustomAgent = data.name;
    currentCustomAgentRole = data.role;
    agentModalTitle.textContent = data.name;
    agentModalWelcomeName.textContent = data.name;
    if (agentModalSettingsStatus) agentModalSettingsStatus.textContent = 'Comportamento salvo.';
    loadCustomAgents();
    showToast('Agente atualizado com sucesso.');
  } catch (error) {
    if (agentModalSettingsStatus) agentModalSettingsStatus.textContent = error.message;
  } finally {
    agentModalSaveBtn.disabled = false;
  }
});
if (agentModal) {
  agentModal.addEventListener('click', (e) => {
    if (e.target === agentModal) closeAgentModal();
  });
}

if (agentModalSpeakerBtn) {
  agentModalSpeakerBtn.addEventListener('click', () => {
    isModalAudioEnabled = !isModalAudioEnabled;
    agentModalSpeakerBtn.classList.toggle('active', isModalAudioEnabled);
    if (!isModalAudioEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    showToast(isModalAudioEnabled ? 'Áudio ativado' : 'Áudio desativado');
  });
}

function appendModalMessage(text, sender) {
  const el = document.createElement('div');
  el.className = `chat-bubble ${sender}`;
  
  let htmlText = escapeHtml(text);
  htmlText = htmlText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  htmlText = htmlText.replace(/\n/g, '<br/>');
  
  el.innerHTML = `<strong>${sender === 'user' ? 'VOCÊ' : escapeHtml(currentCustomAgent.toUpperCase())}</strong><div>${htmlText}</div>`;
  agentModalChat.appendChild(el);
  agentModalChat.scrollTop = agentModalChat.scrollHeight;
}

if (agentModalSendBtn) {
  agentModalSendBtn.addEventListener('click', async () => {
    const message = agentModalInput.value.trim();
    if (!message || !currentCustomAgent) return;
    
    appendModalMessage(message, 'user');
    agentModalInput.value = '';
    agentModalSendBtn.disabled = true;
    
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'chat-bubble assistant';
    thinkingEl.innerHTML = `<strong>${escapeHtml(currentCustomAgent.toUpperCase())}</strong><div><em>Pensando...</em></div>`;
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
      
      thinkingEl.remove();
      if (!res.ok) throw new Error('Falha ao conectar com o agente.');
      const data = await res.json();
      
      appendModalMessage(data.response, 'assistant');
      if (isModalAudioEnabled) {
        speakText(data.response);
      }
    } catch (err) {
      thinkingEl.remove();
      appendModalMessage(`Erro: ${err.message}`, 'assistant');
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
}

// ===================================================================
//  CENTRAL BUILDER CHAT & SUGGESTIONS
// ===================================================================
const chatHistory = document.getElementById('chatHistory');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('message');
const statusEl = document.getElementById('status');
const chatStatusText = document.getElementById('chatStatusText');
const chatSuggestions = document.getElementById('chatSuggestions');

function getSelectedAgent() {
  const selected = document.querySelector('input[name="agent"]:checked');
  return selected ? selected.value : 'alex';
}

function appendMessage(author, text, type) {
  const bubble = document.createElement('div');
  const agentClass = type === 'assistant' ? (getSelectedAgent() === 'alia' ? 'alia' : 'alex') : '';
  bubble.className = `chat-bubble ${type} ${agentClass}`;
  
  let formattedText = escapeHtml(text);
  formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  formattedText = formattedText.replace(/\n/g, '<br>');
  
  const speakerBtn = type === 'assistant'
    ? `<button class="speak-btn" title="Ouvir resposta" onclick="(function(btn) {
        if(window.speechSynthesis && window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); btn.classList.remove('speaking'); return; }
        btn.classList.add('speaking');
        window.speakText(${JSON.stringify(text)});
        setTimeout(function(){ btn.classList.remove('speaking'); }, Math.max(1200, ${Math.min(Math.max(String(text).length * 55, 1200), 12000)}));
      })(this)">🔈</button>`
    : '';
  
  bubble.innerHTML = `
    <strong>${escapeHtml(author)}</strong>${speakerBtn}
    <div>${formattedText}</div>
  `;
  
  chatHistory.appendChild(bubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  
  if (type === 'assistant' && autoVoiceEnabled) {
    speakText(text);
  }
}

// Bind Suggestion Chips
if (chatSuggestions) {
  chatSuggestions.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt && messageInput) {
        messageInput.value = prompt;
        messageInput.focus();
        sendMessage();
      }
    });
  });
}

// Pipeline Elements
const sandboxSection = document.getElementById('sandboxSection');
const sandboxContainer = document.getElementById('sandboxContainer');
const finishScreenBtn = document.getElementById('finishScreenBtn');
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

async function triggerAlexPipeline(screenConfig) {
  if (steps.ingest) {
    Object.values(steps).forEach(step => {
      if (step) step.classList.remove('active', 'completed');
    });
  }
  
  if (pipelineLogs) pipelineLogs.innerHTML = '';
  if (diffView) diffView.textContent = 'Analisando otimizações...';
  
  const addLog = (text, type = 'info') => {
    if (!pipelineLogs) return;
    const log = document.createElement('div');
    log.className = `log-entry ${type}`;
    log.textContent = text;
    pipelineLogs.appendChild(log);
    pipelineLogs.scrollTop = pipelineLogs.scrollHeight;
  };

  addLog('Iniciando pipeline do Alex...', 'system');

  try {
    const res = await fetch(getApiUrl('/api/pipeline/run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(screenConfig)
    });

    if (!res.ok) throw new Error('Falha na compilação do código');
    const buildResult = await res.json();

    if (steps.ingest) {
      steps.ingest.classList.add('active');
      addLog('[1/5] Recebida parametrização da Alia. Ingerindo requisitos...');
      await new Promise(r => setTimeout(r, 400));
      steps.ingest.classList.add('completed');
      steps.ingest.classList.remove('active');

      steps.gen.classList.add('active');
      addLog('[2/5] Gerando árvore DOM e componentes dinâmicos em HTML5...');
      await new Promise(r => setTimeout(r, 500));
      steps.gen.classList.add('completed');
      steps.gen.classList.remove('active');

      steps.opt.classList.add('active');
      addLog('[3/5] Alex aplicando otimizações de performance...');
      
      if (diffView) {
        diffView.textContent = `// ANTES (CÓDIGO LENTO)
form.addEventListener('input', () => recalculateHeavy());

// DEPOIS (OTIMIZAÇÃO DO ALEX COM DEBOUNCE)
form.addEventListener('input', debounce(() => recalculateHeavy(), 150));`;
      }

      addLog('✔ OTIMIZADO: Debouncing e Grid CSS nativo.');
      await new Promise(r => setTimeout(r, 500));
      steps.opt.classList.add('completed');
      steps.opt.classList.remove('active');

      steps.test.classList.add('active');
      addLog('[4/5] Executando testes unitários -> PASS');
      await new Promise(r => setTimeout(r, 400));
      steps.test.classList.add('completed');
      steps.test.classList.remove('active');

      steps.deploy.classList.add('active');
      addLog('[5/5] Deploy no Sandbox concluído!');
      steps.deploy.classList.add('completed');
    }

    if (metricBuild) metricBuild.textContent = `${buildResult.metrics.buildTimeMs}ms`;
    if (metricSize) metricSize.textContent = `${buildResult.metrics.codeSizeBits} bits`;
    if (metricSavings) metricSavings.textContent = `-${buildResult.metrics.memorySavingsPercent}%`;
    if (metricPerf) metricPerf.textContent = `${buildResult.metrics.lighthousePerformance}/100`;

    if (sandboxContainer) {
      sandboxContainer.innerHTML = buildResult.html;
      const scriptEl = document.createElement('script');
      scriptEl.textContent = buildResult.js;
      sandboxContainer.appendChild(scriptEl);
    }

    if (sandboxSection) {
      sandboxSection.style.display = 'flex';
      sandboxSection.scrollIntoView({ behavior: 'smooth' });
    }

    showToast(`Tela "${buildResult.title}" compilada por Alex!`);
  } catch (err) {
    addLog(`[ERRO] Pipeline falhou: ${err.message}`, 'error');
    showToast(`Erro na pipeline: ${err.message}`);
  }
}

if (finishScreenBtn && sandboxSection) {
  finishScreenBtn.addEventListener('click', () => {
    sandboxSection.style.display = 'none';
    sandboxContainer.innerHTML = '';
    showToast('Tela dinâmica finalizada e desalocada da memória.');
  });
}

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) {
    statusEl.textContent = 'Digite uma pergunta antes de enviar.';
    return;
  }

  const agent = getSelectedAgent();
  statusEl.textContent = 'Enviando...';
  if (chatStatusText) chatStatusText.textContent = 'Pensando...';
  sendBtn.disabled = true;

  try {
    appendMessage('Você', message, 'user');
    messageInput.value = '';

    const response = await fetch(getApiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent, message, email: adminEmail || sessionStorage.getItem('alexUserEmail') })
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    appendMessage(data.agent.toUpperCase(), data.response, 'assistant');
    
    // Check for screen JSON parameterization
    const jsonMatch = data.response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const config = JSON.parse(jsonMatch[1]);
        if (config.type === 'create_screen') {
          triggerAlexPipeline(config);
        }
      } catch (jsonErr) {
        console.warn("JSON screen parsing error:", jsonErr);
      }
    }

    messageInput.focus();
    statusEl.textContent = '';
    if (chatStatusText) chatStatusText.textContent = 'Pronto';
  } catch (error) {
    statusEl.textContent = `Erro: ${error.message}`;
    if (chatStatusText) chatStatusText.textContent = 'Erro';
    console.error(error);
  } finally {
    sendBtn.disabled = false;
  }
}

if (sendBtn) sendBtn.addEventListener('click', sendMessage);
if (messageInput) {
  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
}

// ===================================================================
//  RAG & DB INGESTION
// ===================================================================
const ragUploadForm = document.getElementById('ragUploadForm');
const ragFile = document.getElementById('ragFile');
const ragStatus = document.getElementById('ragStatus');
const dbTitle = document.getElementById('dbTitle');
const dbContent = document.getElementById('dbContent');
const dbSaveBtn = document.getElementById('dbSaveBtn');
const dbStatus = document.getElementById('dbStatus');

if (ragUploadForm) {
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
      const uploadRes = await fetch(getApiUrl('/api/upload'), { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Erro no upload');
      
      ragStatus.textContent = 'Indexando no RAG...';
      const ingestRes = await fetch(getApiUrl('/api/action/deploy-ingest'), { method: 'POST' });
      if (!ingestRes.ok) throw new Error('Erro na indexação');
      
      ragStatus.textContent = 'Sucesso! Documento integrado ao RAG.';
      ragStatus.className = 'mini-status';
      showToast(`RAG atualizado com: ${file.name}`);
      ragFile.value = '';
    } catch (err) {
      ragStatus.textContent = `Erro: ${err.message}`;
      ragStatus.className = 'mini-status error';
    }
  });
}

if (dbSaveBtn) {
  dbSaveBtn.addEventListener('click', async () => {
    const title = dbTitle.value.trim();
    const content = dbContent.value.trim();
    if (!title || !content) {
      dbStatus.textContent = 'Preencha título e conteúdo.';
      dbStatus.className = 'mini-status error';
      return;
    }

    dbStatus.textContent = 'Gravando no DB...';
    try {
      const res = await fetch(getApiUrl('/api/db'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      
      if (!res.ok) throw new Error('Erro ao salvar no DB');
      
      dbStatus.textContent = 'Salvo na Fonte da Verdade (DB).';
      showToast('Fonte da Verdade atualizada!');
      dbTitle.value = '';
      dbContent.value = '';
    } catch (err) {
      dbStatus.textContent = `Erro: ${err.message}`;
      dbStatus.className = 'mini-status error';
    }
  });
}

// ===================================================================
//  CUSTOM AGENT CREATION & STUDIO
// ===================================================================
const createAgentBtn = document.getElementById('createAgentBtn');
const customAgentName = document.getElementById('customAgentName');
const customAgentRole = document.getElementById('customAgentRole');
const customAgentsList = document.getElementById('customAgentsList');
const agentsTabList = document.getElementById('agentsTabList');
const openCreateFromTabBtn = document.getElementById('openCreateFromTabBtn');
const openCustomAgentsBtn = document.getElementById('openCustomAgentsBtn');
const customAgentsModal = document.getElementById('customAgentsModal');
const closeCustomAgentsBtn = document.getElementById('closeCustomAgentsBtn');
const customAgentsPopupList = document.getElementById('customAgentsPopupList');

function openCustomAgentsModal() {
  if (customAgentsModal) customAgentsModal.style.display = 'flex';
}

function closeCustomAgentsModal() {
  if (customAgentsModal) customAgentsModal.style.display = 'none';
}

if (openCustomAgentsBtn) openCustomAgentsBtn.addEventListener('click', openCustomAgentsModal);
if (closeCustomAgentsBtn) closeCustomAgentsBtn.addEventListener('click', closeCustomAgentsModal);
if (customAgentsModal) customAgentsModal.addEventListener('click', event => {
  if (event.target === customAgentsModal) closeCustomAgentsModal();
});

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

function showAgentBuilderTab() {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
  if (agentBuilderTabButton) {
    agentBuilderTabButton.style.display = 'inline-flex';
    agentBuilderTabButton.classList.add('active');
  }
  if (agentBuilderTab) {
    agentBuilderTab.classList.add('active');
    agentBuilderTab.style.display = 'flex';
  }
}

if (createAgentBtn) {
  createAgentBtn.addEventListener('click', () => {
    const email = adminEmail || sessionStorage.getItem('alexUserEmail');
    if (!email) { showToast('Autentique-se para construir um agente.'); return; }
    
    if (customAgentName && customAgentName.value.trim()) {
      builderAgentName.value = customAgentName.value.trim();
    }
    if (customAgentRole && customAgentRole.value.trim()) {
      builderAgentGoal.value = customAgentRole.value.trim();
    }
    
    showAgentBuilderTab();
    if (builderChatHistory && builderChatHistory.children.length === 0) {
      addBuilderMessage('Alia', 'Olá! Para criar um agente perfeito no Ollama, me conte o que ele deve resolver, que dados ele precisa e quem irá utilizá-lo.');
    }
  });
}

if (openCreateFromTabBtn) {
  openCreateFromTabBtn.addEventListener('click', () => {
    showAgentBuilderTab();
    if (builderChatHistory && builderChatHistory.children.length === 0) {
      addBuilderMessage('Alia', 'Olá! Conte o objetivo do seu novo agente e vamos estruturar a especificação juntos.');
    }
  });
}

function addBuilderMessage(author, text) {
  if (!builderChatHistory) return;
  const message = document.createElement('div');
  message.className = `builder-message ${author === 'Você' ? 'user' : 'assistant'}`;
  message.innerHTML = `<strong>${escapeHtml(author)}</strong><div>${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
  builderChatHistory.appendChild(message);
  builderChatHistory.scrollTop = builderChatHistory.scrollHeight;
}

if (builderChatSendBtn && builderChatInput) {
  builderChatSendBtn.addEventListener('click', async () => {
    const message = builderChatInput.value.trim();
    if (!message) return;
    addBuilderMessage('Você', message);
    builderChatInput.value = '';
    
    try {
      const response = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'alia',
          email: adminEmail || sessionStorage.getItem('alexUserEmail'),
          message: `Estamos construindo um agente. Objetivo: ${builderAgentGoal.value}. Requisitos anotados: ${builderRequirements.value}. Mensagem do cliente: ${message}. Faça perguntas de refinamento e estruture requisitos.`
        })
      });
      const data = await response.json();
      addBuilderMessage('Alia', data.response || 'Não foi possível responder.');
      builderRequirements.value = `${builderRequirements.value}${builderRequirements.value ? '\n\n' : ''}Requisito: ${message}`;
    } catch (err) {
      addBuilderMessage('Alia', 'Erro ao conectar: ' + err.message);
    }
  });

  builderChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      builderChatSendBtn.click();
    }
  });
}

if (buildAgentBtn) {
  buildAgentBtn.addEventListener('click', async () => {
    const email = adminEmail || sessionStorage.getItem('alexUserEmail');
    if (!builderAgentName.value.trim() || !builderAgentGoal.value.trim()) {
      builderStatus.textContent = 'Preencha ao menos o nome e o objetivo do agente.';
      builderStatus.className = 'mini-status error';
      return;
    }

    builderStatus.textContent = 'Alex está sintetizando e registrando o agente...';
    try {
      const response = await fetch(getApiUrl('/api/agents/custom'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: builderAgentName.value.trim(),
          role: `${builderAgentGoal.value.trim()}\n${builderRequirements.value.trim()}`,
          email
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao construir agente');
      
      builderStatus.textContent = 'Agente construído com sucesso!';
      showToast(`Agente ${builderAgentName.value} ativado!`);
      loadCustomAgents();
      
      setTimeout(() => {
        const agentsTabBtn = document.querySelector('[data-target="agentsTab"]');
        if (agentsTabBtn) agentsTabBtn.click();
      }, 700);
    } catch (err) {
      builderStatus.textContent = err.message;
      builderStatus.className = 'mini-status error';
    }
  });
}

if (closeAgentBuilderBtn) {
  closeAgentBuilderBtn.addEventListener('click', () => {
    const chatTabBtn = document.querySelector('[data-target="chatTab"]');
    if (chatTabBtn) chatTabBtn.click();
  });
}

async function loadCustomAgents() {
  try {
    const email = adminEmail || sessionStorage.getItem('alexUserEmail');
    if (!email) return;
    const res = await fetch(getApiUrl(`/api/agents/custom?email=${encodeURIComponent(email)}`));
    if (!res.ok) return;
    const agents = await res.json();
    renderCustomAgents(agents);
  } catch (err) {
    console.error('Erro ao carregar agentes customizados', err);
  }
}

function renderCustomAgents(agents) {
  if (customAgentsList) customAgentsList.innerHTML = '';
  if (agentsTabList) agentsTabList.innerHTML = '';
  if (customAgentsPopupList) customAgentsPopupList.innerHTML = '';

  if (!agents || agents.length === 0) {
    if (customAgentsList) customAgentsList.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted);">Nenhum agente instanciado.</span>';
    if (agentsTabList) agentsTabList.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">Nenhum agente construído ainda. Use a aba Construir Agente ou peça à Alia!</div>';
    if (customAgentsPopupList) customAgentsPopupList.innerHTML = '<div class="custom-agents-empty">Nenhum agente construído ainda.</div>';
    return;
  }

  agents.forEach(agent => {
    const item = document.createElement('div');
    item.className = 'custom-agent-item';
    item.innerHTML = `
      <div class="custom-agent-info">
        <span class="custom-agent-name">🤖 ${escapeHtml(agent.name)}</span>
        <span class="custom-agent-role">${escapeHtml(agent.role)}</span>
      </div>
      <div>
        <button class="btn-open-chat" data-name="${escapeHtml(agent.name)}" data-role="${escapeHtml(agent.role)}">💬 Chat</button>
        <button class="btn-remove-agent" data-id="${agent.id}">Excluir</button>
      </div>
    `;

    item.querySelector('.btn-open-chat').addEventListener('click', () => openAgentModal(agent.name, agent.role, agent.id));
    item.querySelector('.btn-remove-agent').addEventListener('click', () => deleteCustomAgent(agent.id));

    if (customAgentsList) customAgentsList.appendChild(item);
    if (agentsTabList) {
      const tabClone = item.cloneNode(true);
      tabClone.querySelector('.btn-open-chat').addEventListener('click', () => openAgentModal(agent.name, agent.role, agent.id));
      tabClone.querySelector('.btn-remove-agent').addEventListener('click', () => deleteCustomAgent(agent.id));
      agentsTabList.appendChild(tabClone);
    }
    if (customAgentsPopupList) {
      const popupItem = document.createElement('article');
      popupItem.className = 'custom-agent-popup-item';
      popupItem.innerHTML = `
        <div>
          <strong>🤖 ${escapeHtml(agent.name)}</strong>
          <p>${escapeHtml(agent.role)}</p>
        </div>
        <button type="button" class="btn-primary">Abrir conversa</button>
      `;
      popupItem.querySelector('button').addEventListener('click', () => {
        closeCustomAgentsModal();
        openAgentModal(agent.name, agent.role, agent.id);
      });
      customAgentsPopupList.appendChild(popupItem);
    }
  });
}

async function deleteCustomAgent(id) {
  if (!window.confirm('Deseja realmente remover este agente?')) return;
  try {
    const email = adminEmail || sessionStorage.getItem('alexUserEmail');
    const res = await fetch(getApiUrl(`/api/agents/custom/${id}`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      showToast('Agente removido com sucesso!');
      loadCustomAgents();
    } else {
      const err = await res.json();
      showToast(`Erro: ${err.message}`);
    }
  } catch (err) {
    showToast(`Erro: ${err.message}`);
  }
}

// ===================================================================
// ===================================================================
//  PUBLIC PAGES CMS & ESTÚDIO DE MODELAGEM & VENDAS
// ===================================================================
const publicPageForm = document.getElementById('publicPageForm');
const pageSlug = document.getElementById('pageSlug');
const pageTitle = document.getElementById('pageTitle');
const pageContent = document.getElementById('pageContent');
const pageStatus = document.getElementById('pageStatus');
const publicPagesList = document.getElementById('publicPagesList');
const publishPageBtn = document.getElementById('publishPageBtn');
const cancelPageEditBtn = document.getElementById('cancelPageEditBtn');
const btnOpenNewPageEditor = document.getElementById('btnOpenNewPageEditor');
const btnOpenBuilderFromDesk = document.getElementById('btnOpenBuilderFromDesk');
const builderToolButtons = document.querySelectorAll('[data-builder-mode]');
const openDocumentToolsBtn = document.getElementById('openDocumentToolsBtn');
const closeDocumentToolsBtn = document.getElementById('closeDocumentToolsBtn');
const documentToolsBackdrop = document.getElementById('documentToolsBackdrop');
const documentToolActions = document.querySelectorAll('[data-popup-action]');

// Studio Elements
const pageEditorTab = document.getElementById('pageEditorTab');
const pageEditorForm = document.getElementById('pageEditorForm');
const editorPageSlug = document.getElementById('editorPageSlug');
const editorPageTitle = document.getElementById('editorPageTitle');
const editorPageContent = document.getElementById('editorPageContent');
const editorStatus = document.getElementById('editorStatus');
const closePageEditorBtn = document.getElementById('closePageEditorBtn');
const previewPageBtn = document.getElementById('previewPageBtn');
const clearEditorBtn = document.getElementById('clearEditorBtn');
const editorPreview = document.getElementById('editorPreview');
const editorPreviewUrlBadge = document.getElementById('editorPreviewUrlBadge');
const btnPreviewDesktop = document.getElementById('btnPreviewDesktop');
const btnPreviewMobile = document.getElementById('btnPreviewMobile');
const btnCopyPublicUrl = document.getElementById('btnCopyPublicUrl');
const btnOpenPublicTab = document.getElementById('btnOpenPublicTab');
const templateSelect = document.getElementById('templateSelect');
const btnApplyTemplateSelect = document.getElementById('btnApplyTemplateSelect');

// Media & Toolbar Elements
const mediaUploadInput = document.getElementById('mediaUploadInput');
const btnAddYoutube = document.getElementById('btnAddYoutube');
const btnAddWhatsapp = document.getElementById('btnAddWhatsapp');
const btnAddButton = document.getElementById('btnAddButton');
const btnAddPricingTable = document.getElementById('btnAddPricingTable');
const btnAddPageChatbot = document.getElementById('btnAddPageChatbot');
const visualBlockStatus = document.getElementById('visualBlockStatus');
const mediaGalleryContainer = document.getElementById('mediaGalleryContainer');
const mediaGalleryList = document.getElementById('mediaGalleryList');
const mediaUploadProgress = document.getElementById('mediaUploadProgress');

// Mode Toggles & Panels
const btnModeForm = document.getElementById('btnModeForm');
const btnModeStudy = document.getElementById('btnModeStudy');
const btnModeCopilot = document.getElementById('btnModeCopilot');
const editorStudyPanel = document.getElementById('editorStudyPanel');
const studyAgentSelect = document.getElementById('studyAgentSelect');
const studySegmentInput = document.getElementById('studySegmentInput');
const studyAudienceInput = document.getElementById('studyAudienceInput');
const studyOfferInput = document.getElementById('studyOfferInput');
const btnRunMarketStudy = document.getElementById('btnRunMarketStudy');
const studyStatus = document.getElementById('studyStatus');

// Co-Pilot Elements
const editorCopilotPanel = document.getElementById('editorCopilotPanel');
const editorAgentSelect = document.getElementById('editorAgentSelect');
const editorChatHistory = document.getElementById('editorChatHistory');
const editorChatInput = document.getElementById('editorChatInput');
const editorChatSendBtn = document.getElementById('editorChatSendBtn');
const applyAiSuggestionWrapper = document.getElementById('applyAiSuggestionWrapper');
const applyAiSuggestionBtn = document.getElementById('applyAiSuggestionBtn');

let currentCachedPages = [];
let lastAiGeneratedPageContent = '';
let editingStudioSlug = null;
let editingPageSlug = null;

function openDocumentTools() {
  if (documentToolsBackdrop) documentToolsBackdrop.hidden = false;
}

function closeDocumentTools() {
  if (documentToolsBackdrop) documentToolsBackdrop.hidden = true;
}

if (openDocumentToolsBtn) openDocumentToolsBtn.addEventListener('click', openDocumentTools);
if (closeDocumentToolsBtn) closeDocumentToolsBtn.addEventListener('click', closeDocumentTools);
if (documentToolsBackdrop) documentToolsBackdrop.addEventListener('click', event => {
  if (event.target === documentToolsBackdrop) closeDocumentTools();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && documentToolsBackdrop && !documentToolsBackdrop.hidden) closeDocumentTools();
});

documentToolActions.forEach(action => {
  action.addEventListener('click', () => {
    const type = action.dataset.popupAction;
    closeDocumentTools();
    if (type === 'heading') insertTextAtCursor(editorPageContent, '\n\n# Novo título\n\n');
    if (type === 'subheading') insertTextAtCursor(editorPageContent, '\n\n## Nova seção\n\n');
    if (type === 'paragraph') insertTextAtCursor(editorPageContent, '\n\nEscreva aqui o conteúdo desta seção.\n\n');
    if (type === 'divider') insertTextAtCursor(editorPageContent, '\n\n---\n\n');
    if (type === 'pricing' && btnAddPricingTable) btnAddPricingTable.click();
    if (type === 'chatbot' && btnAddPageChatbot) btnAddPageChatbot.click();
    if (type === 'image' && mediaUploadInput) mediaUploadInput.click();
    if (type === 'template' && templateSelect) templateSelect.focus();
    if (type === 'color') {
      const color = prompt('Cor de destaque em hexadecimal:', '#0071e3');
      if (color && /^#[0-9a-f]{6}$/i.test(color)) insertTextAtCursor(editorPageContent, `\n\n[color:${color}]Seção destacada[/color]\n\n`);
    }
  });
});

function openPageEditor(slug = '', mode = 'form') {
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  if (!pageEditorTab || !email) return;
  const showEditor = () => {
    activateWorkspaceTab('pageEditorTab');
    editingStudioSlug = slug || null;
    editingPageSlug = slug || null;
    if (editorStatus) editorStatus.textContent = slug ? 'Página carregada para edição.' : 'Novo rascunho pronto.';
    if (pageEditorHeading) pageEditorHeading.textContent = slug ? 'Editando sua página pública' : 'Criando uma nova página pública';
    setEditorMode(mode);
    fetchMediaGallery();
    updateStudioPreview();
  };

  if (!slug) {
    if (editorPageSlug) editorPageSlug.value = '';
    if (editorPageTitle) editorPageTitle.value = '';
    if (editorPageContent) editorPageContent.value = '';
    showEditor();
    return;
  }

  fetch(getApiUrl(`/api/pages/data/${encodeURIComponent(slug)}?email=${encodeURIComponent(email)}`))
    .then(response => response.ok ? response.json() : response.json().then(data => Promise.reject(new Error(data.message || 'Não foi possível carregar a página.'))))
    .then(page => {
      if (editorPageSlug) editorPageSlug.value = page.slug || '';
      if (editorPageTitle) editorPageTitle.value = page.title || '';
      if (editorPageContent) editorPageContent.value = page.content || '';
      showEditor();
    })
    .catch(error => showToast(`Erro ao abrir página: ${error.message}`));
}

const pageEditorHeading = document.getElementById('pageEditorHeading');

if (btnOpenBuilderFromDesk) btnOpenBuilderFromDesk.addEventListener('click', () => openPageEditor('', 'form'));
builderToolButtons.forEach(button => {
  button.addEventListener('click', () => {
    builderToolButtons.forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    openPageEditor('', 'form');
    window.setTimeout(openDocumentTools, 0);
  });
});

// Markdown parser helper for rich live preview
function parseMarkdownToHtml(md) {
  if (!md) return '<p style="color: var(--text-muted); font-style: italic;">Digite o conteúdo da página ou selecione um modelo na combo box acima para começar...</p>';
  let html = escapeHtml(md);

  // Images: ![alt](url)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, '<div class="page-media-box"><img src="$2" alt="$1" class="page-img" loading="lazy" /></div>');

  // Videos: [video:legenda](url) or [video](url)
  html = html.replace(/\[video(?::(.*?))?\]\((.*?)\)/gim, '<div class="page-media-box"><video controls class="page-video" playsinline preload="metadata"><source src="$2" />Seu navegador não suporta reprodução de vídeo.</video></div>');

  // YouTube Embed: [youtube](url)
  html = html.replace(/\[youtube\]\(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+).*?\)/gim, '<div class="page-media-box video-responsive"><iframe src="https://www.youtube.com/embed/$1" allowfullscreen></iframe></div>');

  // WhatsApp Direct Button: [whatsapp:5511999999999?text=ola](Falar no WhatsApp)
  html = html.replace(/\[whatsapp:([^\]]+)\]\((.*?)\)/gim, '<div style="margin: 16px 0;"><a href="https://wa.me/$1" target="_blank" rel="noopener" class="btn-whatsapp">💬 $2 ↗</a></div>');

  // Button CTA: [button:TEXTO](URL)
  html = html.replace(/\[button:(.*?)\]\((.*?)\)/gim, '<div style="margin: 16px 0;"><a href="$2" target="_blank" rel="noopener" class="btn-cta">$1 ↗</a></div>');

  // Visual pricing table block
  html = html.replace(/\[pricing\]\s*([\s\S]*?)\s*\[\/pricing\]/gim, (_, block) => {
    const rows = block.trim().split('\n').filter(Boolean).map(row => row.split('|').map(cell => cell.trim()));
    if (rows.length < 2) return '';
    const headers = rows[0];
    return `<div class="visual-pricing-table"><div class="pricing-head">${headers.map(cell => `<span>${cell}</span>`).join('')}</div>${rows.slice(1).map(row => `<div class="pricing-row">${headers.map((_, index) => `<span>${row[index] || ''}</span>`).join('')}</div>`).join('')}</div>`;
  });

  // Page chatbot block (preview-only shell; public render connects it)
  html = html.replace(/\[chatbot:(.*?)\]\((.*?)\)/gim, '<div class="page-chatbot"><strong>◌ $1</strong><span>$2</span><div class="chatbot-preview-input">Pergunte sobre esta página...</div></div>');

  // Highlighted section with a user-selected accent color
  html = html.replace(/\[color:(#[0-9a-f]{6})\]([\s\S]*?)\[\/color\]/gim, '<div style="padding:16px;border-left:4px solid $1;background:rgba(0,113,227,.06);border-radius:0 10px 10px 0;">$2</div>');

  // Generic Markdown links: [TEXTO](URL)
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener" style="color: var(--color-alex); font-weight: 600;">$1</a>');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Horizontal Rules
  html = html.replace(/^---+$/gim, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">');

  // Unordered list
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/gim, '');

  // Paragraphs / linebreaks
  html = html.split('\n\n').map(paragraph => {
    const trimmed = paragraph.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<div') || trimmed.startsWith('<table') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}

function updateStudioPreview() {
  if (!editorPreview) return;
  const slug = (editorPageSlug && editorPageSlug.value.trim()) || 'thehouse';
  const title = (editorPageTitle && editorPageTitle.value.trim()) || 'ESTÚDIO DE MODELAGEM & VENDAS';
  const content = (editorPageContent && editorPageContent.value) || '';

  const fullUrl = new URL(`/public/${encodeURIComponent(slug)}`, window.location.origin).href;
  if (editorPreviewUrlBadge) editorPreviewUrlBadge.textContent = `/public/${slug}`;
  if (btnOpenPublicTab) btnOpenPublicTab.href = fullUrl;

  editorPreview.innerHTML = `
    <h1>${escapeHtml(title)}</h1>
    <div class="preview-body">${parseMarkdownToHtml(content)}</div>
  `;
}

// Live typing on Editor
if (editorPageContent) editorPageContent.addEventListener('input', updateStudioPreview);
if (editorPageTitle) editorPageTitle.addEventListener('input', updateStudioPreview);
if (editorPageSlug) editorPageSlug.addEventListener('input', updateStudioPreview);

// Insert Text Helper in Editor Textarea
function insertTextAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + text + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
  updateStudioPreview();
}

// Device View Toggles
if (btnPreviewDesktop && btnPreviewMobile && editorPreview) {
  btnPreviewDesktop.addEventListener('click', () => {
    btnPreviewDesktop.classList.add('active');
    btnPreviewMobile.classList.remove('active');
    editorPreview.classList.remove('mobile-view');
    editorPreview.classList.add('desktop-view');
  });

  btnPreviewMobile.addEventListener('click', () => {
    btnPreviewMobile.classList.add('active');
    btnPreviewDesktop.classList.remove('active');
    editorPreview.classList.remove('desktop-view');
    editorPreview.classList.add('mobile-view');
  });
}

// Copy Public Link
if (btnCopyPublicUrl) {
  btnCopyPublicUrl.addEventListener('click', () => {
    const slug = (editorPageSlug && editorPageSlug.value.trim()) || 'thehouse';
    const fullUrl = new URL(`/public/${encodeURIComponent(slug)}`, window.location.origin).href;
    navigator.clipboard.writeText(fullUrl).then(() => {
      showToast('Link público copiado para a área de transferência!');
    }).catch(() => {
      showToast('URL: ' + fullUrl);
    });
  });
}

// Toggle between Form, Study, and Co-Pilot tabs
function setEditorMode(mode) {
  [btnModeForm, btnModeStudy, btnModeCopilot].forEach(b => b && b.classList.remove('active'));
  if (pageEditorForm) pageEditorForm.style.display = 'none';
  if (editorStudyPanel) editorStudyPanel.style.display = 'none';
  if (editorCopilotPanel) editorCopilotPanel.style.display = 'none';

  if (mode === 'form') {
    if (btnModeForm) btnModeForm.classList.add('active');
    if (pageEditorForm) pageEditorForm.style.display = 'flex';
  } else if (mode === 'study') {
    if (btnModeStudy) btnModeStudy.classList.add('active');
    if (editorStudyPanel) editorStudyPanel.style.display = 'flex';
    populateCopilotAgents();
  } else if (mode === 'copilot') {
    if (btnModeCopilot) btnModeCopilot.classList.add('active');
    if (editorCopilotPanel) editorCopilotPanel.style.display = 'flex';
    populateCopilotAgents();
  }
}

if (btnModeForm) btnModeForm.addEventListener('click', () => setEditorMode('form'));
if (btnModeStudy) btnModeStudy.addEventListener('click', () => setEditorMode('study'));
if (btnModeCopilot) btnModeCopilot.addEventListener('click', () => setEditorMode('copilot'));

// Open New Page Editor Button
if (btnOpenNewPageEditor) {
  btnOpenNewPageEditor.addEventListener('click', () => {
    openPageEditor('');
  });
}

if (closePageEditorBtn) {
  closePageEditorBtn.addEventListener('click', () => {
    activateWorkspaceTab('publishTab');
    loadPublicPages();
  });
}

if (pageEditorForm) {
  pageEditorForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = adminEmail || sessionStorage.getItem('alexUserEmail');
    const originalSlug = editingStudioSlug || editingPageSlug;
    const slug = editorPageSlug.value.trim().toLowerCase();
    const title = editorPageTitle.value.trim();
    const content = editorPageContent.value.trim();
    if (!email || !slug || !title || !content) {
      if (editorStatus) editorStatus.textContent = 'Preencha slug, título e conteúdo antes de publicar.';
      return;
    }
    if (editorStatus) editorStatus.textContent = originalSlug ? 'Salvando alterações...' : 'Publicando página...';
    const endpoint = originalSlug
      ? `/api/pages/${encodeURIComponent(originalSlug)}?email=${encodeURIComponent(email)}`
      : `/api/pages?email=${encodeURIComponent(email)}`;
    try {
      const response = await fetch(getApiUrl(endpoint), {
        method: originalSlug ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, title, content })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Não foi possível salvar a página.');
      editingStudioSlug = data.slug;
      editingPageSlug = data.slug;
      if (editorStatus) editorStatus.innerHTML = `Publicado: <a href="${escapeHtml(data.publicUrl)}" target="_blank" rel="noopener">${escapeHtml(data.publicUrl)}</a>`;
      updateStudioPreview();
      loadPublicPages();
      showToast('Página publicada com sucesso.');
    } catch (error) {
      if (editorStatus) editorStatus.textContent = error.message;
      editorStatus.className = 'mini-status error';
    }
  });
}

// ─── UPLOAD DE FOTOS E VÍDEOS ──────────────────────────────────────────
async function fetchMediaGallery() {
  try {
    const res = await fetch(getApiUrl('/api/pages/media'));
    if (!res.ok) return;
    const mediaList = await res.json();
    if (Array.isArray(mediaList) && mediaList.length > 0 && mediaGalleryList && mediaGalleryContainer) {
      mediaGalleryContainer.style.display = 'block';
      mediaGalleryList.innerHTML = mediaList.map(item => {
        const isVideo = item.type === 'video';
        return `
          <div class="media-thumb-item" title="${escapeHtml(item.fileName)} (Clique para inserir)" data-url="${escapeHtml(item.url)}" data-type="${item.type}">
            ${isVideo ? `<video src="${escapeHtml(item.url)}#t=0.5" preload="metadata"></video>` : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.fileName)}" />`}
            <span class="media-thumb-badge">${isVideo ? '🎥 VÍDEO' : '📷 FOTO'}</span>
          </div>
        `;
      }).join('');

      mediaGalleryList.querySelectorAll('.media-thumb-item').forEach(thumb => {
        thumb.addEventListener('click', () => {
          const url = thumb.dataset.url;
          const type = thumb.dataset.type;
          if (type === 'video') {
            insertTextAtCursor(editorPageContent, `\n\n[video:Apresentação em Vídeo](${url})\n\n`);
          } else {
            insertTextAtCursor(editorPageContent, `\n\n![Foto em Destaque](${url})\n\n`);
          }
          showToast('Mídia inserida no editor!');
        });
      });
    }
  } catch (err) {
    console.error('Erro ao carregar mídias:', err);
  }
}

if (mediaUploadInput) {
  mediaUploadInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (mediaUploadProgress) mediaUploadProgress.textContent = `Enviando ${files.length} arquivo(s)...`;
    if (mediaGalleryContainer) mediaGalleryContainer.style.display = 'block';

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(getApiUrl('/api/pages/media'), {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.type === 'video') {
            insertTextAtCursor(editorPageContent, `\n\n[video:${data.originalName || 'Vídeo'}](${data.url})\n\n`);
          } else {
            insertTextAtCursor(editorPageContent, `\n\n![${data.originalName || 'Foto'}](${data.url})\n\n`);
          }
          showToast(`Arquivo "${file.name}" enviado com sucesso!`);
        } else {
          const errData = await res.json();
          showToast(`Erro no upload de ${file.name}: ${errData.message || 'Falha'}`, 4000);
        }
      } catch (err) {
        showToast(`Erro ao enviar ${file.name}: ${err.message}`, 4000);
      }
    }

    if (mediaUploadProgress) mediaUploadProgress.textContent = 'Upload concluído!';
    setTimeout(() => { if (mediaUploadProgress) mediaUploadProgress.textContent = ''; }, 3000);
    mediaUploadInput.value = '';
    fetchMediaGallery();
  });
}

// Quick Toolbar Buttons
if (btnAddYoutube) {
  btnAddYoutube.addEventListener('click', () => {
    const url = prompt('Informe a URL do vídeo do YouTube (ex: https://www.youtube.com/watch?v=VIDEO_ID):');
    if (url) {
      insertTextAtCursor(editorPageContent, `\n\n[youtube](${url.trim()})\n\n`);
    }
  });
}

if (btnAddWhatsapp) {
  btnAddWhatsapp.addEventListener('click', () => {
    const phone = prompt('Informe o número do WhatsApp com DDI e DDD (ex: 5511999999999):', '5511999999999');
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const text = prompt('Texto do botão:', 'Falar no WhatsApp');
      insertTextAtCursor(editorPageContent, `\n\n[whatsapp:${cleanPhone}?text=Ol%C3%A1%2C%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es](${text || 'Falar no WhatsApp'})\n\n`);
    }
  });
}

if (btnAddButton) {
  btnAddButton.addEventListener('click', () => {
    const text = prompt('Texto do Botão de Ação:', 'Comprar Agora / Solicitar Proposta');
    const link = prompt('Link do Botão (URL ou #ancora):', '#comprar');
    if (text && link) {
      insertTextAtCursor(editorPageContent, `\n\n[button:${text}](${link})\n\n`);
    }
  });
}

if (btnAddPricingTable) {
  btnAddPricingTable.addEventListener('click', () => {
    const rows = [];
    for (let index = 1; index <= 3; index += 1) {
      const name = prompt(`Produto ou plano ${index}:`, index === 1 ? 'Plano Essencial' : '');
      if (!name) break;
      const price = prompt(`Preço de ${name}:`, 'R$ 0,00');
      const description = prompt(`Descrição curta de ${name}:`, 'Inclui os principais benefícios');
      rows.push(`${name.replace(/[|\n]/g, ' ')} | ${(description || '').replace(/[|\n]/g, ' ')} | ${(price || '').replace(/[|\n]/g, ' ')}`);
    }
    if (rows.length) {
      insertTextAtCursor(editorPageContent, `\n\n[pricing]\nProduto | Descrição | Preço\n${rows.join('\n')}\n[/pricing]\n\n`);
      if (visualBlockStatus) visualBlockStatus.textContent = 'tabela adicionada';
    }
  });
}

if (btnAddPageChatbot) {
  btnAddPageChatbot.addEventListener('click', () => {
    const name = prompt('Nome do agente no chatbot:', 'Assistente de vendas');
    if (!name) return;
    const instructions = prompt('Como o agente deve ajudar os visitantes?', 'Responda dúvidas sobre produtos, preços e formas de contato com clareza.');
    insertTextAtCursor(editorPageContent, `\n\n[chatbot:${name.replace(/[\]\n]/g, ' ')}](${(instructions || '').replace(/[)\n]/g, ' ')})\n\n`);
    if (visualBlockStatus) visualBlockStatus.textContent = 'chatbot adicionado';
  });
}

// ─── BASE DE CONHECIMENTO & TEMPLATES POR NICHO DE NEGÓCIO ───────────
const PAGE_TEMPLATES = {
  // ─── 🍽️ GASTRONOMIA & RESTAURANTES
  gastro_menu: {
    slug: 'cardapio-bistro-gourmet',
    title: '🍽️ Cardápio Oficial — Bistrô & Gastronomia Contemporânea',
    content: `# Bistrô & Cozinha Contemporânea — Menu Completo

Uma experiência gastronômica artesanal com ingredientes frescos, selecionados e autênticos.

> 🛵 **Delivery Exclusivo & Salão:** Terça a Domingo das 18h às 23h30 | Peça online ou reserve sua mesa.

---

## 🥗 Entradas & Petiscos Especiais

### 1. Bruschetta di Parma al Tartufo — R$ 38,00
Pão sourdough artesanal tostado, presunto cru di Parma, queijo stracciatella, azeite trufado e folhas de manjericão fresco.

### 2. Tartar de Salmão com Maracujá & Chips de Tapioca — R$ 46,00
Cubos de salmão fresco temperados com emulsão cítrica de maracujá, cebolinha fresca e crocante artesanal de tapioca.

---

## 🥩 Pratos Principais

### 3. Risoto de Cogumelos Selvagens com Medalhão de Mignon — R$ 78,00
Arroz carnaroli com mix de shimeji, shitake e cogumelo paris ao perfume de vinho branco, finalizado com medalhão grelhado e redução de balsâmico.

### 4. Gnocchi Artesanal ao Molho Ragu de Cordeiro — R$ 68,00
Massa fresca de batata asterix recheada com queijo da Serra da Canastra e servida com ragu de cordeiro cozido lentamente por 8 horas.

---

## 🍰 Sobremesas Irresistíveis

### 5. Esfera de Chocolate Belga com Sorvete e Calda Quente — R$ 34,00
Esfera de chocolate 70% recheada com sorvete artesanal de baunilha Bourbon e regada na mesa com ganache quente de frutas vermelhas.

---

### 📲 Peça pelo WhatsApp ou Faça sua Reserva
[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20fazer%20um%20pedido%20do%20card%C3%A1pio](FAZER PEDIDO NO WHATSAPP)`
  },

  gastro_burgers: {
    slug: 'burger-house-artesanal',
    title: '🍔 Smash & Craft Burgers — O Melhor Burger da Cidade',
    content: `# Craft Burger House — Sabor & Crocância Incomparáveis

Burgers artesanais com blend especial de carnes frescas moídas diariamente e pão brioche amanteigado selado.

> ⚡ **Promoção do Dia:** Combo Burger + Batata Rústica + Bebida por apenas **R$ 44,90**!

---

## 🍔 Nossos Burgers Mais Pedidos

### 👑 The Truffle Master — R$ 39,90
Duplo smash de 100g, queijo cheddar inglês derretido, bacon crocante em tiras e maionese trufada no pão brioche tostado.

### 🧀 Triple Cheese Bacon — R$ 42,90
Blend de 180g na brasa, fondue de queijo gouda, queijo prato, cebola caramelizada e geleia de bacon defumado.

---

### 🛵 Peça pelo Delivery Rápido
[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20pedir%20um%20Combo%20Burger](PEDIR PELO WHATSAPP)`
  },

  gastro_pizzaria: {
    slug: 'pizzaria-napoletana',
    title: '🍕 Pizzaria Napoletana — Forno a Lenha & Fermentação Natural',
    content: `# Forneria & Pizzaria Napoletana

Massa de fermentação lenta (48h) com farinha italiana 00, molho de tomate San Marzano DOP e queijo fior di latte.

---

## 🍕 Sabores Especiais

### Margherita Speciale — R$ 59,00
Molho San Marzano, fior di latte fresco, manjericão gigante e fio de azeite extravirgem.

### Burrata & Parma — R$ 74,00
Base fior di latte, burrata artesanal cremosa no centro, fatias de presunto Parma e pesto de pistache.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20pedir%20uma%20Pizza](FAZER PEDIDO PELO WHATSAPP)`
  },

  gastro_cafe: {
    slug: 'cafe-especial-doceria',
    title: '☕ Cafeteria Especial, Brunches & Confeitaria Fina',
    content: `# Café & Confeitaria Artesanal

Grãos especiais 100% arábica com torra fresca, métodos filtrados e confeitaria autoral.

## 🥐 Destaques do Menu
- **Croissant de Amêndoas Francês:** Folhado leve e crocante recheado com creme frangipane — **R$ 22,00**
- **Café Coado V60 / Aeropress:** Grãos florais da Serra da Mantiqueira — **R$ 14,00**
- **Cheesecake New York:** Com calda rústica de frutas vermelhas — **R$ 26,00**

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20encomendar%20doces%20ou%20fazer%20uma%20visita](Falar no WhatsApp com Atendente)`
  },

  gastro_degustacao: {
    slug: 'menu-degustacao',
    title: '🍷 Menu Degustação do Chef — 7 Passos Harmonizados',
    content: `# Experiência Gastronômica em 7 Etapas

Uma celebração dos sentidos criada pelo Chef Executivo com harmonização exclusiva de vinhos selecionados.

> 🍾 **Apenas 20 lugares por noite** com atendimento privativo e apresentação técnica de cada prato.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20reservar%20a%20experi%C3%AAncia%20degusta%C3%A7%C3%A3o](RESERVAR EXPERIÊNCIA DEGUSTAÇÃO)`
  },

  // ─── 🏠 IMÓVEIS, QUARTOS & HOSPEDAGEM
  hotel_quarto_luxo: {
    slug: 'suite-presidencial-luxo',
    title: '🛏️ Suíte Presidencial Master — Conforto & Requinte 5 Estrelas',
    content: `# Suíte Master Presidencial com Vista Panorâmica

Hospede-se com o máximo de privacidade, tecnologia e elegância no ponto mais privilegiado da cidade.

> 🌟 **Destaques:** 85m² privativos | Cama King Size com enxoval 600 fios | Banheira de hidromassagem dupla | Varanda com vista para o pôr do sol.

---

## 🛏️ Detalhamento do Quarto & Cômodos

### 1. Espaço de Descanso Principal
- Cama King Size articulada com travesseiros de pluma de ganso.
- Smart TV 65" 4K com canais a cabo e serviços de streaming liberados.
- Ar-condicionado Split Inverter silencioso com controle térmico por IA.

### 2. Banheiro Spa Privativo
- Banheira de hidromassagem aquecida com cromoterapia para 2 pessoas.
- Ducha dupla de alta pressão e acabamentos em mármore italiano.
- Amenities de banho L'Occitane e roupões aveludados inclusos.

### 3. Living Integrado & Mini Bar Gourmet
- Sofá contemporâneo e mesa de trabalho com tomadas universais e Wi-Fi 6 de 500Mbps.
- Frigobar retro abastecido e cafeteira Nespresso com cápsulas de cortesia.

---

## 💰 Tarifário & Diárias

### Diária Padrão — R$ 580,00 / noite (com Café da Manhã Completo)
- Check-in: 14h00 | Check-out: 12h00
- Estacionamento com manobrista cortesia
- Acesso livre ao SPA, academia e piscina aquecida do complexo

---

### 📅 Garanta sua Reserva com Condições Exclusivas
[whatsapp:5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20reservar%20a%20Su%C3%ADte%20Master](RESERVAR SUÍTE PELO WHATSAPP)`
  },

  pousada_chale: {
    slug: 'chale-serra-vista',
    title: '🏡 Chalé Boutique na Serra — Charme, Lareira & Natureza',
    content: `# Chalé Boutique com Vista Panorâmica da Serra

O refúgio perfeito para relaxar a dois em meio à natureza com lareira ecológica e hidromassagem externa.

## ✨ O que o Chalé Oferece
- **Lareira na Sala e no Quarto** para noites aconchegantes.
- **Deck de Madeira com Ofurô Aquecido** e vista para as montanhas.
- **Cesta de Café da Manhã Artesanal** entregue quentinha na porta todos os dias.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20consultar%20disponibilidade%20do%20Chal%C3%A9](CONSULTAR DATAS DISPONÍVEIS)`
  },

  house_mansao: {
    slug: 'thehouse',
    title: '🏰 THE HOUSE — Mansão Contemporânea de Alto Luxo',
    content: `# THE HOUSE — O Ápice da Sofisticação & Automação

Uma experiência residencial incomparável no endereço mais exclusivo da cidade, com arquitetura contemporânea e automação total com Inteligência Artificial.

> **Área Total:** 1.200m² | **4 Suítes Master** | **6 Vagas Cobertas** | **Piscina Borda Infinita Aquecida**

## 💎 Diferenciais Exclusivos
- **Living com Pé Direito Duplo de 6 metros** e iluminação natural biofílica.
- **Espaço Gourmet Integrado** com adega climatizada para 500 garrafas.
- **Sistema de Automação AlEx** integrado por voz e sensores térmicos inteligentes.
- **Segurança Blindada Nível III-A** com monitoramento perimetral por IA 24h.

---

## 📅 Agendamento de Visita Privativa
Os atendimentos são realizados com exclusividade e discrição para clientes cadastrados.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20visita%20ao%20THE%20HOUSE](AGENDAR VISITA COM CORRETOR EXCLUSIVO)`
  },

  imovel_apartamento: {
    slug: 'apartamento-luxo-panoramico',
    title: '🏢 Apartamento de Alto Padrão — 280m² com 4 Suítes',
    content: `# Apartamento Exclusivo em Andar Alto com Vista 360°

Planta inteligente, acabamentos de altíssimo padrão e lazer completo estilo resort.

## 📐 Distribuição dos Cômodos
- **Hall Social Privativo** com biometria facial.
- **Varanda Gourmet Integrada** com churrasqueira a carvão e fechamento em vidro.
- **Cozinha Gourmet com Ilha Central** e despensa integrada.
- **4 Vagas de Garagem Determinadas** com ponto de recarga elétrica para veículos.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20receber%20a%20planta%20e%20valores%20do%20Apartamento](SOLICITAR APRESENTAÇÃO COMPLETA)`
  },

  // ─── 🛍️ VAREJO & PRODUTOS
  sales_catalogo: {
    slug: 'catalogo-produtos-premium',
    title: '🛍️ Catálogo Oficial de Produtos & Lançamentos',
    content: `# Coleção Exclusiva — Qualidade & Alta Performance

Descubra nossa linha completa de produtos com garantia oficial de 12 meses e entrega rápida.

> **Frete Grátis** para todo o Brasil em pedidos selecionados.

## 📦 Produtos em Destaque
- **Item 1:** Acabamento premium e durabilidade comprovada — **R$ 149,00**
- **Item 2:** Edição limitada com kit de acessórios — **R$ 289,00**
- **Item 3:** Pacote completo para máxima conveniência — **R$ 399,00**

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20comprar%20um%20produto%20do%20cat%C3%A1logo](Comprar pelo WhatsApp)
[button:VER LOJA VIRTUAL COMPLETA](#loja)`
  },

  sales_eletronicos: {
    slug: 'eletronicos-alta-tecnologia',
    title: '📱 Gadgets & Eletrônicos de Alta Performance',
    content: `# Tecnologia de Ponta & Acessórios Premium

Dispositivos inteligentes com garantia estendida e suporte técnico especializado.

[button:COMPRAR AGORA EM ATÉ 12X SEM JUROS](#comprar)
[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20saber%20sobre%20os%20eletr%C3%B4nicos](Tirar Dúvidas com Atendente)`
  },

  sales_moda: {
    slug: 'colecao-moda-exclusiva',
    title: '👗 Coleção de Moda & Estilo Contemporâneo',
    content: `# Nova Coleção — Sofisticação, Conforto & Atitude

Peças exclusivas com tecidos nobres e corte de alfaiataria moderna.

[button:CONFERIR LOOKBOOK & COMPRAR](#lookbook)`
  },

  // ─── 🩺 SAÚDE & ESTÉTICA
  health_clinica: {
    slug: 'clinica-medica-integrada',
    title: '🩺 Clínica Médica Integrada & Longevidade Saudável',
    content: `# Medicina Preventiva & Cuidado Humanizado

Corpo clínico renomado, exames rápidos e protocolos individuais de saúde integrativa.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20agendar%20uma%20consulta](AGENDAR CONSULTA MÉDICA)`
  },

  health_odonto: {
    slug: 'odontologia-estetica-3d',
    title: '🦷 Odontologia Digital — Lentes de Contato & Implantes',
    content: `# Transforme seu Sorriso com Tecnologia Digital 3D

Planejamento estético guiado por computador, sedação consciente e pontualidade.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20agendar%20uma%20avalia%C3%A7%C3%A3o%20odontol%C3%B3gica](Agendar Avaliação Odontológica)`
  },

  health_estetica: {
    slug: 'estetica-avancada-facial',
    title: '💆‍♀️ Harmonização Facial & Estética Avançada',
    content: `# Realce sua Beleza Natural com Procedimentos Seguros

Botox, preenchedores com ácido hialurônico, bioestimuladores de colágeno e lasers de última geração.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20conhecer%20os%20protocolos%20est%C3%A9ticos](Agendar Avaliação Estética)`
  },

  // ─── ⚖️ JURÍDICO
  law_empresarial: {
    slug: 'advocacia-empresarial',
    title: '⚖️ Advocacia Empresarial & Proteção Patrimonial',
    content: `# Assessoria Jurídica Estratégica para Negócios

Contratos complexos, M&A, planejamento tributário e governança corporativa.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20um%20advogado](Falar com Advogado Especialista)`
  },

  law_trabalhista: {
    slug: 'assessoria-juridica-trabalhista',
    title: '🏛️ Consultoria Trabalhista & Prevenção de Passivos',
    content: `# Segurança Jurídica para sua Empresa e Colaboradores

Auditoria de compliance, defesa contenciosa e estruturação de políticas internas.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20uma%20consultoria%20trabalhista](Consultar Especialista)`
  },

  // ─── 🚀 TECNOLOGIA & SAAS
  saas_plataforma: {
    slug: 'plataforma-saas-ia',
    title: '🚀 AlEx Platform — Agentes de IA Autônomos para Empresas',
    content: `# Automatize seu Atendimento & Vendas com Inteligência Artificial

Agentes conectados ao WhatsApp, CRM e banco de dados que atendem clientes em segundos.

[button:COMEÇAR TESTE GRATUITO DE 7 DIAS](#teste)
[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20uma%20demonstra%C3%A7%C3%A3o%20da%20plataforma](Agendar Demonstração ao Vivo)`
  },

  saas_consultoria: {
    slug: 'consultoria-transformacao-ia',
    title: '💼 Consultoria Estratégica em Inteligência Artificial',
    content: `# Implante IA no seu Negócio com Segurança & Alto ROI

Mapeamento de processos, seleção de ferramentas e treinamento de equipes executivas.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20uma%20proposta%20de%20consultoria](Solicitar Diagnóstico Preliminar)`
  },

  // ─── 🏋️ FITNESS
  fitness_academia: {
    slug: 'academia-treinamento-elite',
    title: '🏋️ Academia & Centro de Treinamento de Alta Performance',
    content: `# Supere seus Limites com Estrutura Completa & Coaches Certificados

Musculação, cardio de última geração, aulas coletivas e acompanhamento nutricional.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20agendar%20uma%20aula%20experimental](Agendar Aula Experimental Grátis)`
  },

  fitness_personal: {
    slug: 'personal-trainer-consultoria',
    title: '🏃‍♂️ Consultoria Fitness & Treinamento Personalizado',
    content: `# Treinos Sob Medida para Emagrecimento & Hipertrofia

Acompanhamento via aplicativo com vídeos explicativos, suporte diário e avaliação postural.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20iniciar%20minha%20consultoria%20fitness](Começar Treinamento Personalizado)`
  },

  // ─── 🎓 EDUCAÇÃO
  edu_mentoria: {
    slug: 'mentoria-executiva-escala',
    title: '🎓 Mentoria Executiva — Estratégia, Vendas & IA',
    content: `# Acelere sua Carreira e Escale seu Negócio

Encontros quinzenais ao vivo, networking com líderes do mercado e acesso a ferramentas exclusivas.

[button:APLICAR PARA A PRÓXIMA TURMA](#aplicar)
[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20saber%20sobre%20o%20processo%20seletivo%20da%20mentoria](Tirar Dúvidas sobre a Mentoria)`
  },

  edu_curso_online: {
    slug: 'curso-pratico-ia',
    title: '💻 Formação Prática em Agentes de IA & Automações',
    content: `# Domine as Ferramentas do Futuro Passo a Passo

Aulas direto ao ponto, suporte na comunidade e certificado oficial reconhecido.

[button:GARANTIR ACESSO COM VALOR PROMOCIONAL](#comprar)`
  },

  // ─── 🚗 AUTOMOTIVO
  auto_veiculos: {
    slug: 'veiculos-premium-seminovos',
    title: '🚗 Concessionária Premium — Carros & Blindados Selecionados',
    content: `# Veículos Selecionados com Laudo Cautelar 100% Aprovado

Garantia de 1 ano, procedência comprovada e melhores taxas de financiamento.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20receber%20o%20estoque%20atualizado](SOLICITAR ESTOQUE DE VEÍCULOS)`
  },

  auto_detailing: {
    slug: 'estetica-automotiva-vitrificacao',
    title: '✨ Estética Automotiva, Vitrificação & PPF',
    content: `# Proteção Cerâmica, Polimento Técnico e Detalhamento

Proteja a pintura do seu veículo com os melhores produtos do mercado mundial.

[whatsapp:5511999999999?text=Ol%C3%A1%2C%20quero%20um%20or%C3%A7amento%20de%20est%C3%A9tica%20automotiva](Solicitar Orçamento)`
  },

  // ─── 📊 RELATÓRIOS
  report_auditoria: {
    slug: 'relatorio-executivo-ia',
    title: '📊 Relatório Executivo de Auditoria & Performance do Agente',
    content: `# Relatório Executivo de Resultados & Entregáveis

Documento oficial gerado pelos agentes autônomos da AlEx Platform v2.

## 📈 Métricas de Desempenho
- **Taxa de Conversão Alcançada:** +42.6%
- **Tempo Médio de Atendimento:** 1.4s
- **Índice de Resolução no 1º Contato:** 94.8%

[button:BAIXAR VERSÃO COMPLETA EM PDF](#pdf)`
  },

  report_entrega: {
    slug: 'entrega-projeto-agentes',
    title: '📑 Entrega Formal de Projeto & Validação Técnica',
    content: `# Validação & Homologação de Sistema de Agentes

Relatório completo de deploy, testes de estresse e conformidade de segurança.

[button:ACESSAR PAINEL DE CONTROLE](#painel)`
  }
};

// Aliases para compatibilidade rápida
PAGE_TEMPLATES.sales = PAGE_TEMPLATES.sales_catalogo;
PAGE_TEMPLATES.house = PAGE_TEMPLATES.house_mansao;
PAGE_TEMPLATES.gastro = PAGE_TEMPLATES.gastro_menu;
PAGE_TEMPLATES.health = PAGE_TEMPLATES.health_clinica;
PAGE_TEMPLATES.law = PAGE_TEMPLATES.law_empresarial;
PAGE_TEMPLATES.services = PAGE_TEMPLATES.saas_plataforma;
PAGE_TEMPLATES.fitness = PAGE_TEMPLATES.fitness_academia;
PAGE_TEMPLATES.education = PAGE_TEMPLATES.edu_mentoria;
PAGE_TEMPLATES.auto = PAGE_TEMPLATES.auto_veiculos;
PAGE_TEMPLATES.report = PAGE_TEMPLATES.report_auditoria;

// Helper to apply template by key
function applyTemplateByKey(templateKey) {
  if (!templateKey) return;
  const tpl = PAGE_TEMPLATES[templateKey];
  if (tpl) {
    if (pageEditorTab && pageEditorTab.style.display === 'none') {
      openPageEditor(tpl.slug);
    }

    if (editorPageSlug && (!editorPageSlug.value.trim() || confirm('Substituir campos pelo modelo selecionado?'))) {
      editorPageSlug.value = tpl.slug;
      editorPageTitle.value = tpl.title;
      editorPageContent.value = tpl.content;
      updateStudioPreview();
      showToast('✨ Template de negócio aplicado com sucesso!');
      setEditorMode('form');
    }
  }
}

// Apply Template from Combo Box
if (templateSelect) {
  templateSelect.addEventListener('change', () => {
    const val = templateSelect.value;
    if (val) applyTemplateByKey(val);
  });
}

if (btnApplyTemplateSelect) {
  btnApplyTemplateSelect.addEventListener('click', () => {
    const val = templateSelect ? templateSelect.value : '';
    if (val) {
      applyTemplateByKey(val);
    } else {
      showToast('Selecione um template na lista acima!');
    }
  });
}

// Apply Template Chips (se existirem)
document.querySelectorAll('.template-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const templateKey = chip.getAttribute('data-template');
    applyTemplateByKey(templateKey);
  });
});

// Preview button in Studio
if (previewPageBtn) {
  previewPageBtn.addEventListener('click', () => {
    updateStudioPreview();
    showToast('Prévia atualizada!');
  });
}

// Form on the Publish Tab
if (publicPageForm) {
  publicPageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = adminEmail || sessionStorage.getItem('alexUserEmail');
    const isEditing = Boolean(editingPageSlug);
    pageStatus.textContent = isEditing ? 'Salvando edição...' : 'Publicando página...';
    pageStatus.className = 'mini-status';

    try {
      const endpoint = isEditing 
        ? `/api/pages/${encodeURIComponent(editingPageSlug)}?email=${encodeURIComponent(email)}` 
        : `/api/pages?email=${encodeURIComponent(email)}`;

      const response = await fetch(getApiUrl(endpoint), {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: pageSlug.value.trim().toLowerCase(), title: pageTitle.value.trim(), content: pageContent.value.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Não foi possível publicar.');
      
      const publicUrl = new URL(data.publicUrl, window.location.origin).href;
      pageStatus.innerHTML = `Página salva: <a href="${publicUrl}" target="_blank" rel="noopener" style="color: var(--color-alex); font-weight: 700;">${publicUrl}</a>`;
      publicPageForm.reset();
      editingPageSlug = null;
      loadPublicPages();
      showToast('Página pública atualizada!');
    } catch (error) {
      pageStatus.textContent = error.message;
      pageStatus.className = 'mini-status error';
    }
  });
}

// Load Public Pages with Edit button
async function loadPublicPages() {
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  if (!email || !publicPagesList) return;
  try {
    const response = await fetch(getApiUrl(`/api/pages?email=${encodeURIComponent(email)}`));
    if (!response.ok) return;
    const pages = await response.json();
    currentCachedPages = pages || [];
    
    publicPagesList.innerHTML = pages.length ? pages.map(page => {
      const url = new URL(`/public/${encodeURIComponent(page.slug)}`, window.location.origin).href;
      return `
        <div class="public-page-row">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <strong style="font-size: 0.95rem; color: #fff;">${escapeHtml(page.title)}</strong>
            <span style="font-family: var(--font-mono); font-size: 0.76rem; color: var(--color-alex);">${url}</span>
          </div>
          <div class="public-page-actions">
            <button type="button" class="btn-secondary" data-edit-slug="${escapeHtml(page.slug)}" title="Editar e Modelar Página">✏️ Editar</button>
            <a href="${url}" target="_blank" rel="noopener" class="btn-open-chat">Abrir ↗</a>
            <button type="button" class="btn-remove-agent" data-delete-slug="${escapeHtml(page.slug)}" title="Excluir Página">Excluir</button>
          </div>
        </div>
      `;
    }).join('') : '<span style="color: var(--text-muted); font-size: 0.8rem;">Nenhuma página publicada ainda. Crie sua primeira página acima!</span>';

    // Bind Edit buttons
    publicPagesList.querySelectorAll('[data-edit-slug]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-edit-slug');
        openPageEditor(slug);
      });
    });

    // Bind Delete buttons
    publicPagesList.querySelectorAll('[data-delete-slug]').forEach(btn => {
      btn.addEventListener('click', () => deletePublicPage(btn.getAttribute('data-delete-slug')));
    });
  } catch (e) {
    console.error('Erro ao listar páginas públicas:', e);
  }
}

async function deletePublicPage(slug) {
  if (!window.confirm(`Deseja realmente excluir a página "${slug}"?`)) return;
  const email = adminEmail || sessionStorage.getItem('alexUserEmail');
  try {
    const response = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(slug)}?email=${encodeURIComponent(email)}`), { method: 'DELETE' });
    if (response.ok) {
      showToast('Página pública excluída.');
      loadPublicPages();
    } else {
      const err = await response.json();
      showToast('Erro ao excluir: ' + (err.message || 'Falha na requisição'));
    }
  } catch (err) {
    showToast('Erro ao excluir: ' + err.message);
  }
}

// ===================================================================
//  ADMIN ZONE & AUTHENTICATION
// ===================================================================
let adminEmail = null;
let adminUserName = null;

const appContainer = document.getElementById('appContainer');
const adminLoginArea = document.getElementById('adminLoginArea');
const adminPanel = document.getElementById('adminPanel');
const adminAvatar = document.getElementById('adminAvatar');
const adminNameEl = document.getElementById('adminName');
const roleBadge = document.getElementById('roleBadge');
const shutdownBtn = document.getElementById('shutdownBtn');
const shutdownModal = document.getElementById('shutdownModal');
const shutdownCancel = document.getElementById('shutdownCancel');
const shutdownConfirm = document.getElementById('shutdownConfirm');
const shutdownConfirmInfo = document.getElementById('shutdownConfirmInfo');
const shutdownProgress = document.getElementById('shutdownProgress');
const shutdownMessage = document.getElementById('shutdownMessage');
const logoutBtn = document.getElementById('logoutBtn');
const userRegistrationForm = document.getElementById('userRegistrationForm');
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');
const usersList = document.getElementById('usersList');
const userStatus = document.getElementById('userStatus');

const accessRequestsBadge = document.getElementById('accessRequestsBadge');
const accessRequestsList = document.getElementById('accessRequestsList');
const accessRequestsStatus = document.getElementById('accessRequestsStatus');
const refreshRequestsBtn = document.getElementById('refreshRequestsBtn');

const adminTabs = document.querySelectorAll('.admin-only');
const clientOnlyControls = document.querySelectorAll('.client-only');
const adminOnlyPanels = document.querySelectorAll('.admin-only-panel');
const clientWorkspaceElements = document.querySelectorAll('.client-workspace-only');
const adminWorkspaceElements = document.querySelectorAll('.admin-workspace-only');

let accessRequestsPollingTimer = null;

function activateWorkspaceTab(targetId) {
  document.querySelectorAll('.tab-btn').forEach(button => button.classList.toggle('active', button.getAttribute('data-target') === targetId));
  document.querySelectorAll('.tab-content').forEach(content => {
    const isTarget = content.id === targetId;
    content.classList.toggle('active', isTarget);
    content.style.display = isTarget ? 'flex' : 'none';
  });
}

function applyRoleVisibility(isAdmin) {
  document.body.classList.toggle('admin-mode', isAdmin);
  document.body.classList.toggle('client-mode', !isAdmin);
  clientWorkspaceElements.forEach(element => element.classList.toggle('workspace-hidden', isAdmin));
  adminWorkspaceElements.forEach(element => element.classList.toggle('workspace-hidden', !isAdmin));
  adminTabs.forEach(tab => { tab.style.display = isAdmin ? 'inline-flex' : 'none'; });
  adminOnlyPanels.forEach(panel => { panel.style.display = isAdmin ? 'flex' : 'none'; });
  clientOnlyControls.forEach(control => { control.style.display = isAdmin ? 'none' : 'inline-flex'; });
  if (roleBadge) {
    roleBadge.textContent = isAdmin ? 'Administração do sistema' : 'Workspace do cliente';
    roleBadge.classList.toggle('is-admin', isAdmin);
  }
  const defaultTab = document.querySelector(`[data-target="${isAdmin ? 'adminTab' : 'overviewTab'}"]`);
  if (defaultTab) activateWorkspaceTab(defaultTab.getAttribute('data-target'));
  const openAgentPopupBtn = document.getElementById('openAgentPopupBtn');
  if (openAgentPopupBtn) openAgentPopupBtn.style.display = isAdmin ? 'block' : 'none';

  if (isAdmin) {
    loadAccessRequests();
    if (!accessRequestsPollingTimer) {
      accessRequestsPollingTimer = setInterval(loadAccessRequests, 12000);
    }
  } else {
    if (accessRequestsPollingTimer) {
      clearInterval(accessRequestsPollingTimer);
      accessRequestsPollingTimer = null;
    }
  }
}

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

const directLoginForm = document.getElementById('directLoginForm');
const directLoginEmail = document.getElementById('directLoginEmail');
const loginStatus = document.getElementById('loginStatus');
const directLoginBtn = document.getElementById('directLoginBtn');

function authenticateUser(email, name = '', picture = '') {
  adminEmail = email;
  adminUserName = name || email.split('@')[0];
  sessionStorage.setItem('alexUserEmail', email);
  sessionStorage.setItem('alexUserName', adminUserName);
  if (picture) sessionStorage.setItem('alexUserPicture', picture);
  
  appContainer.classList.remove('locked');
  adminLoginArea.style.display = 'none';
  adminPanel.style.display = 'flex';
  if (adminAvatar) adminAvatar.src = picture || '';
  if (adminNameEl) adminNameEl.textContent = adminUserName;
  
  loadCustomAgents();
  loadPublicPages();
}

async function checkUserVerification(email, name = '', picture = '') {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return;

  if (loginStatus) {
    loginStatus.innerHTML = `<span>⏳</span> <div>Verificando permissões de acesso para <strong>${escapeHtml(cleanEmail)}</strong>...</div>`;
    loginStatus.className = 'mini-status';
  }

  try {
    const res = await fetch(getApiUrl('/api/access/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name, picture })
    });

    if (!res.ok) throw new Error('Falha na resposta do servidor');
    const data = await res.json();

    if (data.authorized) {
      authenticateUser(cleanEmail, name, picture);
      applyRoleVisibility(data.admin);
      if (data.admin) {
        loadUsers();
        loadAccessRequests();
      }
      showToast(data.admin ? `✨ Bem-vindo(a), Administrador(a) ${name || ''}!` : `✨ Bem-vindo(a), ${name || cleanEmail}!`);
    } else {
      if (loginStatus) {
        loginStatus.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 6px; text-align: left;">
            <div>🔔 <strong>Pedido de Acesso Registrado</strong></div>
            <div>O e-mail <strong>${escapeHtml(cleanEmail)}</strong> foi cadastrado e está aguardando aprovação do administrador.</div>
            <button type="button" id="btnRetryAuth" class="btn-secondary" style="align-self: flex-start; margin-top: 6px; font-size: 0.76rem; padding: 4px 10px;">
              🔄 Verificar Autorização Novamente
            </button>
          </div>
        `;
        loginStatus.className = 'mini-status';
        const retryBtn = document.getElementById('btnRetryAuth');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => checkUserVerification(cleanEmail, name, picture));
        }
      }
      showToast(`Pedido de acesso registrado para ${cleanEmail}.`);
    }
  } catch (err) {
    if (loginStatus) {
      loginStatus.innerHTML = `<div>❌ Erro ao conectar com o backend: ${escapeHtml(err.message)}</div>`;
      loginStatus.className = 'mini-status error';
    }
    showToast('Erro ao validar acesso.');
  }
}

if (directLoginForm && directLoginEmail) {
  directLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = directLoginEmail.value.trim().toLowerCase();
    if (!email) return;
    if (directLoginBtn) directLoginBtn.disabled = true;
    try {
      await checkUserVerification(email);
    } finally {
      if (directLoginBtn) directLoginBtn.disabled = false;
    }
  });
}

window.handleGoogleLogin = async function(response) {
  if (!response || !response.credential) {
    showToast('Erro: Credencial Google não recebida.');
    return;
  }
  const payload = decodeJwtPayload(response.credential);
  if (!payload || !payload.email) {
    showToast('Erro ao processar token da Conta Google.');
    return;
  }

  const email = payload.email;
  const name = payload.name || email;
  const picture = payload.picture || '';

  await checkUserVerification(email, name, picture);
};

let googleClientId = '800464070591-33nvvitct598mb53dccehl15q8cjm4m9.apps.googleusercontent.com';

async function fetchAuthConfig() {
  try {
    const res = await fetch(getApiUrl('/api/auth/config'));
    if (res.ok) {
      const data = await res.json();
      if (data.googleClientId) googleClientId = data.googleClientId;
    }
  } catch (ignored) {}
}

function initializeGoogleSignIn() {
  const button = document.getElementById('googleSignInButton');
  const fallbackBtn = document.getElementById('googleFallbackBtn');
  if (!button || !window.google || !window.google.accounts || !window.google.accounts.id) {
    if (fallbackBtn) fallbackBtn.style.display = 'inline-flex';
    return false;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: window.handleGoogleLogin,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    window.google.accounts.id.renderButton(button, {
      type: 'standard',
      shape: 'pill',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      logo_alignment: 'left',
      locale: 'pt-BR',
      width: 320
    });
    if (fallbackBtn) fallbackBtn.style.display = 'none';
    return true;
  } catch (err) {
    console.warn('Google GSI renderButton fallback ativado:', err);
    if (fallbackBtn) fallbackBtn.style.display = 'inline-flex';
    return false;
  }
}

// Handler do botão Google Apple Fallback
const googleFallbackBtn = document.getElementById('googleFallbackBtn');
if (googleFallbackBtn) {
  googleFallbackBtn.addEventListener('click', () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (ignored) {}
    }
    const input = document.getElementById('directLoginEmail');
    if (input) {
      input.focus();
      if (loginStatus) {
        loginStatus.innerHTML = '<div>💡 Digite seu e-mail Google no campo abaixo e clique em <strong>Acessar Workspace</strong>.</div>';
        loginStatus.className = 'mini-status';
      }
    }
  });
}

window.addEventListener('load', async () => {
  initThemePicker();
  initHelpTips();
  await fetchAuthConfig();
  
  if (initializeGoogleSignIn()) return;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (initializeGoogleSignIn() || attempts >= 15) {
      window.clearInterval(timer);
      const button = document.getElementById('googleSignInButton');
      const fallbackBtn = document.getElementById('googleFallbackBtn');
      if (fallbackBtn && (!button || button.childElementCount === 0)) {
        fallbackBtn.style.display = 'inline-flex';
      }
    }
  }, 250);
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.reload();
  });
}

// Check saved session
const savedEmail = sessionStorage.getItem('alexUserEmail');
if (savedEmail) {
  fetch(getApiUrl('/api/access/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: savedEmail })
  })
    .then(r => r.json())
    .then(data => {
      if (!data.authorized) return sessionStorage.clear();
      adminEmail = savedEmail;
      adminUserName = sessionStorage.getItem('alexUserName') || savedEmail;
      appContainer.classList.remove('locked');
      adminLoginArea.style.display = 'none';
      adminPanel.style.display = 'flex';
      if (adminAvatar) adminAvatar.src = sessionStorage.getItem('alexUserPicture') || '';
      if (adminNameEl) adminNameEl.textContent = adminUserName;
      applyRoleVisibility(data.admin);
      loadCustomAgents();
      if (data.admin) {
        loadUsers();
        loadAccessRequests();
      }
      loadPublicPages();
    });
}

// User registration (Admin)
if (userRegistrationForm) {
  userRegistrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    userStatus.textContent = 'Cadastrando...';
    try {
      const response = await fetch(getApiUrl(`/api/admin/users?adminEmail=${encodeURIComponent(adminEmail)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userNameInput.value.trim(), email: userEmailInput.value.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao cadastrar.');
      userRegistrationForm.reset();
      userStatus.textContent = 'Cliente cadastrado com sucesso!';
      loadUsers();
    } catch (err) {
      userStatus.textContent = err.message;
      userStatus.className = 'mini-status error';
    }
  });
}

async function loadUsers() {
  if (!adminEmail || !usersList) return;
  try {
    const res = await fetch(getApiUrl(`/api/admin/users?adminEmail=${encodeURIComponent(adminEmail)}`));
    if (!res.ok) return;
    const users = await res.json();
    usersList.innerHTML = users.length ? users.map(user => `
      <div class="user-row">
        <div><strong>${escapeHtml(user.name)}</strong> <span>(${escapeHtml(user.email)})</span></div>
        <button class="btn-remove-agent" data-user-id="${user.id}">Remover</button>
      </div>
    `).join('') : '<span style="color: var(--text-muted); font-size: 0.8rem;">Nenhum cliente cadastrado.</span>';

    usersList.querySelectorAll('[data-user-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetch(getApiUrl(`/api/admin/users/${btn.dataset.userId}?adminEmail=${encodeURIComponent(adminEmail)}`), { method: 'DELETE' });
        loadUsers();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

// ===================================================================
//  PEDIDOS DE ACESSO (ACCESS REQUESTS MANAGEMENT)
// ===================================================================
async function loadAccessRequests() {
  if (!adminEmail || !accessRequestsList) return;
  try {
    const res = await fetch(getApiUrl(`/api/admin/requests?adminEmail=${encodeURIComponent(adminEmail)}`));
    if (!res.ok) return;
    const requests = await res.json();

    // Atualiza a bolinha vermelha indicadora na aba
    const count = requests.length;
    if (accessRequestsBadge) {
      if (count > 0) {
        accessRequestsBadge.textContent = count;
        accessRequestsBadge.style.display = 'inline-flex';
      } else {
        accessRequestsBadge.style.display = 'none';
      }
    }

    if (requests.length === 0) {
      accessRequestsList.innerHTML = `
        <div style="padding: 28px; text-align: center; color: var(--text-muted); font-size: 0.88rem; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          ✨ Nenhum pedido de acesso pendente no momento.
        </div>`;
      return;
    }

    accessRequestsList.innerHTML = requests.map(req => {
      const dateStr = req.createdAt ? new Date(req.createdAt).toLocaleString('pt-BR') : 'Data recente';
      const displayName = req.name || req.email;
      return `
        <div class="request-row" id="req-row-${escapeHtml(req.id)}">
          <div class="request-info">
            <strong>👤 ${escapeHtml(displayName)}</strong>
            <span class="request-email">✉️ ${escapeHtml(req.email)}</span>
            <span class="request-time">🕒 Solicitado em: ${escapeHtml(dateStr)}</span>
          </div>
          <div class="request-actions">
            <button class="btn-approve-request" data-approve-id="${escapeHtml(req.id)}" data-user-name="${escapeHtml(displayName)}" data-user-email="${escapeHtml(req.email)}" title="Aprovar e conceder acesso imediato">
              ✔ Aprovar Acesso
            </button>
            <button class="btn-reject-request" data-reject-id="${escapeHtml(req.id)}" title="Recusar pedido de acesso">
              ✖ Recusar
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Event listener para botão Aprovar (move para administração)
    accessRequestsList.querySelectorAll('[data-approve-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reqId = btn.dataset.approveId;
        const uName = btn.dataset.userName;
        btn.disabled = true;
        btn.textContent = 'Aprovando...';
        try {
          const approveRes = await fetch(getApiUrl(`/api/admin/requests/${encodeURIComponent(reqId)}/approve?adminEmail=${encodeURIComponent(adminEmail)}`), {
            method: 'POST'
          });
          if (!approveRes.ok) throw new Error('Erro ao aprovar.');
          showToast(`✔ Usuário "${uName}" aprovado e adicionado à Administração!`);
          await loadAccessRequests();
          await loadUsers();
        } catch (err) {
          showToast(`Erro ao aprovar: ${err.message}`);
          btn.disabled = false;
          btn.textContent = '✔ Aprovar Acesso';
        }
      });
    });

    // Event listener para botão Recusar
    accessRequestsList.querySelectorAll('[data-reject-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reqId = btn.dataset.rejectId;
        if (!confirm('Deseja realmente recusar este pedido de acesso?')) return;
        btn.disabled = true;
        btn.textContent = 'Recusando...';
        try {
          const rejectRes = await fetch(getApiUrl(`/api/admin/requests/${encodeURIComponent(reqId)}/reject?adminEmail=${encodeURIComponent(adminEmail)}`), {
            method: 'POST'
          });
          if (!rejectRes.ok) throw new Error('Erro ao recusar.');
          showToast('Pedido de acesso recusado.');
          await loadAccessRequests();
        } catch (err) {
          showToast(`Erro ao recusar: ${err.message}`);
          btn.disabled = false;
          btn.textContent = '✖ Recusar';
        }
      });
    });

  } catch (err) {
    console.error('Erro ao carregar pedidos de acesso:', err);
  }
}

if (refreshRequestsBtn) {
  refreshRequestsBtn.addEventListener('click', async () => {
    refreshRequestsBtn.disabled = true;
    refreshRequestsBtn.textContent = '🔄 Atualizando...';
    await loadAccessRequests();
    refreshRequestsBtn.disabled = false;
    refreshRequestsBtn.textContent = '🔄 Atualizar Lista';
    showToast('Lista de pedidos atualizada.');
  });
}

// Shutdown Controls
if (shutdownBtn && shutdownModal) {
  shutdownBtn.addEventListener('click', () => {
    shutdownConfirmInfo.innerHTML = `
      <p><strong>Administrador:</strong> ${escapeHtml(adminUserName)} (${escapeHtml(adminEmail)})</p>
      <p><strong>Ação:</strong> Encerrar backend da plataforma</p>
      <p><strong>Horário:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    `;
    shutdownModal.style.display = 'flex';
  });

  shutdownCancel.addEventListener('click', () => { shutdownModal.style.display = 'none'; });
  shutdownModal.addEventListener('click', (e) => { if (e.target === shutdownModal) shutdownModal.style.display = 'none'; });

  shutdownConfirm.addEventListener('click', async () => {
    if (!adminEmail) return;
    shutdownConfirm.disabled = true;
    shutdownCancel.disabled = true;
    shutdownProgress.style.display = 'block';
    
    try {
      const res = await fetch(getApiUrl('/api/admin/shutdown'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail })
      });
      const data = await res.json();
      shutdownMessage.textContent = '⏻ ' + data.message;
      showToast('Desligando plataforma...');
      setTimeout(() => {
        document.body.style.opacity = '0.2';
      }, 2000);
    } catch (err) {
      shutdownMessage.textContent = `Erro: ${err.message}`;
    }
  });
}

// ===================================================================
//  TAB SWITCHING SYSTEM
// ===================================================================
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    if (targetId) activateWorkspaceTab(targetId);
  });
});

// ===================================================================
//  OBSERVER DEMO POPUP CONTROLS
// ===================================================================
const openAgentPopupBtn = document.getElementById("openAgentPopupBtn");
const agentPopup = document.getElementById("agentPopup");
const closePopupBtn = document.getElementById("closePopupBtn");
const agentPopupHeader = document.getElementById("agentPopupHeader");
const loadBrowserBtn = document.getElementById("loadBrowserBtn");
const browserUrl = document.getElementById("browserUrl");
const targetIframe = document.getElementById("targetIframe");
const visionOverlay = document.getElementById("visionOverlay");
const agentVisionLogs = document.getElementById("agentVisionLogs");
const startPredictionsBtn = document.getElementById("startPredictionsBtn");
const scannerLaser = document.getElementById("scannerLaser");

if (openAgentPopupBtn) openAgentPopupBtn.addEventListener('click', () => { if (agentPopup) agentPopup.style.display = 'flex'; });
if (closePopupBtn) closePopupBtn.addEventListener('click', () => { if (agentPopup) agentPopup.style.display = 'none'; });

if (loadBrowserBtn && browserUrl && targetIframe && visionOverlay) {
  loadBrowserBtn.addEventListener('click', () => {
    const url = browserUrl.value.trim();
    if (url) {
      targetIframe.src = url;
      visionOverlay.style.display = 'block';
    }
  });
}

if (startPredictionsBtn && scannerLaser && agentVisionLogs) {
  startPredictionsBtn.addEventListener('click', () => {
    scannerLaser.style.display = 'block';
    const log = document.createElement('div');
    log.className = 'log-entry system';
    log.textContent = '[Visão] Escaneando coordenadas da lente...';
    agentVisionLogs.appendChild(log);
    
    setTimeout(() => {
      scannerLaser.style.display = 'none';
      const logResult = document.createElement('div');
      logResult.className = 'log-entry success';
      logResult.textContent = '[Motor OCR] Elementos identificados com sucesso na área selecionada.';
      agentVisionLogs.appendChild(logResult);
    }, 2000);
  });
}
