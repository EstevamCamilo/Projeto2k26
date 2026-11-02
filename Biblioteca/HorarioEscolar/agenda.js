import { createState, validateState, findConflicts, importSchedule } from './agenda-model.js';
import { registerAIAdapter } from '../shared/ai.js';

const STORAGE_KEY = 'qvc-schedule-v2';
const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
const $ = (id) => document.getElementById(id);
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
let state = createState();
let selectedClass = state.classes[0].id;
let pendingImport = null;
let metadataTimer;

function message(text, error = false) {
  $('schedule-status').textContent = text;
  $('schedule-status').dataset.error = String(error);
}
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    state = validateState(JSON.parse(saved));
    selectedClass =
      state.classes.find((item) => item.name === state.classroom)?.id || state.classes[0]?.id || '';
  }
} catch {
  message(
    'Não foi possível ler o planejamento salvo. O arquivo local não foi apagado; importe uma cópia de segurança ou exporte seu próximo trabalho.',
    true
  );
}

function store(next, success) {
  try {
    const normalized = validateState(next);
    state = normalized;
    if (!state.classes.some((item) => item.id === selectedClass))
      selectedClass = state.classes[0]?.id || '';
    state.classroom = state.classes.find((item) => item.id === selectedClass)?.name || '';
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (success) message(success);
    } catch {
      message(
        'O navegador não permitiu salvar. Seu trabalho continua nesta sessão; baixe o planejamento JSON antes de sair.',
        true
      );
    }
    render();
    return true;
  } catch (error) {
    message(error.message || 'Confira os dados do planejamento.', true);
    return false;
  }
}

function options(select, items, label, emptyLabel, preferred) {
  const previous = preferred ?? select.value;
  select.replaceChildren();
  if (!items.length) {
    const item = node('option', emptyLabel);
    item.value = '';
    select.append(item);
  }
  for (const item of items) {
    const option = node('option', label(item));
    option.value = item.id;
    select.append(option);
  }
  if (items.some((item) => item.id === previous)) select.value = previous;
}

function activateTab(name, focus = false) {
  for (const key of ['week', 'registry', 'periods']) {
    const active = key === name;
    $('tab-' + key).setAttribute('aria-selected', String(active));
    $('tab-' + key).tabIndex = active ? 0 : -1;
    $('panel-' + key).hidden = !active;
  }
  if (focus) $('tab-' + name).focus();
}
for (const [index, name] of ['week', 'registry', 'periods'].entries()) {
  $('tab-' + name).addEventListener('click', () => activateTab(name));
  $('tab-' + name).addEventListener('keydown', (event) => {
    const keys = ['week', 'registry', 'periods'];
    let target;
    if (event.key === 'ArrowRight') target = (index + 1) % keys.length;
    if (event.key === 'ArrowLeft') target = (index + keys.length - 1) % keys.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = keys.length - 1;
    if (target !== undefined) {
      event.preventDefault();
      activateTab(keys[target], true);
    }
  });
}

function renderHeader() {
  $('preview-school').textContent =
    'Escola: ' + (state.school || '____________________________________');
  $('preview-student').textContent =
    'Nome do Aluno: ' + (state.student || '______________________________');
  $('preview-class').textContent =
    'Turma: ' +
    (state.classes.find((item) => item.id === selectedClass)?.name || '________________');
  $('preview-date').textContent =
    'Data: ' + (state.date ? state.date.split('-').reverse().join(' / ') : '____ / ____ / ______');
}

