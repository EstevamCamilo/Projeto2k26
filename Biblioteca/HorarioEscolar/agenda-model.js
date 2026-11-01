/** Pure, bounded schedule model. No DOM, storage or network access. */
const DAYS = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira'];
const COLOR = /^#[0-9a-f]{6}$/i;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function fail(message) {
  throw new Error(message);
}
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${name} deve ser um objeto válido.`);
  return value;
}
function string(value, name, max = 120, allowEmpty = false) {
  if (typeof value !== 'string') fail(`${name} deve ser um texto.`);
  const text = value.trim();
  if ((!allowEmpty && !text) || text.length > max)
    fail(`${name} deve ter ${allowEmpty ? 'até' : 'entre 1 e'} ${max} caracteres.`);
  return text;
}
function list(value, name, limit) {
  if (!Array.isArray(value) || value.length > limit)
    fail(`${name} deve ser uma lista de até ${limit} itens.`);
  return value;
}
function id(value, name) {
  return string(value, name, 100);
}
function unique(items, name) {
  if (new Set(items.map((item) => item.id)).size !== items.length)
    fail(`${name} contém identificadores repetidos.`);
  return items;
}
function time(value, name) {
  if (typeof value !== 'string' || !TIME.test(value))
    fail(`${name} deve usar uma hora válida no formato HH:MM.`);
  return value;
}
const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const asTime = (value) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

/** Empty registries, one editable class, and three default periods. */
export function createState() {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return {
    version: 2,
    school: '',
    student: '',
    classroom: '',
    date,
    title: 'Horário escolar',
    teachers: [],
    subjects: [],
    classes: [{ id: 'class-default', name: 'Turma A' }],
    periods: [
      { id: 'period-1', label: '1ª aula', start: '07:00', end: '07:50' },
      { id: 'period-2', label: '2ª aula', start: '07:50', end: '08:40' },
      { id: 'period-3', label: '3ª aula', start: '08:40', end: '09:30' },
    ],
    lessons: [],
  };
}

/** Return a fresh normalized value or throw without changing the supplied object. */
export function validateState(value) {
  const raw = object(value, 'Horário');
  if (raw.version !== 2)
    fail('Versão de horário não reconhecida. Use um arquivo exportado por esta ferramenta.');
  const state = {
    version: 2,
    school: string(raw.school, 'Escola', 160, true),
    student: string(raw.student, 'Nome do aluno', 160, true),
    classroom: string(raw.classroom, 'Turma do cabeçalho', 120, true),
    date: string(raw.date, 'Data', 10, true),
    title: string(raw.title, 'Título', 160),
    teachers: unique(
      list(raw.teachers, 'Professores', 100).map((item, i) => {
        const source = object(item, `Professor ${i + 1}`);
        const email = string(source.email ?? '', 'E-mail', 180, true);
        // Keep old contact labels intact; validate new e-mail input in the form.
        return {
          id: id(source.id, 'Identificador de professor'),
          name: string(source.name, 'Nome do professor'),
          email,
        };
      }),
      'Professores'
    ),
    subjects: unique(
      list(raw.subjects, 'Disciplinas', 100).map((item, i) => {
        const source = object(item, `Disciplina ${i + 1}`),
          color = source.color ?? '#346786';
        if (typeof color !== 'string' || !COLOR.test(color))
          fail('A cor da disciplina deve usar um código hexadecimal como #346786.');
        return {
          id: id(source.id, 'Identificador de disciplina'),
          name: string(source.name, 'Nome da disciplina'),
          color: color.toLowerCase(),
        };
      }),
      'Disciplinas'
    ),
    classes: unique(
      list(raw.classes, 'Turmas', 30).map((item, i) => {
        const source = object(item, `Turma ${i + 1}`);
        return {
          id: id(source.id, 'Identificador da turma'),
          name: string(source.name, 'Nome da turma'),
        };
      }),
      'Turmas'
    ),
    periods: unique(
      list(raw.periods, 'Períodos', 20).map((item, i) => {
        const source = object(item, `Período ${i + 1}`),
          start = time(source.start, 'Início da aula'),
          end = time(source.end, 'Término da aula');
        if (minutes(end) <= minutes(start))
          fail('O término da aula deve ser posterior ao início, no mesmo dia.');
        return {
          id: id(source.id, 'Identificador do período'),
          label: string(source.label, 'Nome do período', 80),
          start,
          end,
        };
      }),
      'Períodos'
    ),
    lessons: unique(
      list(raw.lessons, 'Aulas', 3000).map((item, i) => {
        const source = object(item, `Aula ${i + 1}`);
        if (!Number.isInteger(source.day) || source.day < 0 || source.day > 4)
          fail('O dia da aula deve estar entre segunda e sexta-feira.');
        return {
          id: id(source.id, 'Identificador da aula'),
          classId: id(source.classId, 'Turma da aula'),
          periodId: id(source.periodId, 'Período da aula'),
          day: source.day,
          subjectId: id(source.subjectId, 'Disciplina da aula'),
          teacherId: id(source.teacherId, 'Professor da aula'),
          room: string(source.room ?? '', 'Sala', 80, true),
        };
      }),
      'Aulas'
    ),
  };
  if (state.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.date)) fail('Informe uma data válida.');
    const parsed = new Date(`${state.date}T12:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== state.date)
      fail('Informe uma data válida.');
  }
  const sets = Object.fromEntries(
    ['teachers', 'subjects', 'classes', 'periods'].map((key) => [
      key,
      new Set(state[key].map((item) => item.id)),
    ])
  );
  for (const lesson of state.lessons) {
    for (const [key, ref, label] of [
      ['teachers', 'teacherId', 'professor'],
      ['subjects', 'subjectId', 'disciplina'],
      ['classes', 'classId', 'turma'],
      ['periods', 'periodId', 'período'],
    ]) {
      if (!sets[key].has(lesson[ref]))
        fail(
          `Uma aula faz referência a ${label} que não está cadastrado. Revise o arquivo antes de importar.`
        );
    }
  }
  return state;
}

