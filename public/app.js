// ── Estado da aplicação ──────────────────────────────────────────
const STORAGE_KEY = 'novenas_v1';

function getState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { novenas: [] }; }
  catch { return { novenas: [] }; }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Roteamento simples ────────────────────────────────────────────
let currentView = 'home';
let currentNovennaId = null;
let prayerDay = null;
let showModal = false;

// Estado da tela de seleção
let selecaoOpcoes = [];
let selecaoIndex = 0;
let selecaoDias = 9;

function navigate(view, novennaId = null, day = null) {
  currentView = view;
  currentNovennaId = novennaId;
  prayerDay = day;
  render();
}

// ── Render principal ──────────────────────────────────────────────
function render() {
  const app = document.getElementById('app');
  if (currentView === 'home') app.innerHTML = renderHome();
  else if (currentView === 'loading') app.innerHTML = renderLoading();
  else if (currentView === 'selecao') app.innerHTML = renderSelecao();
  else if (currentView === 'detail') app.innerHTML = renderDetail();
  else if (currentView === 'prayer') app.innerHTML = renderPrayer();
  attachEvents();
}

// ── HEADER ───────────────────────────────────────────────────────
function renderHeader(showBack = false) {
  return `
    <header class="header">
      <div class="header-brand" id="btn-home">
        <span class="header-icon">🕊️</span>
        <span class="header-title">Novenas</span>
      </div>
      ${showBack ? `<button class="btn btn-ghost" id="btn-back">← Voltar</button>` : ''}
    </header>`;
}

// ── HOME ─────────────────────────────────────────────────────────
function renderHome() {
  const state = getState();
  const novenas = state.novenas;

  let content;
  if (novenas.length === 0) {
    content = `
      <div class="home-empty">
        <div class="home-empty-icon">🙏</div>
        <h2>Nenhuma novena iniciada</h2>
        <p>Adicione uma novena e acompanhe seus 9 dias de oração com o texto completo.</p>
        <button class="btn btn-primary btn-lg" id="btn-nova">+ Iniciar uma Novena</button>
      </div>`;
  } else {
    const cards = novenas.map(n => {
      const concluidos = n.diasConcluidos.filter(Boolean).length;
      const diaAtual = concluidos < 9 ? concluidos + 1 : 9;
      const concluida = concluidos === 9;
      const pctClass = concluida ? 'done' : concluidos > 0 ? 'active' : '';
      return `
        <div class="novena-card" data-id="${n.id}">
          <div class="novena-card-icon">${concluida ? '✅' : '🕯️'}</div>
          <div class="novena-card-info">
            <div class="novena-card-name">${n.dados.nome}</div>
            <div class="novena-card-meta">
              ${concluida ? 'Novena concluída 🎉' : `Dia ${diaAtual} de 9 · Iniciada em ${formatDate(n.dataInicio)}`}
            </div>
          </div>
          <div class="novena-card-progress">
            <div class="progress-ring ${pctClass}">${concluidos}/9</div>
          </div>
        </div>`;
    }).join('');

    content = `
      <h2 class="section-title">Minhas Novenas</h2>
      ${cards}
      <div style="margin-top:20px; text-align:center">
        <button class="btn btn-ghost" id="btn-nova">+ Iniciar nova novena</button>
      </div>`;
  }

  const modal = showModal ? renderModal() : '';

  return `
    ${renderHeader()}
    <div class="home-container">${content}</div>
    ${modal}`;
}

function renderModal() {
  return `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
        <div class="modal-title">🔍 Buscar Novena</div>
        <p class="modal-subtitle">Digite o nome da novena e vou buscá-la na internet para você</p>
        <div class="input-group">
          <label>Nome da novena</label>
          <input type="text" id="input-novena" placeholder="Ex: Novena de Santo Antônio, Nossa Senhora Aparecida..." autofocus>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="btn-cancelar" style="flex:1">Cancelar</button>
          <button class="btn btn-primary" id="btn-buscar" style="flex:2">🔍 Buscar</button>
        </div>
      </div>
    </div>`;
}

// ── LOADING ───────────────────────────────────────────────────────
function renderLoading() {
  return `
    ${renderHeader()}
    <div class="loading-view">
      <div class="loading-spinner"></div>
      <div class="loading-text">Buscando a novena na internet...</div>
      <div class="loading-sub">Isso pode levar alguns segundos</div>
    </div>`;
}