function renderGrid() {
  const tbody = $('schedule-grid');
  tbody.replaceChildren();
  const subjects = new Map(state.subjects.map((item) => [item.id, item]));
  const teachers = new Map(state.teachers.map((item) => [item.id, item]));
  const periods = [...state.periods].sort((a, b) => a.start.localeCompare(b.start));
  for (const period of periods) {
    const row = node('tr');
    const heading = node('th', period.label);
    heading.scope = 'row';
    heading.append(node('small', `${period.start}–${period.end}`));
    row.append(heading);
    for (let day = 0; day < 5; day++) {
      const cell = node('td');
      const lessons = state.lessons.filter(
        (item) => item.classId === selectedClass && item.periodId === period.id && item.day === day
      );
      for (const lesson of lessons) {
        const subject = subjects.get(lesson.subjectId);
        const teacher = teachers.get(lesson.teacherId);
        const block = node('div', undefined, 'agenda-lesson');
        block.style.setProperty('--lesson-color', subject.color);
        block.append(node('strong', subject.name));
        block.append(node('small', teacher.name));
        if (lesson.room) block.append(node('small', 'Sala: ' + lesson.room));
        const edit = node('button', 'Editar aula', 'agenda-edit no-print');
        edit.type = 'button';
        edit.setAttribute('aria-label', `Editar ${subject.name}, ${DAYS[day]}, ${period.label}`);
        edit.addEventListener('click', () => editLesson(lesson));
        block.append(edit);
        cell.append(block);
      }
      if (!lessons.length) {
        cell.append(node('span', 'Livre', 'agenda-empty-text'));
        const add = node('button', '+ Adicionar', 'agenda-add no-print');
        add.type = 'button';
        add.setAttribute('aria-label', `Adicionar aula: ${DAYS[day]}, ${period.label}`);
        add.addEventListener('click', () => {
          resetLesson();
          $('lesson-class').value = selectedClass;
          $('lesson-period').value = period.id;
          $('lesson-day').value = String(day);
          $('lesson-subject').focus();
          message('Escolha a disciplina e o professor para completar esta aula.');
        });
        cell.append(add);
      }
      row.append(cell);
    }
    tbody.append(row);
  }
  if (!periods.length) {
    const row = node('tr');
    const cell = node('td', 'Adicione os horários das aulas para montar sua grade.');
    cell.colSpan = 6;
    row.append(cell);
    tbody.append(row);
  }
}

function renderConflicts() {
  const conflicts = findConflicts(state);
  $('conflict-count').textContent = String(conflicts.length);
  $('class-count').textContent = String(state.classes.length);
  $('lesson-count').textContent = String(state.lessons.length);
  $('conflicts-title').textContent = conflicts.length
    ? 'Vamos revisar estes encontros?'
    : 'Tudo no seu lugar';
  $('conflicts-list').replaceChildren();
  if (!conflicts.length)
    $('conflicts-list').append(
      node('li', 'Nenhum conflito de turma ou professor foi encontrado.', 'agenda-clear')
    );
  else for (const conflict of conflicts) $('conflicts-list').append(node('li', conflict));
}

function renderList(type, items, label, extra) {
  const list = $(type + '-list');
  list.replaceChildren();
  if (!items.length) {
    list.append(node('li', 'Nenhum cadastro por enquanto.'));
    return;
  }
  for (const item of items) {
    const li = node('li');
    const description = node('span', label(item));
    if (extra && extra(item)) description.append(node('small', extra(item)));
    li.append(description);
    const edit = node('button', 'Editar', 'agenda-icon-button');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Editar ' + label(item));
    edit.addEventListener('click', () => editRegistry(type, item));
    const remove = node('button', 'Excluir', 'agenda-icon-button');
    remove.type = 'button';
    remove.dataset.delete = type;
    remove.setAttribute('aria-label', 'Excluir ' + label(item));
    remove.addEventListener('click', () => deleteRegistry(type, item));
    li.append(edit, remove);
    list.append(li);
  }
}

