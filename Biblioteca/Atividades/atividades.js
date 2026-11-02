import {
  activityNames,
  activityTypes,
  createMaze,
  dotFigure,
  parsePracticeWords,
  validateDraft,
} from './generators.mjs';
import { registerAIAdapter } from '../shared/ai.js';

const storagePrefix = 'qvc:early-education:v1:';
const svgNamespace = 'http://www.w3.org/2000/svg';
const palette = [
  ['#76b98a', 'Verde'],
  ['#efaf66', 'Laranja'],
  ['#a79bd8', 'Roxo'],
  ['#7bb6d7', 'Azul'],
  ['#e9a0ae', 'Rosa'],
  ['#f1d974', 'Amarelo'],
  ['#ffffff', 'Branco'],
];
const form = document.querySelector('#activity-form');
const preview = document.querySelector('#activity-preview');
const status = document.querySelector('#activity-status');
const requestedType = new URLSearchParams(location.search).get('tipo');
let state = loadDraft(activityTypes.includes(requestedType) ? requestedType : 'caligrafia');
let currentColor = palette[0][0];
let saveTimer;
let warnedStorage = false;

function defaults(type) {
  return {
    type,
    title: activityNames[type],
    instructions: '',
    words: 'CASA, BOLA, ESCOLA, AMIGO, FLOR, SOL',
    count: 6,
    complexity: 6,
    seed: 42,
    letterCase: 'upper',
    adaptation: 'standard',
    school: '',
    student: '',
    classroom: '',
    date: '',
    showSolution: false,
    fills: {},
  };
}

function loadDraft(type) {
  try {
    const raw = JSON.parse(localStorage.getItem(storagePrefix + type) || 'null');
    const valid = validateDraft(raw, type);
    if (!valid) return defaults(type);
    return {
      ...valid,
      instructions:
        typeof raw.instructions === 'string' && raw.instructions.length <= 1500
          ? raw.instructions
          : '',
    };
  } catch {
    return defaults(type);
  }
}

