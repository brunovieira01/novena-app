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

// ── DETALHE ───────────────────────────────────────────────────────
function renderDetail() {
  const state = getState();
  const novena = state.novenas.find(n => n.id === currentNovennaId);
  if (!novena) { navigate('home'); return ''; }

  const { dados, diasConcluidos } = novena;
  const concluidos = diasConcluidos.filter(Boolean).length;
  const hoje = concluidos < 9 ? concluidos : 8; // índice 0-based do dia atual
  const concluida = concluidos === 9;

  const diasButtons = Array.from({ length: 9 }, (_, i) => {
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
          <div class="progress-stat"><div class="num">${9 - concluidos}</div><div class="lbl">dias restantes</div></div>
        </div>
      </div>

      <div class="dias-grid">${diasButtons}</div>
      ${rezarBtn}

      <div style="margin-top:16px; text-align:center">
        <button class="btn btn-ghost" id="btn-excluir" style="color:#e88; font-size:13px">Excluir novena</button>
      </div>
    </div>`;
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
      </div>

      <div class="prayer-footer">
        <div class="prayer-dots">${dots}</div>
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
  on('btn-fechar-prayer', () => navigate('detail', currentNovennaId));
  on('btn-proximo', () => { prayerStep++; render(); });
  on('btn-anterior', () => { prayerStep = Math.max(0, prayerStep - 1); render(); });
  on('btn-concluir-dia', concluirDia);
}

function on(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

// ── AÇÕES ─────────────────────────────────────────────────────────
async function buscarNovena() {
  const input = document.getElementById('input-novena');
  const nome = input ? input.value.trim() : '';
  if (!nome) { toast('Digite o nome da novena', 'error'); return; }

  showModal = false;
  navigate('loading');

  try {
    const res = await fetch('/api/buscar-novena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });

    const data = await res.json();

    if (!res.ok) {
      toast(data.error || 'Erro ao buscar novena', 'error');
      navigate('home');
      return;
    }

    const state = getState();
    const novaNovena = {
      id: genId(),
      dataInicio: new Date().toISOString().slice(0, 10),
      diasConcluidos: Array(9).fill(false),
      dados: data
    };
    state.novenas.unshift(novaNovena);
    saveState(state);
    toast('Novena adicionada! 🙏', 'success');
    navigate('detail', novaNovena.id);
  } catch (err) {
    console.error(err);
    toast('Erro de conexão. Verifique o servidor.', 'error');
    navigate('home');
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
  requestAnimationFrame(() => { el.classList.add('show'); });
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── INIT ──────────────────────────────────────────────────────────
render();