function render() {
  options(
    $('active-class'),
    state.classes,
    (item) => item.name,
    'Cadastre uma turma',
    selectedClass
  );
  options($('lesson-class'), state.classes, (item) => item.name, 'Cadastre uma turma');
  options(
    $('lesson-period'),
    [...state.periods].sort((a, b) => a.start.localeCompare(b.start)),
    (item) => `${item.label} · ${item.start}–${item.end}`,
    'Cadastre um horário'
  );
  options($('lesson-subject'), state.subjects, (item) => item.name, 'Cadastre uma disciplina');
  options($('lesson-teacher'), state.teachers, (item) => item.name, 'Cadastre um professor');
  renderHeader();
  renderGrid();
  renderConflicts();
  renderList('class', state.classes, (item) => item.name);
  renderList(
    'teacher',
    state.teachers,
    (item) => item.name,
    (item) => item.email
  );
  renderList('subject', state.subjects, (item) => item.name);
  renderList(
    'period',
    [...state.periods].sort((a, b) => a.start.localeCompare(b.start)),
    (item) => item.label,
    (item) => `${item.start}–${item.end}`
  );
  $('save-lesson').disabled =
    !state.classes.length ||
    !state.periods.length ||
    !state.teachers.length ||
    !state.subjects.length;
}

function resetLesson() {
  $('lesson-form').reset();
  $('lesson-id').value = '';
  $('lesson-class').value = selectedClass;
  $('lesson-form-heading').textContent = 'Adicionar uma aula';
  $('save-lesson').textContent = 'Adicionar aula';
  $('cancel-lesson').hidden = true;
  $('delete-lesson').hidden = true;
}
function editLesson(lesson) {
  $('lesson-id').value = lesson.id;
  for (const [field, key] of [
    ['class', 'classId'],
    ['period', 'periodId'],
    ['day', 'day'],
    ['subject', 'subjectId'],
    ['teacher', 'teacherId'],
    ['room', 'room'],
  ])
    $('lesson-' + field).value = String(lesson[key]);
  $('lesson-form-heading').textContent = 'Editar esta aula';
  $('save-lesson').textContent = 'Salvar alterações';
  $('cancel-lesson').hidden = false;
  $('delete-lesson').hidden = false;
  $('lesson-subject').focus();
}
$('cancel-lesson').addEventListener('click', resetLesson);
$('delete-lesson').addEventListener('click', () => {
  const id = $('lesson-id').value;
  if (
    store(
      { ...state, lessons: state.lessons.filter((item) => item.id !== id) },
      'Aula removida da grade.'
    )
  )
    resetLesson();
});
$('lesson-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const id = $('lesson-id').value;
  const lesson = {
    id: id || crypto.randomUUID(),
    classId: $('lesson-class').value,
    periodId: $('lesson-period').value,
    day: Number($('lesson-day').value),
    subjectId: $('lesson-subject').value,
    teacherId: $('lesson-teacher').value,
    room: $('lesson-room').value.trim(),
  };
  if (
    state.lessons.some(
      (item) =>
        item.id !== lesson.id &&
        item.classId === lesson.classId &&
        item.periodId === lesson.periodId &&
        item.day === lesson.day
    )
  ) {
    message(
      'Essa turma já tem uma aula nesse horário. Selecione a aula na grade para editá-la.',
      true
    );
    return;
  }
  selectedClass = lesson.classId;
  const next = {
    ...state,
    lessons: [...state.lessons.filter((item) => item.id !== lesson.id), lesson],
  };
  if (
    store(
      next,
      id
        ? 'Aula atualizada. Confira os alertas de conflito.'
        : 'Aula adicionada. Confira os alertas de conflito.'
    )
  )
    resetLesson();
});

