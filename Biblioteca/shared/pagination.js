/** Measured DOM pagination; the editor is never mutated. All lengths below are physical A4. */
export const A4_STYLES = `
@page { size:A4 portrait; margin:0; }
html,body { margin:0!important; padding:0!important; max-width:none!important; width:100%!important; }
.qvc-print-root { width:max-content!important; max-width:none!important; margin:0 auto!important; }
.qvc-a4-page { box-sizing:border-box!important; width:210mm!important; height:297mm!important; min-height:297mm!important; padding:12mm!important; margin:0!important; background:white!important; color:#172b3a!important; display:block!important; position:relative; overflow:clip; }
.qvc-a4-page[data-orientation="landscape"] { width:297mm!important; height:210mm!important; min-height:210mm!important; }
.qvc-a4-inner { height:100%; display:flex; flex-direction:column; }
.qvc-a4-header { flex:0 0 auto; margin-bottom:5mm; }
.qvc-a4-header>[data-qvc-school-header] { margin:0!important; padding-top:0!important; }
.qvc-a4-body { flex:1 1 0; min-height:0; width:100%; position:relative; overflow-wrap:anywhere; }
.qvc-a4-flow { display:flow-root; width:100%; }
.qvc-a4-number { flex:0 0 auto; font:8pt Arial,sans-serif; color:#526575; border-top:1px solid #dce3e9; padding-top:2mm; margin-top:3mm; text-align:right; }
.qvc-a4-page [data-qvc-fragment] { min-height:0!important; max-height:none!important; height:auto!important; }
.qvc-a4-page .qvc-print-content { display:block!important; min-height:0!important; max-height:none!important; padding:0!important; margin:0!important; border:0!important; border-radius:0!important; box-shadow:none!important; }
.qvc-a4-page .exam-answer-key { margin:0!important; padding:0!important; border:0!important; }
.qvc-a4-page .table-container,.qvc-a4-page .agenda-table-wrap { overflow:visible!important; min-width:0!important; padding:0!important; }
.qvc-a4-page table { width:100%!important; min-width:0!important; max-width:100%!important; table-layout:fixed!important; }
.qvc-a4-page table th,.qvc-a4-page table td { min-width:0!important; width:auto!important; overflow-wrap:anywhere; }
.qvc-a4-page img,.qvc-a4-page svg { max-width:100%!important; height:auto; }
.qvc-a4-page pre,.qvc-a4-page code { white-space:pre-wrap!important; overflow-wrap:anywhere; }
.qvc-scaled-block { position:relative; width:100%; overflow:clip; }
.qvc-scaled-inner { display:flow-root; transform-origin:top left; }
@media screen {
 .qvc-a4-page { margin:0 auto 18px!important; box-shadow:0 5px 25px #0004; }
 body[data-qvc-preview] { background:#111c27!important; padding:18px!important; }
 body[data-qvc-preview] .qvc-print-root { zoom:var(--qvc-preview-scale,1); }
}
@media print {
 html,body { background:white!important; }
 .qvc-print-root { zoom:1!important; }
 .qvc-a4-page,.qvc-a4-page * { break-before:auto!important; break-after:auto!important; }
 .qvc-a4-page { break-inside:avoid!important; break-after:page!important; page-break-after:always!important; margin:0!important; box-shadow:none!important; }
 .qvc-a4-page:last-child { break-after:auto!important; page-break-after:auto!important; }
}
`;

const MAX_PAGES = 250;
const SAFETY_PX = 3;
const GRAPHICS = 'img,svg,canvas,.game-board,.memory-board,.hangman-drawing';

