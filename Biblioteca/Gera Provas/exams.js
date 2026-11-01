import {
  createExam,
  validateExam,
  validateQuestion,
  totalPoints,
  formatPoints,
  moveQuestion,
  QUESTION_TYPES,
  MAX_QUESTIONS,
} from './exam-model.mjs';

const STORAGE_KEY = 'qvc:exams:v2';
const BACKUP_KEY = 'qvc:exams:v2:before-import';
const $ = (selector) => document.querySelector(selector);
const metadataForm = $('#exam-metadata');
const questionForm = $('#question-form');
let startupMessage = '';
let state = loadExam(STORAGE_KEY) || createExam();
let previousExam = loadExam(BACKUP_KEY);
let editingId = null;
let editorOptions = ['', '', '', ''];
let editorAnswer = 0;
let editorStatements = [
  { text: '', answer: true },
  { text: '', answer: false },
];
let persistTimer;
let noticeTimer;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function notice(message, kind = 'success') {
  const region = $('#exam-notice');
  clearTimeout(noticeTimer);
  region.textContent = message;
  region.dataset.kind = kind;
  region.hidden = false;
  noticeTimer = setTimeout(() => {
    region.hidden = true;
  }, 7000);
}

function loadExam(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? validateExam(JSON.parse(raw)) : null;
  } catch {
    if (key === STORAGE_KEY)
      startupMessage =
        'Não foi possível abrir um rascunho salvo. Você pode criar uma prova ou importar uma cópia editável.';
    return null;
  }
}

