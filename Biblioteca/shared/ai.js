/** Interface ChatGPT: usa somente a API local protegida, sem chave OpenAI no navegador. */
import { AI_LIMITS, validateAIRequest, validateAIResult } from './ai-contract.js';

const adapters = new Map();
const STYLE_URL = new URL('./ai.css', import.meta.url).href;
const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
const LEVELS = [
  'Educação infantil',
  'Ensino fundamental · anos iniciais',
  'Ensino fundamental · anos finais',
  'Ensino médio',
];
let dialog, launcher, selectedAdapter, lastRequest, readPreview, controller, returnFocus;
let authenticated = false;
let configured = false;
let busy = false;
let idCounter = 0;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function button(text, id, action, secondary = false) {
  const node = element(
    'button',
    text,
    `qvc-ai-button${secondary ? ' qvc-ai-button-secondary' : ''}`
  );
  node.type = 'button';
  if (id) node.id = id;
  if (action) node.addEventListener('click', action);
  return node;
}
function field(parent, label, value, options = {}) {
  const wrapper = element('label', label, 'qvc-ai-field');
  const input = element(options.tag || 'input');
  if (input instanceof HTMLInputElement) input.type = options.type || 'text';
  input.id = options.id || `qvc-ai-field-${++idCounter}`;
  input.value = String(value ?? '');
  for (const key of ['required', 'maxLength', 'rows', 'min', 'max', 'step'])
    if (options[key] !== undefined) input[key] = options[key];
  wrapper.append(input);
  parent.append(wrapper);
  return input;
}
function selectField(parent, label, items, value, id) {
  const wrapper = element('label', label, 'qvc-ai-field');
  const select = element('select');
  select.id = id || `qvc-ai-field-${++idCounter}`;
  for (const [key, label] of items) {
    const option = element('option', label);
    option.value = String(key);
    select.append(option);
  }
  select.value = String(value);
  wrapper.append(select);
  parent.append(wrapper);
  return select;
}
function message(text = '', error = false) {
  const region = dialog.querySelector('#qvc-ai-status');
  region.textContent = text;
  region.dataset.error = String(error);
  region.setAttribute('role', error ? 'alert' : 'status');
}
function maximum() {
  const requested =
    typeof selectedAdapter?.maxCount === 'function'
      ? selectedAdapter.maxCount()
      : selectedAdapter?.maxCount;
  return Math.max(
    0,
    Math.min(
      AI_LIMITS[selectedAdapter?.kind] || 0,
      requested ?? AI_LIMITS[selectedAdapter?.kind] ?? 0
    )
  );
}
function updateAvailability() {
  if (!dialog) return;
  dialog.querySelector('#qvc-ai-request-fields').disabled = busy;
  dialog.querySelector('#qvc-ai-generate').disabled =
    busy || !configured || !authenticated || maximum() < 1;
  dialog.querySelector('#qvc-ai-login').disabled = busy;
  dialog.querySelector('#qvc-ai-logout').hidden = !authenticated;
  dialog.querySelector('#qvc-ai-logout').disabled = busy;
  dialog.querySelector('#qvc-ai-login-form').hidden = !configured || authenticated;
  dialog.querySelector('#qvc-ai-apply').disabled =
    busy || !readPreview || !dialog.querySelector('#qvc-ai-reviewed').checked;
  dialog.querySelector('#qvc-ai-cancel').hidden = !busy;
  dialog.setAttribute('aria-busy', String(busy));
}
function working(value, generating = false) {
  busy = value;
  dialog.querySelector('.qvc-ai-spinner').hidden = !value || !generating;
  dialog.querySelector('#qvc-ai-generate-label').textContent =
    value && generating ? 'Gerando conteúdo…' : 'Gerar com ChatGPT';
  updateAvailability();
}
async function api(action, body, signal) {
  let response;
  try {
    response = await fetch(`/api/ai/${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      navigator.onLine === false
        ? 'Você está sem conexão. Conecte-se para gerar com ChatGPT; as ferramentas locais continuam disponíveis.'
        : 'Não foi possível conectar ao serviço de IA. Tente novamente em instantes.'
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      'O serviço de IA não está disponível neste endereço. Peça ao administrador para ativá-lo.'
    );
  }
  if (!response.ok) {
    if (response.status === 401) authenticated = false;
    const error = new Error(
      payload?.error?.message || 'Não foi possível concluir o pedido. Tente novamente.'
    );
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
}
async function operation(action, generating = false) {
  controller?.abort('replaced');
  const active = new AbortController();
  controller = active;
  const timer = setTimeout(() => active.abort('timeout'), 65000);
  working(true, generating);
  try {
    await action(active.signal);
  } catch (error) {
    if (controller !== active) return;
    if (active.signal.aborted) {
      if (dialog.open)
        message(
          active.signal.reason === 'timeout'
            ? 'O serviço demorou mais que o esperado. Tente novamente com uma quantidade menor.'
            : 'Pedido cancelado. Seu rascunho foi preservado.'
        );
    } else message(error.message || 'Não foi possível concluir o pedido.', true);
  } finally {
    clearTimeout(timer);
    if (controller === active) {
      controller = null;
      working(false);
    }
  }
}
function previewQuestion(parent, question, index) {
  const group = element('fieldset', undefined, 'qvc-ai-question');
  const types = {
    multiple: 'Múltipla escolha',
    open: 'Dissertativa',
    truefalse: 'Verdadeiro ou falso',
  };
  group.append(element('legend', `${index + 1}. ${types[question.type]}`));
  const prompt = field(group, 'Enunciado', question.prompt, {
    tag: 'textarea',
    rows: 3,
    maxLength: 2000,
    required: true,
  });
  const points = field(group, 'Pontos', question.points, {
    type: 'number',
    min: 0,
    max: 1000,
    step: 0.01,
  });
  let specific;
  if (question.type === 'multiple') {
    const options = question.options.map((value, i) =>
      field(group, `Alternativa ${String.fromCharCode(65 + i)}`, value, {
        maxLength: 500,
        required: true,
      })
    );
    const answer = selectField(
      group,
      'Alternativa correta',
      options.map((_, i) => [i, String.fromCharCode(65 + i)]),
      question.answer
    );
    specific = () => ({
      options: options.map((input) => input.value),
      answer: Number(answer.value),
    });
  } else if (question.type === 'open') {
    const lines = field(group, 'Linhas para resposta', question.lines, {
      type: 'number',
      min: 2,
      max: 12,
    });
    const answer = field(group, 'Resposta esperada / critérios', question.modelAnswer, {
      tag: 'textarea',
      rows: 3,
      maxLength: 2000,
    });
    specific = () => ({ lines: Number(lines.value), modelAnswer: answer.value });
  } else {
    const statements = question.statements.map((statement, i) => {
      const text = field(group, `Afirmação ${i + 1}`, statement.text, {
        tag: 'textarea',
        rows: 2,
        maxLength: 700,
        required: true,
      });
      const answer = selectField(
        group,
        `Gabarito da afirmação ${i + 1}`,
        [
          ['true', 'Verdadeiro'],
          ['false', 'Falso'],
        ],
        String(statement.answer)
      );
      return () => ({ text: text.value, answer: answer.value === 'true' });
    });
    specific = () => ({ statements: statements.map((read) => read()) });
  }
  parent.append(group);
  return () => ({
    type: question.type,
    prompt: prompt.value,
    points: Number(points.value),
    ...specific(),
  });
}
function renderPreview(data) {
  const preview = dialog.querySelector('#qvc-ai-preview');
  preview.replaceChildren(element('h3', 'Revise antes de usar'));
  preview.append(
    element(
      'p',
      'O ChatGPT pode cometer erros. Confira informações, adequação à turma, respostas e pontuação antes de aplicar.',
      'qvc-ai-muted'
    )
  );
  const title = field(preview, 'Título da atividade', data.title, {
    id: 'qvc-ai-title',
    maxLength: 120,
    required: true,
  });
  const instructions = field(preview, 'Instruções', data.instructions, {
    id: 'qvc-ai-instructions',
    tag: 'textarea',
    rows: 2,
    maxLength: 1500,
  });
  let readItems;
  if (data.kind === 'words' || data.kind === 'handwriting') {
    const isWords = data.kind === 'words';
    const input = field(
      preview,
      isWords
        ? 'Uma palavra por linha · até 16 letras'
        : 'Uma palavra ou frase curta por linha · até 28 caracteres',
      (isWords ? data.words : data.sentences).join('\n'),
      { id: 'qvc-ai-items', tag: 'textarea', rows: 8, maxLength: 5000 }
    );
    readItems = () => ({
      [isWords ? 'words' : 'sentences']: input.value
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
    });
  } else if (data.kind === 'exam') {
    const questions = data.questions.map((question, index) =>
      previewQuestion(preview, question, index)
    );
    readItems = () => ({ questions: questions.map((read) => read()) });
  } else {
    preview.append(
      element(
        'p',
        'Período 1 é o primeiro horário cadastrado, em ordem de início. Use um professor já cadastrado ou deixe vazio para definir depois. As aulas existentes serão preservadas.',
        'qvc-ai-muted'
      )
    );
    const lessons = data.lessons.map((lesson, index) => {
      const group = element('fieldset', undefined, 'qvc-ai-question qvc-ai-lesson');
      group.append(element('legend', `Aula ${index + 1}`));
      const day = selectField(
        group,
        'Dia da semana',
        DAYS.map((label, i) => [i, label]),
        lesson.day
      );
      const period = field(group, 'Período da aula', lesson.period, {
        type: 'number',
        min: 1,
        max: lastRequest?.periodCount || 8,
      });
      const subject = field(group, 'Disciplina / atividade', lesson.subject, {
        maxLength: 100,
        required: true,
      });
      const teacher = field(group, 'Professor (opcional)', lesson.teacher, { maxLength: 120 });
      preview.append(group);
      return () => ({
        day: Number(day.value),
        period: Number(period.value),
        subject: subject.value,
        teacher: teacher.value,
      });
    });
    readItems = () => ({ lessons: lessons.map((read) => read()) });
  }
  readPreview = () => ({
    kind: data.kind,
    title: title.value,
    instructions: instructions.value,
    ...readItems(),
  });
  dialog.querySelector('#qvc-ai-reviewed').checked = false;
  dialog.querySelector('#qvc-ai-review-actions').hidden = false;
  preview.hidden = false;
  preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateAvailability();
}
function setupDialog() {
  dialog = element('dialog', undefined, 'qvc-ai-dialog qvc-no-print');
  dialog.id = 'qvc-ai-dialog';
  dialog.setAttribute('aria-labelledby', 'qvc-ai-heading');
  dialog.setAttribute('aria-describedby', 'qvc-ai-intro');
  const header = element('div', undefined, 'qvc-ai-heading-row');
  const heading = element('h2', 'Criar com ChatGPT');
  heading.id = 'qvc-ai-heading';
  const close = button('Fechar ×', 'qvc-ai-close', () => dialog.close(), true);
  close.setAttribute('aria-label', 'Fechar assistente ChatGPT');
  header.append(heading, close);
  const intro = element(
    'p',
    'Descreva um tema sem incluir nomes ou dados de alunos. O pedido envia tema, etapa e quantidade; no horário, também envia o número de períodos. Os dados escolares do seu rascunho permanecem neste navegador.',
    'qvc-ai-muted'
  );
  intro.id = 'qvc-ai-intro';
  const description = element('p', '', 'qvc-ai-context');
  description.id = 'qvc-ai-context';
  const status = element('p', '', 'qvc-ai-status');
  status.id = 'qvc-ai-status';
  status.setAttribute('aria-live', 'polite');
  const login = element('form', undefined, 'qvc-ai-login-form');
  login.id = 'qvc-ai-login-form';
  login.hidden = true;
  login.append(
    element('p', 'Digite a senha de acesso fornecida pela escola ou pelo administrador.')
  );
  const password = field(login, 'Senha de acesso ao assistente', '', {
    id: 'qvc-ai-password',
    type: 'password',
    required: true,
    maxLength: 256,
  });
  password.autocomplete = 'current-password';
  const loginButton = button('Entrar no assistente', 'qvc-ai-login');
  loginButton.type = 'submit';
  login.append(loginButton);
  login.addEventListener('submit', (event) => {
    event.preventDefault();
    if (busy) return;
    const value = password.value;
    password.value = '';
    operation(async (signal) => {
      await api('login', { password: value }, signal);
      authenticated = true;
      message('Acesso liberado. Escolha o tema e gere sua proposta.');
    });
  });
  const form = element('form', undefined, 'qvc-ai-request');
  form.id = 'qvc-ai-form';
  const fields = element('fieldset', undefined, 'qvc-ai-request-fields');
  fields.id = 'qvc-ai-request-fields';
  fields.append(element('legend', 'Personalize sua proposta'));
  const topic = field(fields, 'Tema da atividade', '', {
    id: 'qvc-ai-topic',
    tag: 'textarea',
    rows: 2,
    maxLength: 300,
    required: true,
  });
  topic.placeholder = 'Ex.: ecossistema marinho ou regra de três simples';
  const grid = element('div', undefined, 'qvc-ai-grid');
  selectField(
    grid,
    'Etapa de ensino',
    LEVELS.map((label) => [label, label]),
    LEVELS[1],
    'qvc-ai-level'
  );
  field(grid, 'Quantidade de itens', 5, {
    id: 'qvc-ai-count',
    type: 'number',
    min: 1,
    max: 20,
    required: true,
  });
  fields.append(grid);
  form.append(fields);
  const actions = element('div', undefined, 'qvc-ai-actions');
  const generate = button('', 'qvc-ai-generate');
  generate.type = 'submit';
  const spinner = element('span', undefined, 'qvc-ai-spinner');
  spinner.hidden = true;
  spinner.setAttribute('aria-hidden', 'true');
  const generateLabel = element('span', 'Gerar com ChatGPT');
  generateLabel.id = 'qvc-ai-generate-label';
  generate.append(spinner, generateLabel);
  const cancel = button(
    'Cancelar pedido',
    'qvc-ai-cancel',
    () => controller?.abort('cancelled'),
    true
  );
  cancel.hidden = true;
  const logout = button(
    'Sair do assistente',
    'qvc-ai-logout',
    () =>
      operation(async (signal) => {
        await api('logout', {}, signal);
        authenticated = false;
        message('Acesso encerrado neste navegador.');
      }),
    true
  );
  logout.hidden = true;
  actions.append(generate, cancel, logout);
  form.append(actions);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (busy || !configured || !authenticated) return;
    let request;
    try {
      request = validateAIRequest({
        ...(typeof selectedAdapter.requestDetails === 'function'
          ? selectedAdapter.requestDetails()
          : {}),
        kind: selectedAdapter.kind,
        topic: topic.value,
        level: dialog.querySelector('#qvc-ai-level').value,
        count: Number(dialog.querySelector('#qvc-ai-count').value),
      });
      if (request.count > maximum())
        throw new Error(`Use até ${maximum()} itens disponíveis nesta ferramenta.`);
    } catch (error) {
      message(error.message, true);
      return;
    }
    operation(async (signal) => {
      message('Criando uma proposta para você revisar…');
      const response = await api('generate', request, signal);
      if (signal.aborted) return;
      const data = validateAIResult(response.data, request);
      lastRequest = request;
      renderPreview(data);
      message('Proposta pronta. Revise e edite os campos antes de aplicar.');
    }, true);
  });
  const preview = element('section', undefined, 'qvc-ai-preview');
  preview.id = 'qvc-ai-preview';
  preview.hidden = true;
  preview.setAttribute('aria-label', 'Proposta editável do ChatGPT');
  const review = element('div', undefined, 'qvc-ai-review-actions');
  review.id = 'qvc-ai-review-actions';
  review.hidden = true;
  const reviewLabel = element('label', undefined, 'qvc-ai-review-check');
  const checked = element('input');
  checked.type = 'checkbox';
  checked.id = 'qvc-ai-reviewed';
  checked.addEventListener('change', updateAvailability);
  reviewLabel.append(
    checked,
    document.createTextNode('Revisei o conteúdo e quero aplicá-lo ao meu rascunho.')
  );
  const apply = button('Aplicar ao rascunho', 'qvc-ai-apply', async () => {
    if (busy || !checked.checked || !readPreview) return;
    try {
      const data = validateAIResult(readPreview(), lastRequest);
      await selectedAdapter.apply(data);
      dialog.close();
      window.QVC?.announce('Conteúdo aplicado. Revise a atividade antes de imprimir.');
    } catch (error) {
      message(error.message || 'Não foi possível aplicar. Seu rascunho foi preservado.', true);
    }
  });
  apply.disabled = true;
  review.append(reviewLabel, apply);
  dialog.append(header, intro, description, status, login, form, preview, review);
  dialog.addEventListener('close', () => {
    controller?.abort('closed');
    password.value = '';
    returnFocus?.focus();
  });
  document.body.append(dialog);
}
export function initAI() {
  if (!document.body || !adapters.size) return;
  if (!document.querySelector('link[data-qvc-ai-style]')) {
    const style = element('link');
    style.rel = 'stylesheet';
    style.href = STYLE_URL;
    style.dataset.qvcAiStyle = '';
    document.head.append(style);
  }
  if (!dialog) setupDialog();
  if (!launcher) {
    const mount = document.querySelector('.qvc-platform-actions');
    if (!mount) return;
    launcher = button('✦ Gerar com ChatGPT', 'qvc-ai-launcher', openAI, true);
    launcher.classList.add('qvc-ai-launcher', 'qvc-no-print');
    mount.prepend(launcher);
  }
}
export function registerAIAdapter(adapter) {
  if (!adapter || !Object.hasOwn(AI_LIMITS, adapter.kind) || typeof adapter.apply !== 'function')
    throw new Error('Integração de atividade inválida.');
  adapters.set(adapter.kind, adapter);
  initAI();
}
export function openAI(kind) {
  selectedAdapter =
    adapters.get(typeof kind === 'string' ? kind : '') || adapters.values().next().value;
  if (!selectedAdapter) return;
  initAI();
  if (!dialog || dialog.open) return;
  const max = maximum();
  const requested =
    typeof selectedAdapter.defaultCount === 'function'
      ? selectedAdapter.defaultCount()
      : selectedAdapter.defaultCount;
  dialog.querySelector('#qvc-ai-count').max = String(max || 1);
  dialog.querySelector('#qvc-ai-count').value = String(
    Math.max(1, Math.min(max || 1, requested ?? 5))
  );
  const description =
    typeof selectedAdapter.description === 'function'
      ? selectedAdapter.description()
      : selectedAdapter.description;
  const context =
    typeof selectedAdapter.getContext === 'function' ? selectedAdapter.getContext() : '';
  dialog.querySelector('#qvc-ai-context').textContent = [
    description || selectedAdapter.label || '',
    context,
  ]
    .filter(Boolean)
    .join(' ');
  dialog.querySelector('#qvc-ai-preview').hidden = true;
  dialog.querySelector('#qvc-ai-review-actions').hidden = true;
  readPreview = null;
  lastRequest = null;
  authenticated = false;
  configured = false;
  returnFocus = document.activeElement;
  dialog.showModal();
  message('Verificando disponibilidade do assistente…');
  operation(async (signal) => {
    const status = await api('status', undefined, signal);
    if (signal.aborted) return;
    configured = status.configured === true;
    authenticated = status.authenticated === true;
    message(
      !configured
        ? 'O ChatGPT ainda não foi ativado neste endereço. Peça ao administrador para configurar o serviço. Você pode continuar criando atividades manualmente.'
        : max < 1
          ? 'Não há espaço disponível para adicionar conteúdo. Ajuste seu rascunho e abra o assistente novamente.'
          : authenticated
            ? 'Pronto para criar. Escolha o tema da sua proposta.'
            : 'Entre com a senha de acesso para gerar uma proposta.'
    );
  });
}