/** Insert and measure with the final CSS; move whole blocks and split only oversized ones. */
export function paginateA4({ document: doc, source, header, orientation = 'portrait' }) {
  const output = doc.createElement('main');
  output.className = 'qvc-print-root';
  const pages = [];
  let activeHeader = header;
  let page;
  let count = 0;
  let scaledBlocks = 0;
  let failedHeight = 0;
  source.replaceWith(output);

  const cloneShell = (original) => {
    const shell = original.cloneNode(false);
    if (shell.nodeType !== 1) return shell;
    shell.dataset.qvcFragment = '';
    if (shell.tagName === 'TABLE')
      for (const child of original.children)
        if (['CAPTION', 'COLGROUP', 'THEAD'].includes(child.tagName))
          shell.append(child.cloneNode(true));
    return shell;
  };
  const setHeader = (next) => {
    activeHeader = next;
    page.header.replaceChildren(next.cloneNode(true));
    if (page.body.getBoundingClientRect().height < 80)
      throw new Error(
        'O cabeçalho ocupa quase toda a folha. Reduza seus textos antes de imprimir.'
      );
  };
  const newPage = () => {
    if (pages.length >= MAX_PAGES)
      throw new Error('Este documento excede 250 páginas. Divida o material em lotes menores.');
    const node = doc.createElement('section');
    node.className = 'qvc-a4-page';
    node.dataset.orientation = orientation;
    const inner = doc.createElement('div');
    inner.className = 'qvc-a4-inner';
    const heading = doc.createElement('div');
    heading.className = 'qvc-a4-header';
    const body = doc.createElement('div');
    body.className = 'qvc-a4-body';
    const flow = doc.createElement('div');
    flow.className = 'qvc-a4-flow';
    const footer = doc.createElement('footer');
    footer.className = 'qvc-a4-number';
    footer.textContent = `Página ${pages.length + 1}`;
    body.append(flow);
    inner.append(heading, body, footer);
    node.append(inner);
    output.append(node);
    page = { node, header: heading, body, flow, footer, contexts: new Map(), placed: 0 };
    pages.push(page);
    setHeader(activeHeader);
    return page;
  };
  const overflows = () =>
    page.flow.getBoundingClientRect().bottom > page.body.getBoundingClientRect().bottom - SAFETY_PX;
  const insert = (node, ancestors) => {
    let parent = page.flow;
    const created = [];
    for (const ancestor of ancestors) {
      let shell = page.contexts.get(ancestor);
      if (!shell) {
        shell = cloneShell(ancestor);
        parent.append(shell);
        page.contexts.set(ancestor, shell);
        created.push([ancestor, shell]);
      }
      parent = shell;
    }
    parent.append(node);
    return {
      fits: !overflows(),
      rollback() {
        node.remove();
        for (const [original, shell] of created.reverse()) {
          shell.remove();
          page.contexts.delete(original);
        }
      },
    };
  };
  const fits = (node, ancestors) => {
    const attempt = insert(node, ancestors);
    if (!attempt.fits) failedHeight = node.getBoundingClientRect?.().height || 0;
    if (!attempt.fits) attempt.rollback();
    return attempt.fits;
  };
  const place = (node, ancestors) => {
    if (!fits(node.cloneNode(true), ancestors)) return false;
    page.placed++;
    count++;
    return true;
  };

  function fitGraphic(node, ancestors) {
    const wrapper = doc.createElement('div');
    wrapper.className = 'qvc-scaled-block';
    const inner = doc.createElement('div');
    inner.className = 'qvc-scaled-inner';
    inner.append(node.cloneNode(true));
    wrapper.append(inner);
    const attempt = insert(wrapper, ancestors);
    const bounds = inner.getBoundingClientRect();
    const available =
      page.body.getBoundingClientRect().bottom - wrapper.getBoundingClientRect().top - SAFETY_PX;
    if (available < 30 || !bounds.height) {
      attempt.rollback();
      throw new Error(
        'Um bloco não cabe na folha A4. Reduza seu tamanho ou use orientação paisagem.'
      );
    }
    const ratio = Math.min(1, available / bounds.height);
    wrapper.style.height = `${bounds.height * ratio}px`;
    wrapper.dataset.qvcScaled = String(ratio);
    inner.style.width = `${bounds.width}px`;
    inner.style.position = 'absolute';
    inner.style.inset = '0 auto auto 0';
    inner.style.transform = `scale(${ratio})`;
    page.placed++;
    count++;
    scaledBlocks++;
  }

  function splitText(node, ancestors) {
    let tokens = node.textContent.match(/\S+\s*|\s+/gu) || [];
    if (!tokens.length) return;
    while (tokens.length) {
      let low = 0;
      let high = tokens.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        const test = doc.createTextNode(tokens.slice(0, middle).join(''));
        const attempt = insert(test, ancestors);
        const enough = attempt.fits;
        attempt.rollback();
        if (enough) low = middle;
        else high = middle - 1;
      }
      if (!low) {
        if (page.placed) {
          newPage();
          continue;
        }
        if (tokens[0].length > 1) {
          tokens = [...tokens[0], ...tokens.slice(1)];
          continue;
        }
        throw new Error('O texto não cabe no espaço da folha. Reduza os estilos ou o cabeçalho.');
      }
      insert(doc.createTextNode(tokens.splice(0, low).join('')), ancestors);
      page.placed++;
      count++;
      if (tokens.length) newPage();
    }
  }

  function splitTable(table, ancestors) {
    const bodies = [...table.tBodies];
    if (!bodies.length) {
      fitGraphic(table, ancestors);
      return;
    }
    for (const body of bodies) {
      for (const row of body.rows) {
        const path = [...ancestors, table, body];
        if (place(row, path)) continue;
        if (page.placed) newPage();
        if (place(row, path)) continue;
        const oneRowTable = cloneShell(table);
        const oneBody = body.cloneNode(false);
        oneBody.append(row.cloneNode(true));
        oneRowTable.append(oneBody);
        fitGraphic(oneRowTable, ancestors);
      }
    }
    if (table.tFoot) process(table.tFoot, [...ancestors, table]);
  }

  function process(node, ancestors = []) {
    if (node.nodeType === 3) {
      if (!node.textContent.trim()) {
        // Inline word separators matter; indentation alone must never create an empty page.
        const whitespace = insert(node.cloneNode(), ancestors);
        if (!whitespace.fits) whitespace.rollback();
        return;
      }
      if (place(node, ancestors)) return;
      splitText(node, ancestors);
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.matches('[data-qvc-school-header]')) {
      if (page.placed) newPage();
      setHeader(node);
      return;
    }
    const forceBreak = node.matches('.exam-answer-key,[data-qvc-page-break]');
    if (forceBreak && page.placed) newPage();
    const expand = forceBreak || node.querySelector('[data-qvc-school-header]');
    if (!expand && place(node, ancestors)) return;
    if (
      !expand &&
      page.placed &&
      failedHeight <= page.body.getBoundingClientRect().height - SAFETY_PX
    ) {
      newPage();
      if (place(node, ancestors)) return;
    }
    if (node.tagName === 'TABLE') {
      splitTable(node, ancestors);
      return;
    }
    if (node.matches(GRAPHICS)) {
      fitGraphic(node, ancestors);
      return;
    }
    if (node.childNodes.length) {
      for (const child of node.childNodes) process(child, [...ancestors, node]);
      return;
    }
    fitGraphic(node, ancestors);
  }

  newPage();
  for (const child of source.childNodes) process(child);
  pages.forEach((item, index) => {
    item.footer.textContent = `Página ${index + 1} de ${pages.length}`;
    item.node.setAttribute('aria-label', `Página ${index + 1} de ${pages.length}`);
  });
  return { root: output, pageCount: pages.length, blockCount: count, scaledBlocks };
}