function persist(explicit = false) {
  clearTimeout(persistTimer);
  try {
    const valid = validateExam(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    $('#exam-save-status').textContent = 'Rascunho salvo neste navegador.';
    if (explicit)
      notice('Prova guardada neste navegador. Baixe uma cópia para usar em outro computador.');
    return true;
  } catch (error) {
    const message = state.metadata.title.trim()
      ? 'Não foi possível salvar no navegador. Baixe o arquivo editável antes de sair.'
      : 'Preencha o título para guardar a prova.';
    $('#exam-save-status').textContent = message;
    if (explicit)
      notice(
        error instanceof Error && error.message.includes('Título') ? error.message : message,
        'error'
      );
    return false;
  }
}

function schedulePersist() {
  clearTimeout(persistTimer);
  $('#exam-save-status').textContent = 'Guardando suas alterações…';
  persistTimer = setTimeout(() => persist(), 350);
}

function fillMetadata() {
  for (const [key, value] of Object.entries(state.metadata))
    metadataForm.elements.namedItem(key).value = value;
  $('#exam-answer-key').checked = state.includeAnswerKey;
}

function updateMetadata(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
  if (input.name === 'includeAnswerKey') state.includeAnswerKey = input.checked;
  else if (Object.hasOwn(state.metadata, input.name)) state.metadata[input.name] = input.value;
  renderPaper();
  renderSummary();
  schedulePersist();
}

function button(label, text, action, disabled = false) {
  const element = node('button', text, 'exam-icon-button');
  element.type = 'button';
  element.setAttribute('aria-label', label);
  element.title = label;
  element.disabled = disabled;
  element.addEventListener('click', action);
  return element;
}

function renderOptions() {
  const container = $('#question-options');
  container.replaceChildren();
  editorOptions.forEach((option, index) => {
    const letter = String.fromCharCode(65 + index);
    const row = node('div', undefined, 'exam-option-row');
    const correctLabel = node('label', undefined, 'exam-correct-radio');
    const radio = node('input');
    radio.type = 'radio';
    radio.name = 'correct-option';
    radio.value = String(index);
    radio.checked = index === editorAnswer;
    radio.setAttribute('aria-label', `Alternativa ${letter} correta`);
    radio.addEventListener('change', () => {
      editorAnswer = index;
    });
    correctLabel.append(radio);
    const input = node('input');
    input.type = 'text';
    input.maxLength = 500;
    input.value = option;
    input.placeholder = `Alternativa ${letter}`;
    input.setAttribute('aria-label', `Alternativa ${letter}`);
    input.addEventListener('input', () => {
      editorOptions[index] = input.value;
    });
    const remove = button(
      `Remover alternativa ${letter}`,
      '×',
      () => {
        editorOptions.splice(index, 1);
        if (editorAnswer === index) editorAnswer = 0;
        else if (editorAnswer > index) editorAnswer--;
        renderOptions();
      },
      editorOptions.length <= 2
    );
    row.append(correctLabel, input, remove);
    container.append(row);
  });
  $('#add-option').disabled = editorOptions.length >= 6;
}

function renderStatements() {
  const container = $('#question-statements');
  container.replaceChildren();
  editorStatements.forEach((statement, index) => {
    const row = node('div', undefined, 'exam-statement-row');
    const textLabel = node('label', `Afirmação ${index + 1}`);
    const input = node('textarea');
    input.maxLength = 700;
    input.rows = 2;
    input.value = statement.text;
    input.placeholder = 'Escreva uma afirmação para a turma avaliar.';
    input.addEventListener('input', () => {
      editorStatements[index].text = input.value;
    });
    textLabel.append(input);
    const answerLabel = node('label', 'Gabarito');
    const select = node('select');
    select.setAttribute('aria-label', `Gabarito da afirmação ${index + 1}`);
    const truth = node('option', 'V');
    truth.value = 'true';
    const falsity = node('option', 'F');
    falsity.value = 'false';
    select.append(truth, falsity);
    select.value = String(statement.answer);
    select.addEventListener('change', () => {
      editorStatements[index].answer = select.value === 'true';
    });
    answerLabel.append(select);
    row.append(
      textLabel,
      answerLabel,
      button(
        `Remover afirmação ${index + 1}`,
        '×',
        () => {
          editorStatements.splice(index, 1);
          renderStatements();
        },
        editorStatements.length <= 1
      )
    );
    container.append(row);
  });
  $('#add-statement').disabled = editorStatements.length >= 10;
}

function updateQuestionType() {
  const type = $('#question-type').value;
  for (const [id, expected] of [
    ['multiple-fields', 'multiple'],
    ['open-fields', 'open'],
    ['truefalse-fields', 'truefalse'],
  ]) {
    const section = document.getElementById(id);
    section.hidden = type !== expected;
    section.disabled = type !== expected;
  }
  $('#question-error').hidden = true;
}

function resetQuestionEditor(question = null) {
  editingId = question?.id || null;
  questionForm.reset();
  $('#question-type').value = question?.type || 'multiple';
  $('#question-prompt').value = question?.prompt || '';
  $('#question-points').value = String(question?.points ?? 1);
  $('#question-lines').value = String(question?.lines || 4);
  $('#question-model-answer').value = question?.modelAnswer || '';
  editorOptions = question?.options ? [...question.options] : ['', '', '', ''];
  editorAnswer = question?.answer ?? 0;
  editorStatements = question?.statements
    ? question.statements.map((item) => ({ ...item }))
    : [
        { text: '', answer: true },
        { text: '', answer: false },
      ];
  $('#question-editor-title').textContent = editingId ? 'Aprimore sua questão' : 'Crie uma questão';
  $('#question-submit').textContent = editingId
    ? 'Salvar alterações da questão'
    : '+ Adicionar à prova';
  $('#question-cancel').hidden = !editingId;
  $('#question-error').hidden = true;
  renderOptions();
  renderStatements();
  updateQuestionType();
}

function submitQuestion(event) {
  event.preventDefault();
  try {
    if (!editingId && state.questions.length >= MAX_QUESTIONS)
      throw new Error(`Esta prova já tem ${MAX_QUESTIONS} questões. Crie um segundo documento.`);
    if ($('#question-points').value === '')
      throw new Error('Informe o valor da questão em pontos.');
    const draft = {
      id:
        editingId ||
        `q-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      type: $('#question-type').value,
      prompt: $('#question-prompt').value,
      points: Number($('#question-points').value),
      options: editorOptions,
      answer: editorAnswer,
      statements: editorStatements,
      lines: Number($('#question-lines').value),
      modelAnswer: $('#question-model-answer').value,
    };
    const question = validateQuestion(draft);
    const wasEditing = Boolean(editingId);
    state.questions = wasEditing
      ? state.questions.map((item) => (item.id === editingId ? question : item))
      : [...state.questions, question];
    resetQuestionEditor();
    render();
    persist();
    notice(
      wasEditing ? 'Questão atualizada. A prévia já está pronta.' : 'Questão incluída na prova.'
    );
    $('#question-prompt').focus({ preventScroll: true });
  } catch (error) {
    $('#question-error').textContent =
      error instanceof Error ? error.message : 'Revise os campos da questão.';
    $('#question-error').hidden = false;
    $('#question-error').scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }
}

function renderQuestionList() {
  const container = $('#exam-question-list');
  container.replaceChildren();
  $('#exam-list-empty').hidden = state.questions.length > 0;
  state.questions.forEach((question, index) => {
    const item = node('li', undefined, 'exam-list-item');
    const number = node('span', String(index + 1), 'exam-list-number');
    number.setAttribute('aria-hidden', 'true');
    const copy = node('div', undefined, 'exam-list-copy');
    const title = node('strong', question.prompt);
    title.title = question.prompt;
    copy.append(
      title,
      node(
        'small',
        `${QUESTION_TYPES[question.type]} · ${formatPoints(question.points)} ${question.points === 1 ? 'ponto' : 'pontos'}`
      )
    );
    const actions = node('div', undefined, 'exam-list-actions');
    const reorder = (direction) => {
      state.questions = moveQuestion(state.questions, question.id, direction);
      render();
      persist();
    };
    actions.append(
      button(`Mover questão ${index + 1} para cima`, '↑', () => reorder(-1), index === 0),
      button(
        `Mover questão ${index + 1} para baixo`,
        '↓',
        () => reorder(1),
        index === state.questions.length - 1
      ),
      button(`Editar questão ${index + 1}`, '✎', () => {
        resetQuestionEditor(question);
        $('#question-editor-panel').scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        });
        $('#question-prompt').focus({ preventScroll: true });
      }),
      button(`Remover questão ${index + 1}`, '×', () => {
        const deleted = state.questions.find((item) => item.id === question.id);
        const position = state.questions.indexOf(deleted);
        state.questions = state.questions.filter((item) => item.id !== question.id);
        if (editingId === question.id) resetQuestionEditor();
        render();
        persist();
        // Keep removal reversible inside the current page without extra confirmation dialogs.
        previousRemoval = { question: deleted, position };
        showUndoRemoval();
      })
    );
    item.append(number, copy, actions);
    container.append(item);
  });
}

let previousRemoval = null;
function showUndoRemoval() {
  const region = $('#exam-notice');
  notice('Questão removida. ');
  const undo = node('button', 'Desfazer', 'exam-button exam-button-subtle');
  undo.type = 'button';
  undo.addEventListener('click', () => {
    if (!previousRemoval || state.questions.some((item) => item.id === previousRemoval.question.id))
      return;
    state.questions.splice(
      Math.min(previousRemoval.position, state.questions.length),
      0,
      previousRemoval.question
    );
    previousRemoval = null;
    render();
    persist();
    notice('Questão restaurada.');
  });
  region.append(undo);
}

function renderSummary() {
  $('#exam-question-count').textContent = String(state.questions.length);
  const total = totalPoints(state.questions);
  $('#exam-total-points').textContent =
    `${formatPoints(total)} ${total === 1 ? 'ponto' : 'pontos'}`;
  $('#exam-print').disabled = !state.questions.length || !state.metadata.title.trim();
}

function formattedDate(value) {
  return value ? value.split('-').reverse().join('/') : '____ / ____ / ______';
}

function renderHeader(container, answerKey = false) {
  const { metadata } = state;
  const header = node('header', undefined, 'exam-school-header');
  header.setAttribute('data-qvc-school-header', '');
  header.append(
    node(
      'p',
      metadata.school || 'Escola: __________________________________________',
      'exam-school'
    )
  );
  header.append(
    node(
      'h2',
      answerKey ? 'Gabarito do educador' : metadata.title || 'Avaliação escolar',
      'exam-document-title'
    )
  );
  const info = node('div', undefined, 'exam-document-meta');
  info.append(
    node(
      'p',
      `Aluno(a): ${metadata.student || '________________________________________________'}`,
      'exam-student-row'
    )
  );
  info.append(
    node('p', `Turma: ${metadata.className || '__________________'}`),
    node('p', `Data: ${formattedDate(metadata.date)}`)
  );
  if (metadata.subject) info.append(node('p', `Disciplina: ${metadata.subject}`));
  if (metadata.teacher) info.append(node('p', `Professor(a): ${metadata.teacher}`));
  info.append(node('p', `Valor total: ${formatPoints(totalPoints(state.questions))} pontos`));
  if (!answerKey) info.append(node('p', 'Nota: __________________'));
  header.append(info);
  container.append(header);
}

function renderPaper() {
  const paper = $('#exam-paper-content');
  paper.replaceChildren();
  renderHeader(paper);
  if (state.metadata.instructions.trim()) {
    const instructions = node('div', undefined, 'exam-document-instructions');
    instructions.append(node('strong', 'Antes de começar'), node('p', state.metadata.instructions));
    paper.append(instructions);
  }
  if (!state.questions.length)
    paper.append(
      node(
        'p',
        'Sua próxima avaliação começa com uma questão. Use o editor ao lado para montar o material.',
        'exam-document-empty'
      )
    );
  state.questions.forEach((question, index) => {
    const section = node('section', undefined, 'exam-question');
    const heading = node('div', undefined, 'exam-question-heading');
    heading.append(
      node('h3', `${index + 1}. ${question.prompt}`),
      node(
        'span',
        `(${formatPoints(question.points)} ${question.points === 1 ? 'ponto' : 'pontos'})`,
        'exam-question-score'
      )
    );
    section.append(heading);
    if (question.type === 'multiple') {
      const options = node('ol', undefined, 'exam-options');
      question.options.forEach((option, optionIndex) =>
        options.append(node('li', `(   ) ${String.fromCharCode(65 + optionIndex)}) ${option}`))
      );
      section.append(options);
    } else if (question.type === 'truefalse') {
      const statements = node('ol', undefined, 'exam-options');
      question.statements.forEach((item) => statements.append(node('li', `(   ) ${item.text}`)));
      section.append(statements);
    } else {
      const lines = node('div', undefined, 'exam-answer-lines');
      lines.setAttribute('aria-label', `${question.lines} linhas para a resposta`);
      for (let line = 0; line < question.lines; line++)
        lines.append(node('div', undefined, 'exam-answer-line'));
      section.append(lines);
    }
    paper.append(section);
  });
  const footer = node('footer', undefined, 'exam-document-footer');
  footer.append(
    node('span', 'QVC · Biblioteca educacional'),
    node(
      'span',
      `${state.questions.length} ${state.questions.length === 1 ? 'questão' : 'questões'} · ${formatPoints(totalPoints(state.questions))} pontos`
    )
  );
  paper.append(footer);
  if (state.includeAnswerKey && state.questions.length) {
    const key = node('section', undefined, 'exam-answer-key');
    key.id = 'exam-answer-key-page';
    renderHeader(key, true);
    key.append(
      node(
        'p',
        'Uso do educador. Imprima esta página separadamente ao distribuir a avaliação.',
        'exam-answer-key-note'
      )
    );
    state.questions.forEach((question, index) => {
      const item = node('section', undefined, 'exam-key-item');
      item.append(
        node(
          'h3',
          `${index + 1}. ${QUESTION_TYPES[question.type]} · ${formatPoints(question.points)} ${question.points === 1 ? 'ponto' : 'pontos'}`
        )
      );
      if (question.type === 'multiple')
        item.append(
          node(
            'p',
            `Resposta: ${String.fromCharCode(65 + question.answer)}) ${question.options[question.answer]}`
          )
        );
      else if (question.type === 'truefalse') {
        const answers = node('ol');
        question.statements.forEach((statement) =>
          answers.append(node('li', `${statement.answer ? 'V' : 'F'} — ${statement.text}`))
        );
        item.append(answers);
      } else
        item.append(
          node(
            'p',
            question.modelAnswer ||
              'Resposta pessoal. Avaliação e atribuição de pontos pelo professor.',
            'exam-model-answer'
          )
        );
      key.append(item);
    });
    paper.append(key);
  }
}

function render() {
  renderSummary();
  renderQuestionList();
  renderPaper();
}

function exportExam() {
  try {
    const valid = validateExam(state);
    const slug =
      valid.metadata.title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 75) || 'avaliacao';
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(valid, null, 2)], { type: 'application/json' })
    );
    const link = node('a');
    link.href = url;
    link.download = `qvc-${slug}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notice('Cópia editável baixada. O arquivo contém questões e gabaritos.');
  } catch (error) {
    notice(error instanceof Error ? error.message : 'Não foi possível exportar a prova.', 'error');
  }
}

