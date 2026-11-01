/** Regras puras dos jogos: sem DOM, timers ou dependências externas. */
export const hangmanWords = [
  { word: 'LEÃO', hint: 'Mamífero' },
  { word: 'ESCORPIÃO', hint: 'Aracnídeo' },
  { word: 'ONÇA', hint: 'Mamífero' },
  { word: 'CACHORRO', hint: 'Mamífero' },
  { word: 'GATO', hint: 'Mamífero' },
  { word: 'DINOSSAURO', hint: 'Réptil' },
  { word: 'ARANHA', hint: 'Aracnídeo' },
  { word: 'COMPUTADOR', hint: 'Tecnologia' },
  { word: 'MOSCA', hint: 'Inseto' },
  { word: 'GAFANHOTO', hint: 'Inseto' },
].filter((item) => item.word.trim());

export const normalizeWord = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR');

export function shuffle(values, random = Math.random) {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function findWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { player: board[a], line };
  }
  return null;
}

export function neighbors(index, size = 4) {
  return [index - size, index + size, index - 1, index + 1].filter(
    (other) =>
      other >= 0 &&
      other < size * size &&
      (Math.abs(other - index) === size || Math.floor(other / size) === Math.floor(index / size))
  );
}

export function isSolved(tiles) {
  return tiles.every((tile, index) => tile === (index + 1) % tiles.length);
}

export function moveTile(tiles, index, size = 4) {
  const empty = tiles.indexOf(0);
  if (!Number.isInteger(index) || !neighbors(empty, size).includes(index)) return tiles;
  const result = tiles.slice();
  [result[index], result[empty]] = [result[empty], result[index]];
  return result;
}

export function createPuzzle(size = 4, random = Math.random) {
  const tiles = Array.from({ length: size * size }, (_, index) => (index + 1) % (size * size));
  let empty = tiles.length - 1;
  let previous = -1;
  // Only valid moves from the solved state: every generated board is solvable.
  for (let step = 0; step < 120; step++) {
    const options = neighbors(empty, size).filter((index) => index !== previous);
    const target = options[Math.floor(random() * options.length)];
    [tiles[empty], tiles[target]] = [tiles[target], tiles[empty]];
    previous = empty;
    empty = target;
  }
  if (isSolved(tiles)) {
    const target = neighbors(empty, size)[0];
    [tiles[empty], tiles[target]] = [tiles[target], tiles[empty]];
  }
  return tiles;
}
