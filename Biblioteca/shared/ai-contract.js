/** Contrato puro compartilhado entre navegador e servidor; nenhuma credencial. */
export const AI_LIMITS = Object.freeze({ words: 24, handwriting: 12, exam: 20, schedule: 40 });
export const AI_LABELS = Object.freeze({
  words: 'Caça-palavras',
  handwriting: 'Caligrafia',
  exam: 'Prova',
  schedule: 'Horário escolar',
});
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${name} deve ser um objeto.`);
  return value;
}
function text(value, name, maximum, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > maximum || (!allowEmpty && !value.trim()))
    throw new Error(`${name}: use ${allowEmpty ? 'até' : 'entre 1 e'} ${maximum} caracteres.`);
  return value.trim();
}
function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name}: escolha um número inteiro entre ${min} e ${max}.`);
  return value;
}
function list(value, name, maximum, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum)
    throw new Error(`${name}: inclua de ${minimum} a ${maximum} itens.`);
  return value;
}
export function validateAIRequest(raw) {
  const value = object(raw, 'Pedido');
  if (!Object.hasOwn(AI_LIMITS, value.kind)) throw new Error('Escolha uma ferramenta válida.');
  const periodCount =
    value.kind === 'schedule'
      ? integer(value.periodCount ?? 3, 'Número de períodos', 1, 8)
      : undefined;
  return {
    kind: value.kind,
    ...(value.kind === 'schedule' ? { periodCount } : {}),
    topic: text(value.topic, 'Tema', 300),
    level: text(value.level, 'Etapa de ensino', 80),
    count: integer(
      value.count,
      'Quantidade',
      1,
      value.kind === 'schedule'
        ? Math.min(AI_LIMITS.schedule, periodCount * 5)
        : AI_LIMITS[value.kind]
    ),
  };
}
export function validateAIResult(raw, rawRequest) {
  const request = validateAIRequest(rawRequest),
    value = object(raw, 'Conteúdo');
  if (value.kind !== request.kind) throw new Error('O conteúdo pertence a outra ferramenta.');
  const result = {
    kind: request.kind,
    title: text(value.title, 'Título', 120),
    instructions: text(value.instructions, 'Instruções', 1500, true),
  };
  if (request.kind === 'words') {
    result.words = list(value.words, 'Palavras', request.count).map((word) => {
      const normalized = text(word, 'Palavra', 16);
      if (!/^[\p{L}]{2,16}$/u.test(normalized))
        throw new Error('Use palavras de 2 a 16 letras, sem espaços, números ou símbolos.');
      return normalized;
    });
    const unique = new Set(
      result.words.map((word) =>
        word.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
      )
    );
    if (unique.size !== result.words.length) throw new Error('As palavras não podem se repetir.');
  } else if (request.kind === 'handwriting') {
    result.sentences = list(value.sentences, 'Frases', request.count).map((sentence) => {
      const normalized = text(sentence, 'Frase', 28);
      if (/[,;\r\n]/.test(normalized))
        throw new Error('Use frases curtas sem vírgulas, ponto-e-vírgula ou quebras de linha.');
      return normalized;
    });
  } else if (request.kind === 'exam') {
    result.questions = list(value.questions, 'Questões', request.count).map((rawQuestion) => {
      const question = object(rawQuestion, 'Questão');
      if (!['multiple', 'open', 'truefalse'].includes(question.type))
        throw new Error('Tipo de questão inválido.');
      if (
        typeof question.points !== 'number' ||
        !Number.isFinite(question.points) ||
        question.points < 0 ||
        question.points > 1000 ||
        Math.abs(question.points * 100 - Math.round(question.points * 100)) > 1e-8
      )
        throw new Error('Use pontuação de 0 a 1.000, com até duas casas decimais.');
      const normalized = {
        type: question.type,
        prompt: text(question.prompt, 'Enunciado', 2000),
        points: question.points,
      };
      if (question.type === 'multiple') {
        normalized.options = list(question.options, 'Alternativas', 6, 2).map((option) =>
          text(option, 'Alternativa', 500)
        );
        normalized.answer = integer(
          question.answer,
          'Alternativa correta',
          0,
          normalized.options.length - 1
        );
      } else if (question.type === 'open') {
        normalized.lines = integer(question.lines, 'Linhas da resposta', 2, 12);
        normalized.modelAnswer = text(question.modelAnswer, 'Resposta esperada', 2000, true);
      } else {
        normalized.statements = list(question.statements, 'Afirmações', 10).map((rawStatement) => {
          const statement = object(rawStatement, 'Afirmação');
          if (typeof statement.answer !== 'boolean') throw new Error('Indique V ou F no gabarito.');
          return { text: text(statement.text, 'Afirmação', 700), answer: statement.answer };
        });
      }
      return normalized;
    });
  } else {
    result.lessons = list(value.lessons, 'Aulas', request.count).map((rawLesson) => {
      const lesson = object(rawLesson, 'Aula');
      return {
        day: integer(lesson.day, 'Dia', 0, 4),
        period: integer(lesson.period, 'Período', 1, request.periodCount),
        subject: text(lesson.subject, 'Disciplina', 100),
        teacher: text(lesson.teacher, 'Professor', 120, true),
      };
    });
    if (
      new Set(result.lessons.map((lesson) => `${lesson.day}:${lesson.period}`)).size !==
      result.lessons.length
    )
      throw new Error('Há mais de uma aula no mesmo dia e período.');
  }
  return result;
}
const string = (maxLength, allowEmpty = false) => ({
  type: 'string',
  minLength: allowEmpty ? 0 : 1,
  maxLength,
});
const array = (items, maxItems, minItems = 1) => ({ type: 'array', items, minItems, maxItems });
const schemaObject = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
/** Structured Outputs: cada formato é fechado, com todos os campos obrigatórios. */
export function generationSchema(rawRequest) {
  const request = validateAIRequest(rawRequest);
  const properties = {
    kind: { type: 'string', enum: [request.kind] },
    title: string(120),
    instructions: string(1500, true),
  };
  if (request.kind === 'words')
    properties.words = array(
      { type: 'string', minLength: 2, maxLength: 16, pattern: '^[A-Za-zÀ-ÖØ-öø-ÿ]+$' },
      request.count
    );
  else if (request.kind === 'handwriting')
    properties.sentences = array({ ...string(28), pattern: '^[^,;\\r\\n]+$' }, request.count);
  else if (request.kind === 'exam') {
    const common = { prompt: string(2000), points: { type: 'number', minimum: 0, maximum: 1000 } };
    properties.questions = array(
      {
        anyOf: [
          schemaObject({
            type: { type: 'string', enum: ['multiple'] },
            ...common,
            options: array(string(500), 6, 2),
            answer: { type: 'integer', minimum: 0, maximum: 5 },
          }),
          schemaObject({
            type: { type: 'string', enum: ['open'] },
            ...common,
            lines: { type: 'integer', minimum: 2, maximum: 12 },
            modelAnswer: string(2000, true),
          }),
          schemaObject({
            type: { type: 'string', enum: ['truefalse'] },
            ...common,
            statements: array(schemaObject({ text: string(700), answer: { type: 'boolean' } }), 10),
          }),
        ],
      },
      request.count
    );
  } else
    properties.lessons = array(
      schemaObject({
        day: { type: 'integer', minimum: 0, maximum: 4 },
        period: { type: 'integer', minimum: 1, maximum: request.periodCount },
        subject: string(100),
        teacher: { type: 'string', enum: [''] },
      }),
      request.count
    );
  return schemaObject(properties);
}