async function importExam(file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    notice('Use um arquivo de prova de até 2 MB.', 'error');
    return;
  }
  try {
    const imported = validateExam(JSON.parse(await file.text()));
    previousExam = validateExam({
      ...structuredClone(state),
      metadata: {
        ...state.metadata,
        title: state.metadata.title.trim() || 'Avaliação escolar',
      },
    });
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(previousExam));
    } catch {
      /* The undo copy remains available in this session. */
    }
    state = imported;
    previousRemoval = null;
    fillMetadata();
    resetQuestionEditor();
    render();
    const saved = persist();
    $('#exam-undo-import').hidden = false;
    notice(
      saved
        ? 'Prova importada e guardada. Você pode desfazer a importação.'
        : 'Prova importada nesta sessão. Baixe uma cópia antes de sair.'
    );
  } catch (error) {
    notice(
      `Importação não realizada. ${error instanceof Error ? error.message : 'O arquivo não é válido.'}`,
      'error'
    );
  }
}

metadataForm.addEventListener('submit', (event) => event.preventDefault());
metadataForm.addEventListener('input', updateMetadata);
questionForm.addEventListener('submit', submitQuestion);
$('#question-type').addEventListener('change', updateQuestionType);
$('#question-cancel').addEventListener('click', () => resetQuestionEditor());
$('#add-option').addEventListener('click', () => {
  if (editorOptions.length < 6) {
    editorOptions.push('');
    renderOptions();
  }
});
$('#add-statement').addEventListener('click', () => {
  if (editorStatements.length < 10) {
    editorStatements.push({ text: '', answer: true });
    renderStatements();
  }
});
$('#exam-save').addEventListener('click', () => persist(true));
$('#exam-print').addEventListener('click', () => {
  try {
    validateExam(state);
    persist();
    window.print();
  } catch (error) {
    notice(error.message, 'error');
  }
});
$('#exam-export').addEventListener('click', exportExam);
$('#exam-import').addEventListener('click', () => $('#exam-import-file').click());
$('#exam-import-file').addEventListener('change', (event) => {
  importExam(event.target.files?.[0]);
  event.target.value = '';
});
$('#exam-undo-import').addEventListener('click', () => {
  if (!previousExam) return;
  state = validateExam(previousExam);
  previousExam = null;
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* The restored session stays usable. */
  }
  $('#exam-undo-import').hidden = true;
  fillMetadata();
  resetQuestionEditor();
  render();
  persist();
  notice('A prova anterior foi restaurada.');
});
window.addEventListener('pagehide', () => persist());

fillMetadata();
resetQuestionEditor();
render();
$('#exam-undo-import').hidden = !previousExam;
if (startupMessage) notice(startupMessage, 'error');
