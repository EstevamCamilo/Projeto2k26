export const activityTypes = ['caligrafia', 'labirinto', 'colorir', 'pontos', 'coordenacao'];

export const activityNames = {
  caligrafia: 'Caligrafia criativa',
  labirinto: 'Explore o labirinto',
  colorir: 'Vamos colorir',
  pontos: 'Ligue os pontos',
  coordenacao: 'Coordenação motora',
};

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parsePracticeWords(input, count = 6) {
  const words = String(input)
    .split(/[,;\r\n]+/)
    .map((word) => word.trim())
    .filter(Boolean);
  return [...new Set(words)]
    .slice(0, Math.min(12, Math.max(1, count)))
    .map((word) => word.slice(0, 28));
}

export function createMaze(requestedSize, seed) {
  const size = Math.max(4, Math.min(12, Math.round(Number(requestedSize) || 6)));
  const random = seededRandom(seed);
  const walls = Array.from({ length: size * size }, () => [true, true, true, true]);
  const visited = new Set([0]);
  const parents = new Map();
  const stack = [0];
  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  while (stack.length) {
    const current = stack[stack.length - 1];
    const x = current % size;
    const y = Math.floor(current / size);
    const candidates = directions
      .map(([dx, dy], direction) => ({ x: x + dx, y: y + dy, direction }))
      .filter(
        (next) =>
          next.x >= 0 &&
          next.y >= 0 &&
          next.x < size &&
          next.y < size &&
          !visited.has(next.y * size + next.x)
      );
    if (!candidates.length) {
      stack.pop();
      continue;
    }
    const next = candidates[Math.floor(random() * candidates.length)];
    const index = next.y * size + next.x;
    walls[current][next.direction] = false;
    walls[index][(next.direction + 2) % 4] = false;
    parents.set(index, current);
    visited.add(index);
    stack.push(index);
  }
  const solution = [size * size - 1];
  while (solution[solution.length - 1] !== 0)
    solution.push(parents.get(solution[solution.length - 1]));
  solution.reverse();
  walls[0][3] = false;
  walls[size * size - 1][1] = false;
  return { size, walls, solution };
}

export function dotFigure(seed) {
  if (seed % 3 === 0)
    return {
      name: 'uma estrela',
      points: Array.from({ length: 10 }, (_, i) => {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 ? 78 : 170;
        return [250 + Math.cos(angle) * radius, 210 + Math.sin(angle) * radius];
      }),
    };
  if (seed % 3 === 1)
    return {
      name: 'uma casa',
      points: [
        [110, 335],
        [110, 185],
        [250, 70],
        [390, 185],
        [390, 335],
        [285, 335],
        [285, 245],
        [215, 245],
        [215, 335],
      ],
    };
  return {
    name: 'um coração',
    points: [
      [250, 150],
      [200, 100],
      [140, 100],
      [100, 150],
      [100, 210],
      [130, 250],
      [250, 350],
      [370, 250],
      [400, 210],
      [400, 150],
      [360, 100],
      [300, 100],
    ],
  };
}

export function validateDraft(value, type) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !activityTypes.includes(type))
    return null;
  const string = (key, max) => typeof value[key] === 'string' && value[key].length <= max;
  if (
    !string('title', 120) ||
    !string('words', 600) ||
    !string('school', 120) ||
    !string('student', 120) ||
    !string('classroom', 60) ||
    !string('date', 10)
  )
    return null;
  if (
    !['upper', 'lower', 'original'].includes(value.letterCase) ||
    !['standard', 'short', 'spaced'].includes(value.adaptation)
  )
    return null;
  if (
    !Number.isInteger(value.count) ||
    value.count < 1 ||
    value.count > (type === 'coordenacao' ? 8 : 12) ||
    !Number.isInteger(value.complexity) ||
    value.complexity < 4 ||
    value.complexity > 12
  )
    return null;
  if (
    !Number.isInteger(value.seed) ||
    value.seed < 0 ||
    value.seed > 4294967295 ||
    typeof value.showSolution !== 'boolean'
  )
    return null;
  if (value.date && !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
  const palette = ['#76b98a', '#efaf66', '#a79bd8', '#7bb6d7', '#e9a0ae', '#f1d974', '#ffffff'];
  const fills = {};
  if (value.fills && typeof value.fills === 'object' && !Array.isArray(value.fills)) {
    for (const [key, color] of Object.entries(value.fills).slice(0, 100))
      if (/^part-\d{1,3}$/.test(key) && palette.includes(color)) fills[key] = color;
  }
  return {
    type,
    title: value.title,
    words: value.words,
    school: value.school,
    student: value.student,
    classroom: value.classroom,
    date: value.date,
    letterCase: value.letterCase,
    adaptation: value.adaptation,
    count: value.count,
    complexity: value.complexity,
    seed: value.seed,
    showSolution: value.showSolution,
    fills,
  };
}
