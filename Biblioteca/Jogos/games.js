import {
  createPuzzle,
  findWinner,
  hangmanWords,
  isSolved,
  moveTile,
  neighbors,
  normalizeWord,
  shuffle,
} from './game-core.js';

const game = document.body.dataset.qvcGame;
const board = document.getElementById('game-board');
const status = document.getElementById('game-status');
const resetButton = document.getElementById('game-reset');

function announce(message, complete = false) {
  status.textContent = message;
  status.toggleAttribute('data-complete', complete);
}
function makeButton(label, handler) {
  const button = document.createElement('button');
  button.dataset.qvcPrintableButton = '';
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.addEventListener('click', handler);
  return button;
}
function printGame() {
  if (window.QVC?.print) window.QVC.print();
  else window.print();
}

document.getElementById('game-print')?.addEventListener('click', printGame);

function startTicTacToe() {
  let cells;
  let current;
  const buttons = Array.from({ length: 9 }, (_, index) =>
    makeButton('Casa ' + (index + 1) + ': vazia', () => {
      if (cells[index] || findWinner(cells) || cells.every(Boolean)) return;
      cells[index] = current;
      current = current === 'X' ? 'O' : 'X';
      render();
    })
  );
  board.append(...buttons);
  function render() {
    const winner = findWinner(cells);
    buttons.forEach((button, index) => {
      button.textContent = cells[index] || '·';
      button.setAttribute('aria-label', 'Casa ' + (index + 1) + ': ' + (cells[index] || 'vazia'));
      button.disabled = Boolean(cells[index] || winner || cells.every(Boolean));
      button.toggleAttribute('data-winning', Boolean(winner?.line.includes(index)));
    });
    if (winner)
      announce(winner.player + ' venceu! Uma boa partida. Que tal jogar novamente?', true);
    else if (cells.every(Boolean)) announce('Empate! Os dois fizeram boas escolhas.', true);
    else announce('Agora é a vez de ' + current + '. Escolha uma casa vazia.');
  }
  function reset() {
    cells = Array(9).fill('');
    current = 'X';
    render();
  }
  resetButton.addEventListener('click', reset);
  reset();
}

function startHangman() {
  let selected;
  let used;
  const clue = document.getElementById('game-clue');
  const drawing = document.getElementById('game-drawing');
  const reveal = document.getElementById('game-word');
  const buttons = new Map();
  function guess(letter) {
    const normalized = normalizeWord(selected.word);
    const errors = [...used].filter((value) => !normalized.includes(value)).length;
    if (used.has(letter) || errors >= 6 || [...normalized].every((value) => used.has(value)))
      return;
    used.add(letter);
    render();
  }
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const button = makeButton('Escolher letra ' + letter, () => guess(letter));
    button.textContent = letter;
    buttons.set(letter, button);
    board.append(button);
  }
  function render() {
    const normalized = normalizeWord(selected.word);
    const errors = [...used].filter((value) => !normalized.includes(value)).length;
    const won = [...normalized].every((value) => used.has(value));
    const ended = won || errors >= 6;
    clue.textContent = 'Pista: ' + selected.hint;
    reveal.replaceChildren(
      ...Array.from(selected.word, (letter, index) => {
        const node = document.createElement('span');
        node.textContent = used.has(normalized[index]) || ended ? letter : '_';
        return node;
      })
    );
    reveal.setAttribute(
      'aria-label',
      'Palavra: ' + [...reveal.children].map((node) => node.textContent).join(' ')
    );
    drawing.querySelectorAll('[data-mistake]').forEach((node) => {
      node.style.display = Number(node.dataset.mistake) <= errors ? '' : 'none';
    });
    buttons.forEach((button, letter) => {
      button.disabled = ended || used.has(letter);
      button.toggleAttribute('data-correct', used.has(letter) && normalized.includes(letter));
      button.setAttribute('aria-pressed', String(used.has(letter)));
    });
    if (won) announce('Você descobriu: ' + selected.word + '! Muito bem.', true);
    else if (errors >= 6)
      announce('A palavra era ' + selected.word + '. Vamos tentar uma nova descoberta?', true);
    else announce(6 - errors + ' tentativas incorretas disponíveis. Escolha uma letra.');
  }
  function reset() {
    selected = hangmanWords[Math.floor(Math.random() * hangmanWords.length)];
    used = new Set();
    render();
  }
  document.addEventListener('keydown', (event) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat ||
      document.querySelector('dialog[open]')
    )
      return;
    if (
      event.target instanceof HTMLElement &&
      (event.target.matches('input,textarea,select') || event.target.isContentEditable)
    )
      return;
    const letter = normalizeWord(event.key);
    if (/^[A-Z]$/.test(letter)) {
      event.preventDefault();
      guess(letter);
    }
  });
  resetButton.addEventListener('click', reset);
  reset();
}