// ── SELEÇÃO DE NOVENA ────────────────────────────────────────────
function renderSelecao() {
  const opcoes = selecaoOpcoes.map((o, i) => `
    <div class="opcao-card ${i === selecaoIndex ? 'selecionada' : ''}" data-idx="${i}">
      <div class="opcao-radio">${i === selecaoIndex ? '●' : '○'}</div>
      <div class="opcao-info">
        <div class="opcao-nome">${o.nome}</div>
        <div class="opcao-desc">${o.descricao || ''}</div>
        ${o.observacao ? `<div class="opcao-obs">${o.observacao}</div>` : ''}
      </div>
      <div class="opcao-dias-badge">${o.dias}d</div>
    </div>`).join('');

  return `
    ${renderHeader(true)}
    <div class="selecao-container">
      <h2 class="section-title">Selecione a novena</h2>
      <p class="selecao-sub">Escolha a versão correta e confirme o número de dias</p>

      <div class="opcoes-lista">${opcoes}</div>

      <div class="dias-picker">
        <span class="dias-picker-label">Número de dias</span>
        <div class="dias-picker-ctrl">
          <button class="dias-btn" id="btn-dias-menos">−</button>
          <span class="dias-valor" id="dias-valor">${selecaoDias}</span>
          <button class="dias-btn" id="btn-dias-mais">+</button>
        </div>
      </div>

      <button class="btn btn-gold btn-full btn-lg" id="btn-confirmar-selecao">
        Buscar novena de ${selecaoDias} dias →
      </button>
    </div>`;
}

// ── DETALHE ───────────────────────────────────────────────────────
function renderDetail() {
  const state = getState();
  const novena = state.novenas.find(n => n.id === currentNovennaId);
  if (!novena) { navigate('home'); return ''; }

  const { dados, diasConcluidos } = novena;
  const totalDias = dados.dias.length;
  const concluidos = diasConcluidos.filter(Boolean).length;
  const hoje = concluidos < totalDias ? concluidos : totalDias - 1;
  const concluida = concluidos === totalDias;

  const diasButtons = Array.from({ length: totalDias }, (_, i) => {
    const done = diasConcluidos[i];
    const isHoje = !concluida && i === hoje;
    const isFuturo = !done && i > hoje;
    const cls = done ? 'concluido' : isHoje ? 'hoje' : 'futuro';
    const check = done ? '<span class="dia-check">✓</span>' : '';
    return `
      <div class="dia-btn ${cls}" data-dia="${i}" ${isFuturo ? '' : `id="dia-${i}"`}>
        ${check}
        <div class="dia-num">${i + 1}</div>
        <div class="dia-label">${done ? 'Concluído' : isHoje ? 'Hoje' : `${i + 1}º dia`}</div>
      </div>`;
  }).join('');

  const rezarBtn = concluida
    ? `<button class="btn btn-done btn-full btn-lg">✅ Novena concluída!</button>`
    : `<button class="btn btn-gold btn-full btn-lg" id="btn-rezar-hoje">🙏 Rezar o ${hoje + 1}º dia agora</button>`;

  return `
    ${renderHeader(true)}
    <div class="detail-container">
      <div class="detail-hero">
        <div class="detail-icon">🕯️</div>
        <h1 class="detail-name">${dados.nome}</h1>
        <p class="detail-desc">${dados.descricao || ''}</p>
        ${dados.intencao_sugerida ? `<span class="detail-intencao">✨ ${dados.intencao_sugerida}</span>` : ''}
        <div class="detail-progress-info">
          <div class="progress-stat"><div class="num">${concluidos}</div><div class="lbl">dias rezados</div></div>
          <div class="progress-stat"><div class="num">${totalDias - concluidos}</div><div class="lbl">dias restantes</div></div>
        </div>
      </div>

      <div class="dias-grid">${diasButtons}</div>
      ${rezarBtn}

      <div style="margin-top:16px; text-align:center">
        <button class="btn btn-ghost" id="btn-excluir" style="color:#e88; font-size:13px">Excluir novena</button>
      </div>
    </div>`;
}

// ── VOZ ───────────────────────────────────────────────────────────
let isSpeaking = false;
let autoAdvance = false;
let shouldRestart = false;
let voiceRate = parseFloat(localStorage.getItem('voiceRate') || '1.1');

function getPortugueseVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === 'pt-BR')
    || voices.find(v => v.lang.startsWith('pt'))
    || voices[0]
    || null;
}

// resolve(true) = terminou naturalmente, resolve(false) = cancelado
function speakText(text) {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = voiceRate;
    utterance.pitch = 1;
    const voice = getPortugueseVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => { isSpeaking = true; updateVoiceBtn(); };
    utterance.onend   = () => { isSpeaking = false; resolve(true); };
    utterance.onerror = () => { isSpeaking = false; resolve(false); };
    window.speechSynthesis.speak(utterance);
  });
}