const registries = {
  class: {
    key: 'classes',
    singular: 'turma',
    save: 'Adicionar turma',
    edit: 'Salvar turma',
    input: 'class-name',
  },
  teacher: {
    key: 'teachers',
    singular: 'professor',
    save: 'Adicionar professor',
    edit: 'Salvar professor',
    input: 'teacher-name',
  },
  subject: {
    key: 'subjects',
    singular: 'disciplina',
    save: 'Adicionar disciplina',
    edit: 'Salvar disciplina',
    input: 'subject-name',
  },
  period: {
    key: 'periods',
    singular: 'horário',
    save: 'Adicionar horário',
    edit: 'Salvar horário',
    input: 'period-label',
  },
};
function resetRegistry(type) {
  $(type + '-form').reset();
  $(type + '-id').value = '';
  $('save-' + type).textContent = registries[type].save;
  $('cancel-' + type).hidden = true;
}
function editRegistry(type, item) {
  $(type + '-id').value = item.id;
  if (type === 'period') {
    $('period-label').value = item.label;
    $('period-start').value = item.start;
    $('period-end').value = item.end;
  } else $(type + '-name').value = item.name;
  if (type === 'teacher') $('teacher-email').value = item.email;
  if (type === 'subject') $('subject-color').value = item.color;
  $('save-' + type).textContent = registries[type].edit;
  $('cancel-' + type).hidden = false;
  $(registries[type].input).focus();
}
function deleteRegistry(type, item) {
  const registry = registries[type];
  if (type === 'class' && state.classes.length === 1) {
    message(
      'Mantenha ao menos uma turma no planejamento. Você pode editar o nome da turma atual.',
      true
    );
    return;
  }
  const reference = {
    class: 'classId',
    teacher: 'teacherId',
    subject: 'subjectId',
    period: 'periodId',
  }[type];
  if (state.lessons.some((lesson) => lesson[reference] === item.id)) {
    message(
      `Este cadastro de ${registry.singular} está em uso. Edite ou remova as aulas vinculadas antes de excluir.`,
      true
    );
    return;
  }
  if (
    store(
      { ...state, [registry.key]: state[registry.key].filter((record) => record.id !== item.id) },
      'Cadastro removido.'
    )
  )
    resetRegistry(type);
}
for (const [type, registry] of Object.entries(registries)) {
  $('cancel-' + type).addEventListener('click', () => resetRegistry(type));
  $(type + '-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const editing = $(type + '-id').value;
    const item = { id: editing || crypto.randomUUID() };
    if (type === 'period') {
      item.label = $('period-label').value.trim();
      item.start = $('period-start').value;
      item.end = $('period-end').value;
    } else item.name = $(type + '-name').value.trim();
    if (type === 'teacher') item.email = $('teacher-email').value.trim();
    if (type === 'subject') item.color = $('subject-color').value;
    if (
      store(
        {
          ...state,
          [registry.key]: [...state[registry.key].filter((record) => record.id !== item.id), item],
        },
        `${editing ? 'Cadastro atualizado' : 'Cadastro adicionado'}.`
      )
    )
      resetRegistry(type);
  });
}

for (const [field, key] of [
  ['schedule-school', 'school'],
  ['schedule-student', 'student'],
  ['schedule-date', 'date'],
]) {
  $(field).value = state[key];
  $(field).addEventListener('input', (event) => {
    state[key] = event.target.value;
    renderHeader();
    clearTimeout(metadataTimer);
    metadataTimer = setTimeout(() => store(state, 'Cabeçalho salvo neste navegador.'), 400);
  });
}
$('active-class').addEventListener('change', (event) => {
  selectedClass = event.target.value;
  if (store(state, 'Prévia atualizada para a turma selecionada.')) resetLesson();
});