/** Human-readable conflict messages; capped to keep large imports responsive. */
export function findConflicts(value) {
  const state = validateState(value),
    periods = new Map(state.periods.map((p) => [p.id, p]));
  const teachers = new Map(state.teachers.map((t) => [t.id, t.name])),
    classes = new Map(state.classes.map((c) => [c.id, c.name]));
  const groups = new Map(),
    messages = new Set();
  for (const lesson of state.lessons) {
    for (const [kind, key] of [
      ['teacher', lesson.teacherId],
      ['class', lesson.classId],
    ]) {
      const groupKey = JSON.stringify([kind, lesson.day, key]);
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(lesson);
    }
  }
  for (const [groupKey, lessons] of groups) {
    const [kind, day, key] = JSON.parse(groupKey);
    const sorted = [...lessons].sort(
      (a, b) => minutes(periods.get(a.periodId).start) - minutes(periods.get(b.periodId).start)
    );
    for (let i = 0; i < sorted.length; i++) {
      const first = periods.get(sorted[i].periodId);
      for (let j = i + 1; j < sorted.length; j++) {
        const second = periods.get(sorted[j].periodId);
        if (minutes(second.start) >= minutes(first.end)) break;
        const at = `${second.start}–${asTime(Math.min(minutes(first.end), minutes(second.end)))}`;
        if (kind === 'teacher')
          messages.add(`${teachers.get(key)} tem aulas simultâneas na ${DAYS[day]}, ${at}.`);
        else
          messages.add(`A turma ${classes.get(key)} tem aulas sobrepostas na ${DAYS[day]}, ${at}.`);
        if (messages.size >= 200)
          return [
            ...messages,
            'Há outros conflitos. Corrija os primeiros e confira a grade novamente.',
          ];
      }
    }
  }
  return [...messages];
}

function legacyId(value, label) {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 0)
    fail(`${label} tem um identificador inválido no arquivo antigo.`);
  return String(number);
}
const unassigned = (value) =>
  value === '' || value === null || value === undefined || value === -1 || value === '-1';

/**
 * Legacy cells are [startTime, MondaySubjectId, ..., SaturdaySubjectId].
 * Only the old format's start time exists: ends are estimated at 45 minutes,
 * shortened to the next start if earlier. Filled Saturdays and broken references
 * fail explicitly rather than silently dropping lessons. Files are never changed.
 */