function persist() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(storagePrefix + state.type, JSON.stringify(state));
    return true;
  } catch {
    if (!warnedStorage)
      announce('O navegador não permitiu salvar. Imprima o material antes de sair.');
    warnedStorage = true;
    return false;
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 350);
}
function announce(message) {
  status.textContent = message;
}
function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function svgElement(tag, attributes = {}, text) {
  const node = document.createElementNS(svgNamespace, tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function drawing(viewBox, label, interactive = false) {
  return svgElement('svg', {
    viewBox,
    class: 'early-drawing',
    role: interactive ? 'group' : 'img',
    'aria-label': label,
  });
}

function syncForm() {
  Object.entries(state).forEach(([key, value]) => {
    const control = form.elements.namedItem(key);
    if (!control) return;
    if (control.type === 'checkbox') control.checked = value;
    else control.value = value;
  });
  document.querySelector('#tool-title').textContent = activityNames[state.type];
  document.title = `${activityNames[state.type]} — QVC Educação`;
  document.querySelector('#word-controls').hidden = state.type !== 'caligrafia';
  document.querySelector('#count-controls').hidden = !['caligrafia', 'coordenacao'].includes(
    state.type
  );
  document.querySelector('#activity-count').max = state.type === 'coordenacao' ? '8' : '12';
  document.querySelector('#maze-controls').hidden = state.type !== 'labirinto';
  document.querySelector('#solution-control').hidden = !['labirinto', 'pontos'].includes(
    state.type
  );
  document.querySelector('#color-controls').hidden = state.type !== 'colorir';
}

function readForm() {
  const values = new FormData(form);
  for (const key of [
    'title',
    'words',
    'school',
    'student',
    'classroom',
    'date',
    'letterCase',
    'adaptation',
  ])
    state[key] = String(values.get(key) || '');
  state.count = Math.max(
    1,
    Math.min(state.type === 'coordenacao' ? 8 : 12, Math.round(Number(values.get('count')) || 6))
  );
  state.complexity = Math.max(4, Math.min(12, Math.round(Number(values.get('complexity')) || 6)));
  state.showSolution = Boolean(values.get('showSolution'));
}

function header() {
  const node = element('header', 'early-document-header');
  node.setAttribute('data-qvc-school-header', '');
  node.append(element('small', '', 'QVC EDUCAÇÃO · DESCOBRIR É APRENDER'));
  node.append(element('h2', '', state.title.trim() || activityNames[state.type]));
  const fields = element('div', 'early-student-fields');
  const blank = '________________________________';
  const formattedDate = state.date
    ? state.date.split('-').reverse().join('/')
    : '____ / ____ / ______';
  fields.append(element('p', '', `Escola: ${state.school.trim() || blank}`));
  fields.append(element('p', '', `Nome do aluno: ${state.student.trim() || blank}`));
  fields.append(element('p', '', `Turma: ${state.classroom.trim() || '____________'}`));
  fields.append(element('p', '', `Data: ${formattedDate}`));
  node.append(fields);
  const instructions = {
    caligrafia: 'Passe o lápis pelas letras pontilhadas. Depois, escreva cada palavra na linha.',
    labirinto: 'Comece na seta e encontre o caminho até a estrela, sem atravessar as paredes.',
    colorir:
      'Escolha suas cores e dê vida ao desenho. Você também pode colorir a folha depois de imprimir.',
    pontos:
      'Ligue os números em ordem. Ao terminar, ligue o último ponto ao primeiro e descubra a figura.',
    coordenacao: 'Siga cada caminho pontilhado com o lápis, indo do círculo até a estrela.',
  };
  node.append(element('p', 'early-instruction', state.instructions || instructions[state.type]));
  return node;
}

function render() {
  preview.replaceChildren();
  preview.classList.toggle('early-spaced', state.adaptation === 'spaced');
  preview.append(header());
  if (state.adaptation === 'short') {
    const steps = element('div', 'early-steps');
    for (const text of ['1. Observe', '2. Faça com calma', '3. Confira'])
      steps.append(element('span', '', text));
    preview.append(steps);
  }
  const renderer = {
    caligrafia: renderHandwriting,
    labirinto: renderMaze,
    colorir: renderColoring,
    pontos: renderDots,
    coordenacao: renderTracing,
  }[state.type];
  preview.append(renderer());
  preview.append(
    element('footer', 'early-document-footer', 'QVC Educação · Um novo aprendizado, no seu ritmo.')
  );
}

function renderHandwriting() {
  const container = element('div', 'early-handwriting');
  const count = state.adaptation === 'short' ? Math.min(state.count, 4) : state.count;
  const words = parsePracticeWords(state.words, count);
  if (!words.length)
    return element('p', 'early-empty', 'Escreva pelo menos uma palavra para montar a atividade.');
  for (let word of words) {
    if (state.letterCase === 'upper') word = word.toLocaleUpperCase('pt-BR');
    if (state.letterCase === 'lower') word = word.toLocaleLowerCase('pt-BR');
    const row = element('div', 'early-tracing-row');
    const svg = svgElement('svg', {
      viewBox: '0 0 600 72',
      role: 'img',
      'aria-label': `Trace a palavra ${word}`,
    });
    svg.append(
      svgElement(
        'text',
        {
          x: 8,
          y: 52,
          fill: 'none',
          stroke: '#60758a',
          'stroke-width': 0.9,
          'stroke-dasharray': '1.3 2.3',
          'stroke-linecap': 'round',
          'font-family': 'Arial, sans-serif',
          'font-size': Math.min(52, 880 / Math.max(word.length, 1)),
          'font-weight': 600,
        },
        word
      )
    );
    row.append(svg, element('div', 'early-writing-rule'), element('div', 'early-writing-rule'));
    container.append(row);
  }
  return container;
}

function renderMaze() {
  const puzzle = createMaze(
    state.adaptation === 'short' ? Math.min(state.complexity, 6) : state.complexity,
    state.seed
  );
  const cell = 30;
  const svg = drawing(
    `-28 -10 ${puzzle.size * cell + 60} ${puzzle.size * cell + 20}`,
    'Labirinto com entrada na seta à esquerda e saída na estrela à direita'
  );
  svg.append(svgElement('text', { x: -25, y: 22, 'font-size': 24, fill: '#234d68' }, '→'));
  for (let index = 0; index < puzzle.walls.length; index++) {
    const x = (index % puzzle.size) * cell;
    const y = Math.floor(index / puzzle.size) * cell;
    const coordinates = [
      [x, y, x + cell, y],
      [x + cell, y, x + cell, y + cell],
      [x, y + cell, x + cell, y + cell],
      [x, y, x, y + cell],
    ];
    puzzle.walls[index].forEach((wall, direction) => {
      if (!wall) return;
      const [x1, y1, x2, y2] = coordinates[direction];
      svg.append(
        svgElement('line', {
          x1,
          y1,
          x2,
          y2,
          stroke: '#273a4b',
          'stroke-width': 2,
          'stroke-linecap': 'square',
        })
      );
    });
  }
  svg.append(
    svgElement(
      'text',
      { x: puzzle.size * cell + 5, y: puzzle.size * cell - 7, 'font-size': 22, fill: '#234d68' },
      '★'
    )
  );
  if (state.showSolution)
    svg.append(
      svgElement('polyline', {
        points: puzzle.solution
          .map(
            (index) =>
              `${(index % puzzle.size) * cell + 15},${Math.floor(index / puzzle.size) * cell + 15}`
          )
          .join(' '),
        fill: 'none',
        stroke: '#346786',
        'stroke-width': 4,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        opacity: 0.75,
      })
    );
  return svg;
}

function renderDots() {
  const figure = dotFigure(state.seed);
  const svg = drawing(
    '40 30 420 370',
    `Ligue os ${figure.points.length} pontos numerados para descobrir ${figure.name}`
  );
  if (state.showSolution)
    svg.append(
      svgElement('polygon', {
        points: figure.points.map((point) => point.join(',')).join(' '),
        fill: 'none',
        stroke: '#346786',
        'stroke-width': 2,
      })
    );
  figure.points.forEach(([x, y], index) => {
    svg.append(svgElement('circle', { cx: x, cy: y, r: 3.5, fill: '#273a4b' }));
    svg.append(
      svgElement(
        'text',
        {
          x: x + 9,
          y: y - 9,
          fill: '#273a4b',
          'font-size': state.adaptation === 'spaced' ? 22 : 18,
          'font-family': 'Arial, sans-serif',
        },
        index + 1
      )
    );
  });
  return svg;
}

function renderTracing() {
  const count = state.adaptation === 'short' ? Math.min(state.count, 4) : Math.min(state.count, 8);
  const svg = drawing(
    `0 0 600 ${count * 95 + 25}`,
    `${count} caminhos pontilhados para seguir com o lápis`
  );
  for (let index = 0; index < count; index++) {
    const y = 55 + index * 95;
    const mode = (index + state.seed) % 3;
    const path =
      mode === 0
        ? `M35 ${y} l50 -35 50 70 50 -70 50 70 50 -70 50 70 50 -70 50 70 50 -35`
        : mode === 1
          ? `M35 ${y} q55 -55 110 0 t110 0 t110 0 t110 0`
          : `M35 ${y} h30 q0 -32 30 -32 t30 32 q0 32 30 32 t30 -32 q0 -32 30 -32 t30 32 q0 32 30 32 t30 -32 q0 -32 30 -32 t30 32 h90`;
    svg.append(svgElement('circle', { cx: 35, cy: y, r: 7, fill: '#346786' }));
    svg.append(
      svgElement('path', {
        d: `${path} H 535`,
        stroke: '#596e82',
        'stroke-width': state.adaptation === 'short' ? 4 : 3,
        'stroke-dasharray': '3 8',
        fill: 'none',
        'stroke-linecap': 'round',
      })
    );
    svg.append(svgElement('text', { x: 540, y: y + 7, 'font-size': 24, fill: '#346786' }, '★'));
  }
  return svg;
}

function renderColoring() {
  const svg = drawing(
    '20 0 490 420',
    state.seed % 2 ? 'Uma casa com sol para colorir' : 'Um jardim com três flores para colorir',
    true
  );
  let shapeIndex = 0;
  function part(tag, attrs, label) {
    const key = `part-${shapeIndex++}`;
    const shape = svgElement(tag, {
      ...attrs,
      fill: state.fills[key] || '#ffffff',
      stroke: '#273a4b',
      'stroke-width': 2.5,
      'stroke-linejoin': 'round',
      role: 'button',
      tabindex: 0,
      'aria-label': `Colorir ${label}`,
    });
    function paint() {
      state.fills[key] = currentColor;
      shape.setAttribute('fill', currentColor);
      scheduleSave();
      announce(
        `${label[0].toLocaleUpperCase('pt-BR') + label.slice(1)} pintado. Escolha outra parte para continuar.`
      );
    }
    shape.addEventListener('click', paint);
    shape.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        paint();
      }
    });
    return shape;
  }
  if (state.seed % 2) {
    svg.append(part('path', { d: 'M145 215h225v145H145Z' }, 'a casa'));
    svg.append(part('path', { d: 'm120 215 137-120 138 120Z' }, 'o telhado'));
    svg.append(part('rect', { x: 235, y: 270, width: 50, height: 90 }, 'a porta'));
    svg.append(part('rect', { x: 172, y: 245, width: 40, height: 40 }, 'a janela esquerda'));
    svg.append(part('rect', { x: 310, y: 245, width: 40, height: 40 }, 'a janela direita'));
    svg.append(part('circle', { cx: 426, cy: 62, r: 32 }, 'o sol'));
    svg.append(part('path', { d: 'M45 360q20-70 55 0m305 0q20-70 55 0' }, 'a grama'));
  } else {
    [130, 260, 390].forEach((cx, index) => {
      svg.append(
        svgElement('path', {
          d: `M${cx} 205v155`,
          stroke: '#273a4b',
          'stroke-width': 3,
          fill: 'none',
        })
      );
      svg.append(
        part(
          'path',
          { d: `M${cx} 290q-65-55-48-10q20 20 48 10m0 25q65-55 48-10q-20 20-48 10` },
          `as folhas da flor ${index + 1}`
        )
      );
      for (let petal = 0; petal < 6; petal++)
        svg.append(
          part(
            'ellipse',
            { cx, cy: 155, rx: 24, ry: 43, transform: `rotate(${petal * 60} ${cx} 200)` },
            `a pétala ${petal + 1} da flor ${index + 1}`
          )
        );
      svg.append(part('circle', { cx, cy: 200, r: 24 }, `o centro da flor ${index + 1}`));
    });
  }
  svg.append(
    svgElement('path', { d: 'M35 365h455', stroke: '#273a4b', 'stroke-width': 3, fill: 'none' })
  );
  return svg;
}