function stopSpeech() {
  autoAdvance = false;
  isSpeaking = false;
  window.speechSynthesis.cancel();
  updateVoiceBtn();
}

function updateVoiceBtn() {
  const btn = document.getElementById('btn-voz');
  if (!btn) return;
  if (autoAdvance || isSpeaking) {
    btn.textContent = '⏹ Parar leitura';
    btn.style.borderColor = 'rgba(220,80,80,0.4)';
    btn.style.color = '#e88';
  } else {
    btn.textContent = '🔊 Ouvir';
    btn.style.borderColor = '';
    btn.style.color = '';
  }
}

// Atualiza apenas o conteúdo da tela de oração, sem re-renderizar tudo
function updatePrayerContent(sections, step, diaTitle) {
  prayerStep = step;

  const label = document.querySelector('.prayer-section-label');
  const text  = document.querySelector('.prayer-text');
  const dots  = document.querySelector('.prayer-dots');
  const ind   = document.querySelector('.prayer-step-indicator');
  const nav   = document.querySelector('.prayer-nav');

  if (label) label.textContent = `${diaTitle} · ${sections[step].label}`;
  if (text) {
    text.style.animation = 'none';
    void text.offsetWidth; // força reflow para reiniciar animação
    text.style.animation = '';
    text.textContent = sections[step].text;
  }
  if (dots) {
    dots.innerHTML = sections.map((_, i) =>
      `<div class="prayer-dot ${i === step ? 'active' : ''}"></div>`
    ).join('');
  }
  if (ind) ind.textContent = `${step + 1}/${sections.length}`;

  // Atualiza preview da próxima seção
  const nextSection = step < sections.length - 1 ? sections[step + 1] : null;
  const nextLabel = document.getElementById('prayer-next-label');
  const nextText  = document.getElementById('prayer-next-text');
  if (nextLabel) nextLabel.textContent = nextSection ? `A seguir · ${nextSection.label}` : '';
  if (nextText)  nextText.textContent  = nextSection ? nextSection.text : '';

  // Atualiza botões de navegação
  if (nav) {
    const isLast = step === sections.length - 1;
    const prevBtn = step > 0 ? `<button class="btn btn-ghost" id="btn-anterior">← Anterior</button>` : '';
    const navBtn  = isLast
      ? `<button class="btn btn-gold" style="flex:1" id="btn-concluir-dia">✅ Concluir o ${prayerDay + 1}º dia</button>`
      : `<button class="btn btn-primary" style="flex:1" id="btn-proximo">Próximo →</button>`;
    nav.innerHTML = prevBtn + navBtn;
    on('btn-proximo',     () => { stopSpeech(); prayerStep++; render(); });
    on('btn-anterior',    () => { stopSpeech(); prayerStep = Math.max(0, prayerStep - 1); render(); });
    on('btn-concluir-dia',() => { stopSpeech(); concluirDia(); });
  }
}

