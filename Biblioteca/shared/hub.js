import { tools, categories, searchTools } from './catalog.js';
import { readProfile, saveProfile } from './hub-state.js';
const base = new URL('../', import.meta.url),
  sprites = new URL('./icons.svg', import.meta.url);
const $ = (selector) => document.querySelector(selector);
const create = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', sprites.href + '#' + name);
  svg.append(use);
  return svg;
}
let profile = readProfile(),
  view = 'explore';
const params = new URLSearchParams(location.search);
$('#hub-search').value = params.get('q') || '';
for (const category of categories) {
  const option = create('option', '', category.name);
  option.value = category.name;
  $('#category-filter').append(option);
  const nav = create('button', 'hub-nav');
  nav.append(icon(category.icon), document.createTextNode(category.name));
  nav.addEventListener('click', () => selectCategory(category.name));
  $('#hub-category-nav').append(nav);
  const card = create('button', `hub-category-card rounded-2xl`);
  const art = create('span', `hub-category-icon tone-${category.color}`);
  art.append(icon(category.icon));
  card.append(
    art,
    create('strong', '', category.name),
    create('small', '', category.description),
    create(
      'span',
      'hub-category-count',
      `${tools.filter((t) => t.category === category.name).length} ferramentas →`
    )
  );
  card.addEventListener('click', () => selectCategory(category.name));
  $('#hub-categories').append(card);
}
if (categories.some((c) => c.name === params.get('categoria')))
  $('#category-filter').value = params.get('categoria');
$('#tool-count').textContent = `${tools.length} ferramentas`;
function cardFor(tool) {
  const color = categories.find((c) => c.name === tool.category)?.color || 'blue',
    card = create('article', 'hub-tool-card rounded-2xl');
  card.dataset.toolId = tool.id;
  const art = create('div', `hub-card-art tone-${color}`);
  art.setAttribute('aria-hidden', 'true');
  art.append(icon(tool.icon), create('span', 'hub-art-ring'), create('span', 'hub-art-plus', '+'));
  const favorite = create('button', 'hub-favorite');
  const saved = profile.favorites.includes(tool.id);
  favorite.setAttribute(
    'aria-label',
    `${saved ? 'Remover' : 'Adicionar'} ${tool.name} ${saved ? 'dos' : 'aos'} favoritos`
  );
  favorite.setAttribute('aria-pressed', String(saved));
  favorite.classList.toggle('is-favorite', saved);
  favorite.append(icon('star'));
  favorite.addEventListener('click', () => {
    profile.favorites = saved
      ? profile.favorites.filter((id) => id !== tool.id)
      : [...profile.favorites, tool.id];
    if (!saveProfile(profile))
      window.QVC?.announce('O navegador não permitiu guardar seus favoritos.');
    render();
  });
  const body = create('div', 'hub-card-body');
  const heading = create('h3');
  const link = create('a', 'hub-card-link', tool.name);
  link.href = new URL(tool.path, base).href;
  heading.append(link, create('span', 'hub-card-arrow', '↗'));
  const footer = create('div', 'hub-card-footer');
  footer.append(
    create(
      'span',
      '',
      tool.category === 'Professores' ? 'Para educadores' : 'Aprenda no seu ritmo'
    ),
    create('span', 'hub-free', 'Gratuito')
  );
  body.append(
    create('span', `hub-card-category text-${color}`, tool.category),
    heading,
    create('p', '', tool.description),
    footer
  );
  card.append(art, favorite, body);
  return card;
}
function render() {
  profile = readProfile();
  const query = $('#hub-search').value,
    category = $('#category-filter').value;
  let result = searchTools(query, category);
  if (view === 'favorites') result = result.filter((t) => profile.favorites.includes(t.id));
  const isLibrary = ['explore', 'favorites'].includes(view);
  $('#hub-intro').hidden = view !== 'explore' || Boolean(query || category);
  $('#hub-library').hidden = !isLibrary;
  $('#hub-history').hidden = view !== 'history';
  $('#hub-assistant').hidden = view !== 'assistant';
  $('#hub-tools').replaceChildren(...result.map(cardFor));
  $('#featured-tools').replaceChildren(...tools.filter((t) => t.featured).map(cardFor));
  $('#favorites-count').textContent = String(profile.favorites.length);
  $('#results-count').textContent =
    `${result.length} ${result.length === 1 ? 'ferramenta encontrada' : 'ferramentas encontradas'}`;
  $('#hub-empty').hidden = result.length > 0;
  $('#library-title').textContent =
    view === 'favorites' ? 'Suas ferramentas favoritas' : category || 'Explore a biblioteca';
  $('#view-label').textContent = {
    explore: 'Explorar',
    favorites: 'Favoritos',
    history: 'Meu espaço',
    assistant: 'Ideias para a aula',
  }[view];
  document.querySelectorAll('[data-view]').forEach((node) => {
    const active = node.dataset.view === view;
    node.classList.toggle('active', active);
    node.setAttribute('aria-pressed', String(active));
  });
  if (view === 'history') renderHistory();
  const updated = new URL(location.href);
  if (query) updated.searchParams.set('q', query);
  else updated.searchParams.delete('q');
  if (category) updated.searchParams.set('categoria', category);
  else updated.searchParams.delete('categoria');
  history.replaceState(null, '', updated);
}
function setView(next) {
  view = next;
  $('#hub-search').value = '';
  $('#category-filter').value = '';
  render();
  closeMenu();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function selectCategory(category) {
  view = 'explore';
  $('#category-filter').value = category;
  $('#hub-search').value = '';
  render();
  closeMenu();
  $('#hub-library').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function renderHistory() {
  const points = profile.explored.length * 20;
  const progress = create('div', 'hub-progress-card');
  progress.append(
    icon('sparkles'),
    create('div', '', `Explorador · nível ${Math.floor(points / 100) + 1}`),
    create('strong', '', `${profile.explored.length} ferramentas exploradas · ${points} pontos`)
  );
  $('#hub-progress').replaceChildren(progress);
  const list = $('#hub-history-list');
  list.replaceChildren();
  if (!profile.history.length) {
    list.append(
      create(
        'p',
        'hub-empty',
        'Sua jornada está começando. Explore uma ferramenta para registrar sua primeira descoberta.'
      )
    );
    return;
  }
  for (const entry of profile.history) {
    const tool = tools.find((t) => t.id === entry.id);
    if (!tool) continue;
    const row = create('div', 'hub-history-row');
    row.append(icon(tool.icon));
    const text = create('span');
    const link = create('a', '', entry.title);
    link.href = new URL(tool.path, base).href;
    text.append(
      link,
      create(
        'small',
        '',
        new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
          new Date(entry.date)
        )
      )
    );
    row.append(text);
    list.append(row);
  }
}
$('#hub-search').addEventListener('input', () => {
  view = 'explore';
  render();
});
$('#hub-search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  $('#hub-library').scrollIntoView({ behavior: 'smooth' });
});
$('#category-filter').addEventListener('change', () => {
  view = 'explore';
  render();
});
document
  .querySelectorAll('[data-view]')
  .forEach((node) => node.addEventListener('click', () => setView(node.dataset.view)));