function initializePalette() {
  const container = document.querySelector('#palette');
  palette.forEach(([color, name]) => {
    const button = element('button', 'early-color');
    button.type = 'button';
    button.style.backgroundColor = color;
    button.setAttribute('aria-label', `Cor ${name.toLocaleLowerCase('pt-BR')}`);
    button.setAttribute('aria-pressed', String(color === currentColor));
    button.addEventListener('click', () => {
      currentColor = color;
      container
        .querySelectorAll('button')
        .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      announce(`Cor ${name.toLocaleLowerCase('pt-BR')} selecionada.`);
    });
    container.append(button);
  });
}

form.addEventListener('submit', (event) => event.preventDefault());
form.addEventListener('input', (event) => {
  if (event.target.name === 'type') return;
  readForm();
  render();
  scheduleSave();
});
document.querySelector('#activity-type').addEventListener('change', (event) => {
  persist();
  state = loadDraft(event.target.value);
  const url = new URL(location.href);
  url.searchParams.set('tipo', state.type);
  history.replaceState(null, '', url);
  syncForm();
  render();
  announce(`${activityNames[state.type]} pronta para personalizar.`);
});
document.querySelector('#regenerate').addEventListener('click', () => {
  state.seed = (state.seed + 1) >>> 0;
  state.fills = {};
  render();
  persist();
  announce(
    state.type === 'caligrafia'
      ? 'Folha pronta para uma nova prática. Edite as palavras para personalizar.'
      : 'Uma nova versão está pronta na prévia.'
  );
});
document.querySelector('#save-activity').addEventListener('click', () => {
  if (persist()) {
    announce('Atividade guardada neste navegador. Ela será recuperada quando você voltar.');
    window.dispatchEvent(
      new CustomEvent('qvc:activity-created', {
        detail: { id: `infantil-${state.type}`, title: state.title || activityNames[state.type] },
      })
    );
  }
});
document.querySelector('#print-activity').addEventListener('click', () => {
  persist();
  if (window.QVC?.print) window.QVC.print();
  else window.print();
});

initializePalette();
syncForm();
render();

registerAIAdapter({
  kind: 'handwriting',
  label: 'Caligrafia',
  description:
    'Crie palavras e frases curtas para uma folha de caligrafia. A aplicação atualiza o título e as palavras, preservando os dados escolares.',
  maxCount: 12,
  apply(data) {
    const next = {
      ...state,
      type: 'caligrafia',
      title: data.title,
      words: data.sentences.join('\n'),
      count: data.sentences.length,
      fills: {},
    };
    const valid = validateDraft(next, 'caligrafia');
    if (!valid) throw new Error('Confira as frases antes de aplicar à caligrafia.');
    if (state.type !== 'caligrafia') persist();
    state = { ...valid, instructions: data.instructions };
    const url = new URL(location.href);
    url.searchParams.set('tipo', state.type);
    history.replaceState(null, '', url);
    syncForm();
    render();
    persist();
    announce('Caligrafia atualizada. Confira as palavras e a folha antes de imprimir.');
  },
});