async function startAutoRead() {
  const state = getState();
  const novena = state.novenas.find(n => n.id === currentNovennaId);
  if (!novena) return;

  const dia = novena.dados.dias[prayerDay];
  const sections = getPrayerSections(dia);

  autoAdvance = true;
  updateVoiceBtn();

  for (let i = prayerStep; i < sections.length; i++) {
    if (!autoAdvance) break;

    let completed;
    do {
      shouldRestart = false;
      updatePrayerContent(sections, i, dia.titulo);
      completed = await speakText(sections[i].text);
    } while (!completed && shouldRestart && autoAdvance);

    if (!autoAdvance) break;

    if (i < sections.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  autoAdvance = false;
  updateVoiceBtn();
}

// ── MODO ORAÇÃO ───────────────────────────────────────────────────
let prayerStep = 0;

function getPrayerSections(dia) {
  const sections = [];
  if (dia.oracao_abertura) sections.push({ label: 'Oração de Abertura', text: dia.oracao_abertura });
  if (dia.meditacao) sections.push({ label: 'Meditação', text: dia.meditacao });
  if (dia.oracao_principal) sections.push({ label: 'Oração Principal', text: dia.oracao_principal });
  if (dia.peticao) sections.push({ label: 'Petição', text: dia.peticao });
  if (dia.oracao_final) sections.push({ label: 'Oração Final', text: dia.oracao_final });
  return sections.length ? sections : [{ label: 'Oração', text: JSON.stringify(dia) }];
}

function renderPrayer() {
  const state = getState();
  const novena = state.novenas.find(n => n.id === currentNovennaId);
  if (!novena) { navigate('home'); return ''; }

  const dia = novena.dados.dias[prayerDay];
  const sections = getPrayerSections(dia);
  const total = sections.length;
  const step = Math.min(prayerStep, total - 1);
  const section = sections[step];
  const nextSection = step < total - 1 ? sections[step + 1] : null;
  const isLast = step === total - 1;

  const dots = sections.map((_, i) =>
    `<div class="prayer-dot ${i === step ? 'active' : ''}"></div>`
  ).join('');

  const navBtn = isLast
    ? `<button class="btn btn-gold" style="flex:1" id="btn-concluir-dia">✅ Concluir o ${prayerDay + 1}º dia</button>`
    : `<button class="btn btn-primary" style="flex:1" id="btn-proximo">Próximo →</button>`;

  const prevBtn = step > 0
    ? `<button class="btn btn-ghost" id="btn-anterior">← Anterior</button>`
    : '';

  return `
    <div class="prayer-view">
      <div class="prayer-header">
        <button class="btn btn-ghost" id="btn-fechar-prayer" style="padding:6px 12px; font-size:13px">✕ Sair</button>
        <span class="prayer-title-small">${novena.dados.nome}</span>
        <span class="prayer-step-indicator">${step + 1}/${total}</span>
      </div>

      <div class="prayer-body">
        <div class="prayer-section-label">${dia.titulo} · ${section.label}</div>
        <div class="prayer-text">${section.text}</div>
        <div class="prayer-next-label" id="prayer-next-label">${nextSection ? `A seguir · ${nextSection.label}` : ''}</div>
        <div class="prayer-next" id="prayer-next-text">${nextSection ? nextSection.text : ''}</div>
      </div>

      <div class="prayer-footer">
        <div class="prayer-dots">${dots}</div>
        <div class="speed-control">
          <span class="speed-label">🐢</span>
          <input type="range" id="voice-speed" min="0.6" max="1.8" step="0.1" value="${voiceRate}">
          <span class="speed-label">🐇</span>
          <span class="speed-value" id="speed-display">${voiceRate.toFixed(1)}×</span>
        </div>
        <button class="btn btn-ghost btn-full" id="btn-voz">🔊 Ouvir</button>
        <div class="prayer-nav">
          ${prevBtn}
          ${navBtn}
        </div>
      </div>
    </div>`;
}

// ── EVENTOS ───────────────────────────────────────────────────────
function attachEvents() {
  // Home
  on('btn-home', () => { showModal = false; navigate('home'); });
  on('btn-back', () => navigate('home'));
  on('btn-nova', () => { showModal = true; render(); setTimeout(() => { const el = document.getElementById('input-novena'); if (el) el.focus(); }, 50); });
  on('btn-cancelar', () => { showModal = false; render(); });
  on('modal-overlay', (e) => { if (e.target.id === 'modal-overlay') { showModal = false; render(); } });
  on('btn-buscar', buscarNovena);

  const inputEl = document.getElementById('input-novena');
  if (inputEl) inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') buscarNovena(); });

  // Cards de novena
  document.querySelectorAll('.novena-card[data-id]').forEach(card => {
    card.addEventListener('click', () => navigate('detail', card.dataset.id));
  });

  // Tela de seleção
  document.querySelectorAll('.opcao-card[data-idx]').forEach(card => {
    card.addEventListener('click', () => {
      selecaoIndex = parseInt(card.dataset.idx);
      selecaoDias = selecaoOpcoes[selecaoIndex].dias;
      render();
    });
  });
  on('btn-dias-menos', () => {
    if (selecaoDias > 1) { selecaoDias--; atualizarDiasPicker(); }
  });
  on('btn-dias-mais', () => {
    selecaoDias++;
    atualizarDiasPicker();
  });
  on('btn-confirmar-selecao', confirmarSelecao);

  // Detalhe
  on('btn-rezar-hoje', () => {
    const state = getState();
    const novena = state.novenas.find(n => n.id === currentNovennaId);
    if (!novena) return;
    const hoje = novena.diasConcluidos.filter(Boolean).length;
    prayerStep = 0;
    navigate('prayer', currentNovennaId, hoje);
  });

  on('btn-excluir', () => {
    if (!confirm('Excluir esta novena? Seu progresso será perdido.')) return;
    const state = getState();
    state.novenas = state.novenas.filter(n => n.id !== currentNovennaId);
    saveState(state);
    navigate('home');
  });

  // Dias clicáveis (passados ou hoje)
  document.querySelectorAll('[id^="dia-"]').forEach(el => {
    el.addEventListener('click', () => {
      const diaIdx = parseInt(el.dataset.dia);
      prayerStep = 0;
      navigate('prayer', currentNovennaId, diaIdx);
    });
  });

  // Modo oração
  on('btn-fechar-prayer', () => { stopSpeech(); navigate('detail', currentNovennaId); });
  on('btn-proximo', () => { stopSpeech(); prayerStep++; render(); });
  on('btn-anterior', () => { stopSpeech(); prayerStep = Math.max(0, prayerStep - 1); render(); });
  on('btn-concluir-dia', () => { stopSpeech(); concluirDia(); });

  // Slider de velocidade
  const slider = document.getElementById('voice-speed');
  if (slider) {
    slider.addEventListener('input', () => {
      voiceRate = parseFloat(slider.value);
      localStorage.setItem('voiceRate', voiceRate);
      const display = document.getElementById('speed-display');
      if (display) display.textContent = voiceRate.toFixed(1) + '×';
      // Se está falando, reinicia o trecho atual com o novo rate
      if (isSpeaking || autoAdvance) {
        shouldRestart = true;
        window.speechSynthesis.cancel();
      }
    });
  }

  // Voz
  on('btn-voz', () => {
    if (autoAdvance || isSpeaking) {
      stopSpeech();
    } else {
      startAutoRead();
    }
  });
}

function on(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

// ── AÇÕES ─────────────────────────────────────────────────────────
// Etapa 1: pesquisa opções
async function buscarNovena() {
  const input = document.getElementById('input-novena');
  const nome = input ? input.value.trim() : '';
  if (!nome) { toast('Digite o nome da novena', 'error'); return; }

  showModal = false;
  navigate('loading');

  try {
    const res = await fetch('/api/pesquisar-novena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });
    const data = await res.json();

    if (!res.ok || !data.opcoes || data.opcoes.length === 0) {
      toast(data.error || 'Nenhuma opção encontrada', 'error');
      navigate('home');
      return;
    }

    selecaoOpcoes = data.opcoes;
    selecaoIndex = 0;
    selecaoDias = data.opcoes[0].dias;
    navigate('selecao');
  } catch (err) {
    console.error(err);
    toast('Erro de conexão.', 'error');
    navigate('home');
  }
}

// Atualiza apenas o número de dias no picker sem re-renderizar tudo
function atualizarDiasPicker() {
  const val = document.getElementById('dias-valor');
  const btn = document.getElementById('btn-confirmar-selecao');
  if (val) val.textContent = selecaoDias;
  if (btn) btn.textContent = `Buscar novena de ${selecaoDias} dias →`;
}

// Etapa 2: busca o texto completo com o nome e dias confirmados
async function confirmarSelecao() {
  const opcao = selecaoOpcoes[selecaoIndex];
  if (!opcao) return;

  navigate('loading');

  try {
    const res = await fetch('/api/buscar-novena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: opcao.nome, dias: selecaoDias })
    });
    const data = await res.json();

    if (!res.ok) {
      toast(data.error || 'Erro ao gerar novena', 'error');
      navigate('selecao');
      return;
    }

    const state = getState();
    const novaNovena = {
      id: genId(),
      dataInicio: new Date().toISOString().slice(0, 10),
      diasConcluidos: Array(data.dias.length).fill(false),
      dados: data
    };
    state.novenas.unshift(novaNovena);
    saveState(state);
    navigate('detail', novaNovena.id);
    setTimeout(() => toast('Novena adicionada! 🙏', 'success'), 80);
  } catch (err) {
    console.error(err);
    toast('Erro de conexão.', 'error');
    navigate('selecao');
  }
}

function concluirDia() {
  const state = getState();
  const novena = state.novenas.find(n => n.id === currentNovennaId);
  if (!novena) return;

  novena.diasConcluidos[prayerDay] = true;
  saveState(state);

  const concluidos = novena.diasConcluidos.filter(Boolean).length;
  if (concluidos === 9) {
    toast('Parabéns! Novena concluída! 🎉', 'success');
  } else {
    toast(`${prayerDay + 1}º dia concluído! ✅`, 'success');
  }

  navigate('detail', currentNovennaId);
}

// ── UTILITÁRIOS ───────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function toast(msg, type = '') {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = `toast ${type}`;
  void el.offsetHeight; // força reflow para que a transição dispare
  el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── INIT ──────────────────────────────────────────────────────────
render();
