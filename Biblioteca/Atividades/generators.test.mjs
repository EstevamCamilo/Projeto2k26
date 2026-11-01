import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaze, dotFigure, parsePracticeWords, validateDraft } from './generators.mjs';

test('labirintos são finitos, conectados e têm solução sem atravessar paredes', () => {
  for (const size of [4, 6, 8, 12])
    for (const seed of [0, 1, 42, 1234]) {
      const maze = createMaze(size, seed);
      assert.equal(maze.walls.length, size * size);
      assert.equal(maze.solution[0], 0);
      assert.equal(maze.solution.at(-1), size * size - 1);
      const visited = new Set([0]);
      const queue = [0];
      while (queue.length) {
        const current = queue.shift();
        const x = current % size;
        const y = Math.floor(current / size);
        [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].forEach(([dx, dy], direction) => {
          const nx = x + dx,
            ny = y + dy,
            next = ny * size + nx;
          if (
            !maze.walls[current][direction] &&
            nx >= 0 &&
            nx < size &&
            ny >= 0 &&
            ny < size &&
            !visited.has(next)
          ) {
            visited.add(next);
            queue.push(next);
          }
        });
      }
      assert.equal(visited.size, size * size);
      for (let i = 1; i < maze.solution.length; i++) {
        const from = maze.solution[i - 1],
          to = maze.solution[i],
          difference = to - from;
        assert.ok([1, -1, size, -size].includes(difference));
        const direction =
          difference === 1 ? 1 : difference === -1 ? 3 : difference === size ? 2 : 0;
        assert.equal(maze.walls[from][direction], false);
      }
    }
});

test('mesma semente reproduz a atividade e dimensões indevidas ficam limitadas', () => {
  assert.deepEqual(createMaze(8, 42), createMaze(8, 42));
  assert.equal(createMaze(999, 1).size, 12);
  assert.equal(createMaze(-5, 1).size, 4);
});

test('ligação de pontos gera figuras numeráveis com coordenadas finitas', () => {
  for (const seed of [0, 1, 2]) {
    const figure = dotFigure(seed);
    assert.ok(figure.points.length >= 9);
    assert.ok(figure.points.every((point) => point.every(Number.isFinite)));
    assert.equal(new Set(figure.points.map((point) => point.join(','))).size, figure.points.length);
  }
});

test('palavras não duplicam e respeitam limites de quantidade e tamanho', () => {
  assert.deepEqual(parsePracticeWords('BOLA, CASA;BOLA\nSOL', 3), ['BOLA', 'CASA', 'SOL']);
  assert.equal(
    parsePracticeWords(
      Array(30)
        .fill(0)
        .map((_, i) => 'PALAVRA' + i)
        .join(','),
      30
    ).length,
    12
  );
  assert.equal(parsePracticeWords('X'.repeat(100))[0].length, 28);
});

test('rascunhos inválidos não entram na atividade nem injetam propriedades arbitrárias', () => {
  assert.equal(validateDraft({ title: 'teste' }, 'colorir'), null);
  const draft = {
    title: '<img onerror=alert(1)>',
    words: 'CASA',
    school: '',
    student: '',
    classroom: '',
    date: '',
    letterCase: 'upper',
    adaptation: 'standard',
    count: 6,
    complexity: 6,
    seed: 42,
    showSolution: false,
    fills: { 'part-1': '#76b98a', 'part-2': 'url(javascript:alert(1))', invalid: '#76b98a' },
  };
  const valid = validateDraft(draft, 'colorir');
  assert.equal(valid.title, draft.title);
  assert.deepEqual(valid.fills, { 'part-1': '#76b98a' });
  assert.equal(validateDraft({ ...draft, count: 9999999 }, 'colorir'), null);
});