function download(data, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  );
  const link = node('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
$('export-schedule').addEventListener('click', () => {
  try {
    download(validateState(state), 'horario-escolar.json');
    message('Planejamento exportado. Guarde seu arquivo em um local protegido.');
  } catch (error) {
    message(error.message, true);
  }
});
$('import-schedule').addEventListener('click', () => $('schedule-file').click());
$('schedule-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    message('Use um arquivo JSON ou TXT de até 5 MB.', true);
    return;
  }
  try {
    const raw = JSON.parse(await file.text());
    pendingImport = importSchedule(raw);
    const counts = `${pendingImport.classes.length} turma(s), ${pendingImport.teachers.length} professor(es), ${pendingImport.subjects.length} disciplina(s) e ${pendingImport.lessons.length} aula(s).`;
    $('import-summary').textContent =
      counts +
      (raw.version === 2
        ? ''
        : ' Formato antigo: revise os términos estimados das aulas. Nascimento, celular e situação de afastamento não fazem parte desta grade; mantenha também seu arquivo original.');
    $('import-dialog').showModal();
  } catch (error) {
    pendingImport = null;
    message(error.message || 'Arquivo inválido. O planejamento atual foi preservado.', true);
  }
});
$('cancel-import').addEventListener('click', () => {
  pendingImport = null;
  $('import-dialog').close();
});
$('import-dialog').addEventListener('cancel', () => {
  pendingImport = null;
});
$('confirm-import').addEventListener('click', () => {
  if (!pendingImport) return;
  selectedClass = pendingImport.classes[0]?.id || '';
  if (store(pendingImport, 'Planejamento importado. Revise a grade e os alertas de conflito.')) {
    pendingImport = null;
    for (const [field, key] of [
      ['schedule-school', 'school'],
      ['schedule-student', 'student'],
      ['schedule-date', 'date'],
    ])
      $(field).value = state[key];
    resetLesson();
    for (const type of Object.keys(registries)) resetRegistry(type);
    activateTab('week');
    $('import-dialog').close();
  }
});
$('print-schedule').addEventListener('click', () => {
  activateTab('week');
  renderHeader();
  if (window.QVC?.print) window.QVC.print();
  else window.print();
});
render();
resetLesson();

const requestedTab = new URLSearchParams(location.search).get('aba');
if (['registry', 'periods'].includes(requestedTab))
  document.getElementById('tab-' + requestedTab)?.click();

function applyAISchedule(data) {
  if (!data || data.kind !== 'schedule' || !Array.isArray(data.lessons) || !data.lessons.length)
    throw new Error('A proposta de horário não contém aulas válidas. Gere uma nova proposta.');
  // Validate a copy first so refusing a proposal never changes the current work.
  const next = validateState(structuredClone(state));
  const classroom = next.classes.find((item) => item.id === selectedClass);
  if (!classroom) throw new Error('Cadastre e selecione uma turma antes de aplicar a proposta.');
  const periods = [...next.periods].sort((a, b) => a.start.localeCompare(b.start)).slice(0, 8);
  if (!periods.length)
    throw new Error('Cadastre os períodos reais da escola antes de aplicar a proposta.');
  const normalize = (value) =>
    value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
  const newLessons = [];
  let unassigned = false;
  const placeholderName = `Professor a definir · ${classroom.name}`.slice(0, 120);
  const timeMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

  for (const suggestion of data.lessons) {
    if (
      !suggestion ||
      !Number.isInteger(suggestion.day) ||
      suggestion.day < 0 ||
      suggestion.day > 4 ||
      !Number.isInteger(suggestion.period) ||
      suggestion.period < 1 ||
      suggestion.period > periods.length ||
      typeof suggestion.subject !== 'string' ||
      !suggestion.subject.trim() ||
      suggestion.subject.trim().length > 120 ||
      typeof suggestion.teacher !== 'string' ||
      suggestion.teacher.trim().length > 120
    )
      throw new Error(
        `Revise os dias, disciplinas e períodos da proposta. Esta escola permite ${periods.length} período(s) na geração, numerados de 1 a ${periods.length}.`
      );
    const period = periods[suggestion.period - 1];
    let teacher;
    if (suggestion.teacher.trim()) {
      teacher = next.teachers.find(
        (item) => normalize(item.name) === normalize(suggestion.teacher)
      );
      if (!teacher)
        throw new Error(
          `O professor “${suggestion.teacher.trim()}” não está cadastrado. Revise o nome na proposta ou deixe o campo vazio para definir depois.`
        );
    } else {
      unassigned = true;
      teacher = next.teachers.find((item) => item.name === placeholderName);
      if (!teacher) {
        teacher = { id: uid('teacher-unassigned'), name: placeholderName, email: '' };
        next.teachers.push(teacher);
      }
    }
    let subject = next.subjects.find(
      (item) => normalize(item.name) === normalize(suggestion.subject)
    );
    if (!subject) {
      subject = { id: uid('subject'), name: suggestion.subject.trim(), color: '#346786' };
      next.subjects.push(subject);
    }
    const lesson = {
      id: uid('lesson'),
      classId: classroom.id,
      periodId: period.id,
      day: suggestion.day,
      subjectId: subject.id,
      teacherId: teacher.id,
      room: '',
    };
    // Compare every inserted lesson to saved lessons and earlier proposal rows.
    // A preexisting conflict cannot hide a new collision behind a repeated summary.
    for (const other of [...next.lessons, ...newLessons]) {
      if (other.day !== lesson.day) continue;
      const otherPeriod = next.periods.find((item) => item.id === other.periodId);
      const overlap =
        timeMinutes(period.start) < timeMinutes(otherPeriod.end) &&
        timeMinutes(otherPeriod.start) < timeMinutes(period.end);
      if (!overlap) continue;
      if (other.classId === lesson.classId)
        throw new Error(
          `A turma já tem uma aula na ${DAYS[lesson.day]}, ${period.label}. Ajuste a proposta para preencher somente períodos livres.`
        );
      if (other.teacherId === lesson.teacherId)
        throw new Error(
          `${teacher.name} já está em outra turma na ${DAYS[lesson.day]}, ${period.start}–${period.end}. Escolha outro professor ou período.`
        );
    }
    newLessons.push(lesson);
  }
  next.lessons.push(...newLessons);
  const validated = validateState(next);
  const previousConflicts = new Set(findConflicts(state));
  if (findConflicts(validated).some((conflict) => !previousConflicts.has(conflict)))
    throw new Error('A proposta cria conflitos na grade. Revise os professores e períodos.');
  clearTimeout(metadataTimer);
  if (
    !store(
      validated,
      `${newLessons.length} aula(s) adicionada(s) aos períodos livres. ${unassigned ? 'Professor a definir é um marcador: associe os docentes reais antes de usar o horário.' : 'Revise o planejamento antes de usar.'}`
    )
  )
    throw new Error('Não foi possível aplicar a proposta. Revise os dados da grade.');
  resetLesson();
  activateTab('week');
}