function startMemory() {
  const pictures = [
    { value: '🍉', name: 'melancia' },
    { value: '🍓', name: 'morango' },
    { value: '🍇', name: 'uva' },
    { value: '🍊', name: 'laranja' },
    { value: '🍌', name: 'banana' },
    { value: '🍒', name: 'cerejas' },
    { value: '🍎', name: 'maçã' },
    { value: '🍍', name: 'abacaxi' },
  ];
  const pairCount = document.getElementById('game-pairs');
  let cards;
  let open;
  let matched;
  let moves;
  let timer;
  let buttons;
  function render() {
    buttons.forEach((button, index) => {
      const visible = open.includes(index) || matched.has(index);
      button.toggleAttribute('data-revealed', visible);
      button.toggleAttribute('data-matched', matched.has(index));
      button.disabled = open.length === 2 || visible;
      button.setAttribute(
        'aria-label',
        'Carta ' + (index + 1) + ': ' + (visible ? cards[index].name : 'fechada')
      );
    });
    announce(
      matched.size === cards.length
        ? 'Todos os pares encontrados em ' + moves + ' jogadas. Você conseguiu!'
        : matched.size / 2 +
            ' de ' +
            cards.length / 2 +
            ' pares encontrados · ' +
            moves +
            ' jogadas.',
      matched.size === cards.length
    );
  }
  function flip(index) {
    if (open.length === 2 || matched.has(index) || open.includes(index)) return;
    open.push(index);
    if (open.length === 2) {
      moves++;
      const [first, second] = open;
      if (cards[first].name === cards[second].name) {
        matched.add(first);
        matched.add(second);
        open = [];
      } else
        timer = setTimeout(() => {
          open = [];
          render();
        }, 900);
    }
    render();
  }
  function reset() {
    clearTimeout(timer);
    const count = [4, 6, 8].includes(Number(pairCount.value)) ? Number(pairCount.value) : 6;
    const selected = pictures.slice(0, count);
    cards = shuffle([...selected, ...selected]);
    open = [];
    matched = new Set();
    moves = 0;
    buttons = cards.map((card, index) => {
      const button = makeButton('Carta ' + (index + 1) + ': fechada', () => flip(index));
      button.className = 'qvc-memory-card';
      button.dataset.qvcPrintText = card.value;
      const back = document.createElement('span');
      back.className = 'qvc-memory-back';
      back.textContent = '?';
      back.setAttribute('aria-hidden', 'true');
      const face = document.createElement('span');
      face.className = 'qvc-memory-face';
      face.textContent = card.value;
      face.setAttribute('aria-hidden', 'true');
      button.append(back, face);
      return button;
    });
    board.replaceChildren(...buttons);
    render();
  }
  pairCount.addEventListener('change', reset);
  resetButton.addEventListener('click', reset);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  reset();
}

function startPuzzle() {
  let tiles;
  let moves;
  const buttons = Array.from({ length: 16 }, (_, index) =>
    makeButton('', () => {
      if (isSolved(tiles)) return;
      const next = moveTile(tiles, index);
      if (next === tiles) {
        announce('Escolha uma peça ao lado do espaço vazio, na horizontal ou na vertical.');
        return;
      }
      tiles = next;
      moves++;
      render();
    })
  );
  board.append(...buttons);
  function render() {
    const available = neighbors(tiles.indexOf(0));
    const complete = isSolved(tiles);
    buttons.forEach((button, index) => {
      button.textContent = tiles[index] || '';
      button.dataset.value = String(tiles[index]);
      button.toggleAttribute('data-empty', tiles[index] === 0);
      button.toggleAttribute('data-neighbor', available.includes(index));
      button.setAttribute('aria-label', tiles[index] ? 'Peça ' + tiles[index] : 'Espaço vazio');
      button.disabled = tiles[index] === 0 || complete;
    });
    announce(
      complete
        ? 'Você organizou todas as peças em ' + moves + ' movimentos. Parabéns!'
        : moves + ' movimentos · Organize os números de 1 a 15.',
      complete
    );
  }
  function reset() {
    tiles = createPuzzle();
    moves = 0;
    render();
  }
  resetButton.addEventListener('click', reset);
  reset();
}

if (board && status && resetButton) {
  ({ velha: startTicTacToe, forca: startHangman, memoria: startMemory, racha: startPuzzle })[
    game
  ]?.();
}
