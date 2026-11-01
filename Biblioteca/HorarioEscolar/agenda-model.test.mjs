import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, validateState, findConflicts, importSchedule } from './agenda-model.js';

function fixture() {
  const state = createState();
  state.teachers = [{ id: 'teacher-1', name: 'Professora A', email: '' }];
  state.subjects = [{ id: 'subject-1', name: 'Matemática', color: '#346786' }];
  state.classes.push({ id: 'class-b', name: 'Turma B' });
  return state;
}
function lesson(overrides = {}) {
  return {
    id: 'lesson-1',
    classId: 'class-default',
    periodId: 'period-1',
    day: 0,
    subjectId: 'subject-1',
    teacherId: 'teacher-1',
    room: '',
    ...overrides,
  };
}

test('estado inicial é validado e validação não modifica o original', () => {
  const state = createState(),
    result = validateState(state);
  assert.deepEqual(result, state);
  assert.notEqual(result, state);
  assert.notEqual(result.periods[0], state.periods[0]);
});
test('referências órfãs, IDs repetidos, cor e datas inválidas são rejeitados', () => {
  const state = fixture();
  state.lessons = [lesson({ teacherId: 'missing' })];
  assert.throws(() => validateState(state), /não está cadastrado/);
  state.lessons = [];
  state.classes.push({ ...state.classes[0] });
  assert.throws(() => validateState(state), /repetidos/);
  const color = fixture();
  color.subjects[0].color = 'red;background:url(x)';
  assert.throws(() => validateState(color), /hexadecimal/);
  const date = fixture();
  date.date = '2026-02-31';
  assert.throws(() => validateState(date), /data válida/);
});
test('limita coleções, nomes e horários sem aceitar NaN ou turnos invertidos', () => {
  const state = fixture();
  state.teachers = Array.from({ length: 101 }, (_, i) => ({ id: String(i), name: 'A', email: '' }));
  assert.throws(() => validateState(state), /até 100/);
  const period = fixture();
  period.periods[0].end = '06:00';
  assert.throws(() => validateState(period), /posterior/);
  const day = fixture();
  day.lessons = [lesson({ day: NaN })];
  assert.throws(() => validateState(day), /segunda e sexta/);
});
test('detecta professor simultâneo em turmas distintas e permite horários adjacentes', () => {
  const state = fixture();
  state.lessons = [lesson(), lesson({ id: 'lesson-2', classId: 'class-b' })];
  assert.equal(findConflicts(state).length, 1);
  assert.match(findConflicts(state)[0], /Professora A.*simultâneas/);
  state.lessons[1].periodId = 'period-2';
  assert.deepEqual(findConflicts(state), []);
});
test('detecta sobreposição temporal mesmo com IDs de período diferentes', () => {
  const state = fixture();
  state.periods.push({ id: 'overlap', label: 'Extra', start: '07:20', end: '08:00' });
  state.lessons = [lesson(), lesson({ id: 'lesson-2', periodId: 'overlap' })];
  const conflicts = findConflicts(state);
  assert.equal(conflicts.length, 2);
  assert.ok(conflicts.some((message) => message.includes('turma Turma A')));
  state.lessons[1].day = 1;
  assert.deepEqual(findConflicts(state), []);
});
test('importação nativa é validada e não altera a entrada', () => {
  const state = fixture();
  state.lessons = [lesson()];
  assert.deepEqual(importSchedule(state), state);
  assert.notEqual(importSchedule(state), state);
});
test('importa todas as aulas preenchidas do arquivo original', async () => {
  const legacy = JSON.parse(await readFile(new URL('./gradehorario.txt', import.meta.url), 'utf8'));
  const populated = legacy.horarios.reduce(
    (sum, h) =>
      sum +
      h.grade.reduce(
        (count, row) =>
          count +
          row.slice(1, 6).filter((cell) => !['', '-1', -1, null, undefined].includes(cell)).length,
        0
      ),
    0
  );
  const imported = importSchedule(legacy);
  assert.equal(imported.teachers.length, 5);
  assert.equal(imported.subjects.length, 10);
  assert.equal(imported.lessons.length, populated);
  assert.equal(imported.periods[0].start, '07:00');
  assert.equal(imported.periods.at(-1).end, '09:15');
  assert.equal(imported.lessons[0].day, 0);
});
test('rejeita aulas de sábado e referências quebradas sem descartar dados', () => {
  const legacy = {
    professores: [{ id: 1, nome: 'Professor', email: '' }],
    disciplinas: [{ id: 2, nome: 'Ciências', ano: 2026, serie: 'A', professor: 1 }],
    horarios: [{ ano: 2026, serie: 'A', grade: [['07:00', '2', '-1', '-1', '-1', '-1', '2']] }],
  };
  const original = JSON.stringify(legacy);
  assert.throws(() => importSchedule(legacy), /sábado/);
  assert.equal(JSON.stringify(legacy), original);
  legacy.horarios[0].grade[0][6] = '-1';
  legacy.horarios[0].grade[0][1] = '999';
  assert.throws(() => importSchedule(legacy), /disciplina ausente/);
});