function availableAIScheduleSlots() {
  const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const periods = [...state.periods].sort((a, b) => a.start.localeCompare(b.start)).slice(0, 8);
  return periods.reduce((count, period) => {
    for (let day = 0; day < 5; day++) {
      const occupied = state.lessons.some((lesson) => {
        if (lesson.classId !== selectedClass || lesson.day !== day) return false;
        const existing = state.periods.find((item) => item.id === lesson.periodId);
        return (
          minutes(period.start) < minutes(existing.end) &&
          minutes(existing.start) < minutes(period.end)
        );
      });
      if (!occupied) count++;
    }
    return count;
  }, 0);
}

registerAIAdapter({
  kind: 'schedule',
  label: 'Horário escolar',
  description:
    'A proposta preenche somente períodos livres da turma ativa, mantendo suas aulas. A IA usa até os oito primeiros períodos, em ordem de início. Use nomes de professores já cadastrados ou deixe o campo vazio para definir depois.',
  maxCount: () => Math.min(40, availableAIScheduleSlots()),
  defaultCount: () => Math.min(5, availableAIScheduleSlots()),
  requestDetails: () => ({ periodCount: Math.min(state.periods.length, 8) }),
  getContext: () =>
    state.periods.length
      ? `A proposta pode usar ${Math.min(state.periods.length, 8)} período(s) por dia e ${availableAIScheduleSlots()} célula(s) livre(s) na semana. Numere os períodos de 1 a ${Math.min(state.periods.length, 8)}, pela ordem de início. Se a escola tiver mais de oito períodos, organize os restantes diretamente na grade.`
      : 'Cadastre os períodos reais da escola antes de gerar a proposta.',
  apply: applyAISchedule,
});
