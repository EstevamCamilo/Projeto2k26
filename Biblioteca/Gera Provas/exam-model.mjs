export const EXAM_VERSION = 2;
export const MAX_QUESTIONS = 100;
export const QUESTION_TYPES = {
  multiple: 'Múltipla escolha',
  open: 'Dissertativa',
  truefalse: 'Verdadeiro ou falso',
};

function text(value, name, maximum, required = false) {
  if (typeof value !== 'string' || value.length > maximum || (required && !value.trim())) {
    throw new Error(
      `${name}: ${required ? 'preencha o campo e ' : ''}use até ${maximum} caracteres.`
    );
  }
  return value.trim();
}

export function validDate(value) {
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function createExam() {
  return {
    version: EXAM_VERSION,
    metadata: {
      title: 'Avaliação escolar',
      school: '',
      subject: '',
      teacher: '',
      student: '',
      className: '',
      date: '',
      instructions: 'Leia cada questão com atenção. Faça no seu ritmo.',
    },
    questions: [],
    includeAnswerKey: false,
  };
}

export function validateQuestion(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Questão inválida.');
  if (!Object.hasOwn(QUESTION_TYPES, value.type))
    throw new Error('Escolha um tipo de questão válido.');
  const id = text(value.id, 'Identificador da questão', 100, true);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('O identificador da questão é inválido.');
  const prompt = text(value.prompt, 'Enunciado', 3000, true);
  if (
    typeof value.points !== 'number' ||
    !Number.isFinite(value.points) ||
    value.points < 0 ||
    value.points > 1000 ||
    Math.abs(value.points * 100 - Math.round(value.points * 100)) > 1e-8
  )
    throw new Error('A pontuação deve estar entre 0 e 1.000, com até duas casas decimais.');
  const question = { id, type: value.type, prompt, points: value.points };
  if (value.type === 'multiple') {
    if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 6)
      throw new Error('Inclua de duas a seis alternativas.');
    question.options = value.options.map((option, i) =>
      text(option, `Alternativa ${String.fromCharCode(65 + i)}`, 500, true)
    );
    if (
      !Number.isInteger(value.answer) ||
      value.answer < 0 ||
      value.answer >= question.options.length
    )
      throw new Error('Marque uma alternativa correta para o gabarito.');
    question.answer = value.answer;
  } else if (value.type === 'open') {
    if (!Number.isInteger(value.lines) || value.lines < 2 || value.lines > 12)
      throw new Error('Escolha de duas a doze linhas para a resposta.');
    question.lines = value.lines;
    question.modelAnswer = text(value.modelAnswer ?? '', 'Resposta esperada', 2000);
  } else {
    if (
      !Array.isArray(value.statements) ||
      value.statements.length < 1 ||
      value.statements.length > 10
    )
      throw new Error('Inclua de uma a dez afirmações.');
    question.statements = value.statements.map((item, i) => {
      if (!item || typeof item !== 'object' || typeof item.answer !== 'boolean')
        throw new Error(`Escolha V ou F para a afirmação ${i + 1}.`);
      return {
        text: text(item.text, `Afirmação ${i + 1}`, 700, true),
        answer: item.answer,
      };
    });
  }
  return question;
}

export function validateExam(value) {
  if (!value || typeof value !== 'object' || value.version !== EXAM_VERSION)
    throw new Error('Use um arquivo de prova QVC compatível com a versão 2.');
  if (!value.metadata || typeof value.metadata !== 'object')
    throw new Error('O cabeçalho da prova é inválido.');
  const raw = value.metadata;
  const metadata = {
    title: text(raw.title, 'Título', 120, true),
    school: text(raw.school, 'Escola', 180),
    subject: text(raw.subject, 'Disciplina', 100),
    teacher: text(raw.teacher, 'Professor', 120),
    student: text(raw.student, 'Aluno', 180),
    className: text(raw.className, 'Turma', 80),
    date: text(raw.date, 'Data', 10),
    instructions: text(raw.instructions, 'Instruções', 2000),
  };
  if (!validDate(metadata.date)) throw new Error('Informe uma data válida.');
  if (!Array.isArray(value.questions) || value.questions.length > MAX_QUESTIONS)
    throw new Error(`Uma prova pode ter até ${MAX_QUESTIONS} questões.`);
  const questions = value.questions.map(validateQuestion);
  if (new Set(questions.map((question) => question.id)).size !== questions.length)
    throw new Error('O arquivo contém identificadores de questões repetidos.');
  if (typeof value.includeAnswerKey !== 'boolean')
    throw new Error('A configuração do gabarito é inválida.');
  return {
    version: EXAM_VERSION,
    metadata,
    questions,
    includeAnswerKey: value.includeAnswerKey,
  };
}

export function totalPoints(questions) {
  return Math.round(questions.reduce((total, question) => total + question.points, 0) * 100) / 100;
}
export function formatPoints(value) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}
export function moveQuestion(questions, id, direction) {
  const index = questions.findIndex((question) => question.id === id),
    target = index + direction;
  if (index < 0 || target < 0 || target >= questions.length || ![-1, 1].includes(direction))
    return [...questions];
  const result = [...questions];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