export function importSchedule(value) {
  const raw = object(value, 'Arquivo');
  if (raw.version === 2) return validateState(raw);
  const professors = list(raw.professores, 'Professores do arquivo antigo', 100);
  const disciplines = list(raw.disciplinas, 'Disciplinas do arquivo antigo', 100);
  const schedules = list(raw.horarios, 'Grades do arquivo antigo', 30);
  const state = createState();
  state.classes = [];
  state.periods = [];
  const teacherMap = new Map(),
    subjectMap = new Map(),
    classMap = new Map(),
    periodMap = new Map(),
    scheduleKeys = new Set();
  professors.forEach((item, i) => {
    const source = object(item, `Professor antigo ${i + 1}`),
      old = legacyId(source.id, 'Professor');
    if (teacherMap.has(old))
      fail('O arquivo antigo contém professores com identificadores repetidos.');
    const id = `legacy-teacher-${old}`;
    state.teachers.push({
      id,
      name: string(source.nome, 'Nome do professor'),
      email: typeof source.email === 'string' ? source.email : '',
    });
    teacherMap.set(old, id);
  });
  function classFor(year, series) {
    if (!Number.isInteger(year) || year < 1900 || year > 2200)
      fail('O arquivo antigo contém um ano inválido.');
    const name = string(series, 'Série antiga', 80, true),
      key = JSON.stringify([year, name]);
    if (!classMap.has(key)) {
      const item = {
        id: `legacy-class-${classMap.size + 1}`,
        name: `${name || 'Turma sem nome'} · ${year}`,
      };
      classMap.set(key, item);
      state.classes.push(item);
    }
    return { item: classMap.get(key), key };
  }
  disciplines.forEach((item, i) => {
    const source = object(item, `Disciplina antiga ${i + 1}`),
      old = legacyId(source.id, 'Disciplina');
    if (subjectMap.has(old))
      fail('O arquivo antigo contém disciplinas com identificadores repetidos.');
    const id = `legacy-subject-${old}`,
      classEntry = classFor(source.ano, source.serie);
    state.subjects.push({ id, name: string(source.nome, 'Nome da disciplina'), color: '#346786' });
    subjectMap.set(old, { id, source, classId: classEntry.item.id });
  });
  schedules.forEach((item, scheduleIndex) => {
    const source = object(item, `Grade antiga ${scheduleIndex + 1}`),
      classEntry = classFor(source.ano, source.serie);
    if (scheduleKeys.has(classEntry.key))
      fail(
        'Há mais de uma grade antiga para a mesma turma e ano. Importe uma grade por vez para preservar sua organização.'
      );
    scheduleKeys.add(classEntry.key);
    list(source.grade, 'Linhas da grade antiga', 20).forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length < 6 || row.length > 7)
        fail('Uma linha da grade antiga tem formato inválido.');
      if (!unassigned(row[6]))
        fail(
          'O arquivo contém aulas no sábado. Esta ferramenta organiza segunda a sexta; adapte uma cópia antes de importar. Nenhuma aula foi descartada.'
        );
      const start = time(row[0], 'Horário da grade antiga'),
        startMinutes = minutes(start);
      const nextStart = source.grade[rowIndex + 1]?.[0];
      const nextMinutes =
        typeof nextStart === 'string' && TIME.test(nextStart) ? minutes(nextStart) : Infinity;
      const endMinutes =
        nextMinutes > startMinutes ? Math.min(startMinutes + 45, nextMinutes) : startMinutes + 45;
      if (endMinutes > 1439)
        fail('Uma aula antiga termina no dia seguinte. Revise o horário antes de importar.');
      const end = asTime(endMinutes),
        key = `${start}-${end}`;
      if (!periodMap.has(key)) {
        const period = {
          id: `legacy-period-${start.replace(':', '')}-${end.replace(':', '')}`,
          label: `${start}–${end}`,
          start,
          end,
        };
        state.periods.push(period);
        periodMap.set(key, period.id);
      }
      for (let day = 0; day < 5; day++) {
        if (unassigned(row[day + 1])) continue;
        const oldSubject = legacyId(row[day + 1], 'Aula'),
          subject = subjectMap.get(oldSubject);
        if (!subject)
          fail(
            'Uma aula antiga usa uma disciplina ausente do cadastro. Nenhuma aula foi descartada.'
          );
        if (subject.classId !== classEntry.item.id)
          fail(
            'Uma aula antiga usa disciplina de outra turma. Revise o arquivo antes de importar.'
          );
        if (unassigned(subject.source.professor))
          fail(
            'Uma aula antiga não tem professor definido. Cadastre o vínculo no arquivo antes de importar.'
          );
        const oldTeacher = legacyId(subject.source.professor, 'Professor da aula'),
          teacherId = teacherMap.get(oldTeacher);
        if (!teacherId)
          fail('Uma aula antiga usa professor ausente do cadastro. Nenhuma aula foi descartada.');
        state.lessons.push({
          id: `legacy-lesson-${scheduleIndex}-${rowIndex}-${day}`,
          classId: classEntry.item.id,
          periodId: periodMap.get(key),
          day,
          subjectId: subject.id,
          teacherId,
          room: '',
        });
      }
    });
  });
  if (!state.classes.length) state.classes = [{ id: 'class-default', name: 'Turma A' }];
  if (!state.periods.length) state.periods = createState().periods;
  state.periods.sort((a, b) => minutes(a.start) - minutes(b.start));
  state.classroom = state.classes[0].name;
  return validateState(state);
}
