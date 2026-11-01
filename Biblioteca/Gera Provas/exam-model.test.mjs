import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createExam,
  validateExam,
  validateQuestion,
  moveQuestion,
  totalPoints,
  validDate,
} from './exam-model.mjs';

const multiple = {
  id: 'question-1',
  type: 'multiple',
  prompt: 'Quanto é 2 + 2?',
  points: 1.5,
  options: ['3', '4', '5'],
  answer: 1,
};
const open = {
  id: 'question-2',
  type: 'open',
  prompt: 'Explique como você chegou à resposta.',
  points: 2.25,
  lines: 4,
  modelAnswer: 'Duas parcelas de dois resultam em quatro.',
};
const truefalse = {
  id: 'question-3',
  type: 'truefalse',
  prompt: 'Marque V ou F.',
  points: 1.25,
  statements: [
    { text: 'Uma semana tem sete dias.', answer: true },
    { text: 'Um dia tem 30 horas.', answer: false },
  ],
};

test('a prova aceita os três tipos e soma pontos decimais sem erro de arredondamento', () => {
  const exam = createExam();
  exam.questions = [multiple, open, truefalse];
  assert.equal(validateExam(exam).questions.length, 3);
  assert.equal(totalPoints(exam.questions), 5);
  assert.equal(totalPoints([{ points: 0.1 }, { points: 0.2 }]), 0.3);
});
test('o gabarito de múltipla escolha deve apontar para uma alternativa existente', () => {
  assert.throws(() => validateQuestion({ ...multiple, answer: 3 }), /alternativa correta/);
  assert.throws(() => validateQuestion({ ...multiple, options: ['3', ''] }), /Alternativa B/);
});
test('V/F exige afirmações e respostas booleanas explícitas', () => {
  assert.throws(() => validateQuestion({ ...truefalse, statements: [] }), /uma a dez/);
  assert.throws(
    () =>
      validateQuestion({
        ...truefalse,
        statements: [{ text: 'Teste', answer: 'false' }],
      }),
    /Escolha V ou F/
  );
});
test('a validação rejeita dados impossíveis, arquivos excessivos e IDs repetidos', () => {
  const exam = createExam();
  assert.throws(() => validateExam({ ...exam, questions: [multiple, multiple] }), /repetidos/);
  assert.throws(
    () =>
      validateExam({
        ...exam,
        metadata: { ...exam.metadata, date: '2026-02-30' },
      }),
    /data válida/
  );
  assert.throws(() => validateExam({ ...exam, questions: Array(101).fill(multiple) }), /100/);
  assert.throws(() => validateQuestion({ ...open, points: -1 }), /pontuação/);
  assert.throws(() => validateQuestion({ ...open, points: 1.001 }), /pontuação/);
  assert.throws(() => validateQuestion({ ...open, lines: 1000 }), /doze linhas/);
});
test('reordenar não perde questões nem altera o array original', () => {
  const original = [multiple, open, truefalse];
  assert.deepEqual(moveQuestion(original, 'question-2', -1), [open, multiple, truefalse]);
  assert.deepEqual(original, [multiple, open, truefalse]);
  assert.deepEqual(moveQuestion(original, 'question-1', -1), original);
});
test('conteúdo textual importado é preservado como texto e campos não previstos são descartados', () => {
  const exam = createExam();
  exam.metadata.title = '<img src=x onerror=alert(1)>';
  exam.questions = [{ ...multiple, admin: true }];
  const validated = validateExam(exam);
  assert.equal(validated.metadata.title, '<img src=x onerror=alert(1)>');
  assert.equal(Object.hasOwn(validated.questions[0], 'admin'), false);
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2026-02-29'), false);
});