document.querySelectorAll('[data-query]').forEach((node) =>
  node.addEventListener('click', () => {
    view = 'explore';
    $('#hub-search').value = node.dataset.query;
    render();
  })
);
$('#clear-filters').addEventListener('click', () => setView('explore'));
$('#show-all').addEventListener('click', () => {
  $('#hub-library').scrollIntoView({ behavior: 'smooth' });
  $('#hub-search').focus();
});
$('#quick-search').addEventListener('click', () => {
  setView('explore');
  $('#hub-search').focus();
});
function closeMenu() {
  document.body.classList.remove('hub-menu-open');
  $('#mobile-menu').setAttribute('aria-expanded', 'false');
}
$('#mobile-menu').addEventListener('click', () => {
  const open = document.body.classList.toggle('hub-menu-open');
  $('#mobile-menu').setAttribute('aria-expanded', String(open));
  if (open) $('.hub-sidebar a').focus();
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    setView('explore');
    $('#hub-search').focus();
  }
  if (event.key === 'Escape') closeMenu();
});
const about = $('#hub-about-dialog');
let aboutTrigger = null;
function openAbout(event) {
  aboutTrigger = event.currentTarget;
  about.showModal();
}
$('#hub-about').addEventListener('click', openAbout);
$('#about-footer').addEventListener('click', openAbout);
$('#close-about').addEventListener('click', () => about.close());
about.addEventListener('close', () => aboutTrigger?.focus());
let theme;
try {
  theme = localStorage.getItem('qvc-hub-theme');
} catch {}
if (['light', 'dark', 'kids'].includes(theme)) document.documentElement.dataset.qvcTheme = theme;
$('#theme-toggle').addEventListener('click', () => {
  const themes = ['light', 'dark', 'kids'];
  const next =
    themes[(themes.indexOf(document.documentElement.dataset.qvcTheme || 'light') + 1) % 3];
  document.documentElement.dataset.qvcTheme = next;
  try {
    localStorage.setItem('qvc-hub-theme', next);
  } catch {}
  window.QVC?.announce(
    `Tema ${next === 'dark' ? 'escuro' : next === 'kids' ? 'infantil' : 'claro'} ativado.`
  );
});
$('#clear-history').addEventListener('click', () => {
  profile.history = [];
  saveProfile(profile);
  render();
  window.QVC?.announce('Histórico de visitas limpo. Os favoritos foram preservados.');
});
$('#assistant-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const topic = String(data.get('topic')).trim(),
    goal = data.get('goal'),
    level = data.get('level');
  if (topic.length < 2) {
    window.QVC?.announce('Escreva um tema com pelo menos duas letras.');
    return;
  }
  const result = $('#assistant-result');
  const title = create('h2', '', `Uma aula sobre ${topic}`);
  const intro = create(
    'p',
    '',
    `${level} · ${goal}. Comece com uma conversa e apresente objetos ou imagens relacionados ao tema.`
  );
  const steps = create('ol');
  for (const text of [
    'Observe: o que a turma já sabe sobre o tema?',
    goal === 'Matemática'
      ? 'Conte objetos e compare quantidades em pequenos grupos.'
      : goal === 'Criatividade'
        ? 'Crie um desenho ou uma história com um novo personagem.'
        : 'Escolha palavras do tema e explore seus sons e letras.',
    'Compartilhe as descobertas. Ofereça pausas e tempo para diferentes ritmos.',
  ])
    steps.append(create('li', '', text));
  const link = create('a', 'hub-button', 'Preparar uma atividade →');
  link.href = new URL(
    goal === 'Criatividade'
      ? 'Atividades/index.html?tipo=colorir'
      : goal === 'Matemática'
        ? 'Calculos/index.html#tool/tabuada'
        : 'Caça-Palavras/cacapalavras.html',
    base
  ).href;
  result.replaceChildren(title, intro, steps, link);
});
render();
