/**
 * Recursos locais da Biblioteca QVC: navegação, cabeçalho e impressão A4.
 * Não envia dados, não depende de CDN e não executa HTML informado por usuários.
 */
const HUB_URL = new URL('../index.html', import.meta.url).href;
const STYLE_URL = new URL('./platform.css', import.meta.url).href;
const STORAGE_KEY = 'qvc:school-header:v1';
const FIELD_LIMIT = 120;
let statusNode;
let schoolDialog;
let printing = false;
let closeTimer;

const ICON_PATHS = {
  arrowLeft: ['M19 12H5', 'm12 19-7-7 7-7'],
  printer: [
    'M6 9V3h12v6',
    'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2',
    'M6 14h12v8H6z',
    'M18 12h.01',
  ],
  school: ['m3 9 9-6 9 6', 'M4 10v11h16V10', 'M9 21v-7h6v7', 'M8 10h.01', 'M16 10h.01'],
  close: ['m18 6-12 12', 'm6 6 12 12'],
  book: ['M12 7v14', 'M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v17h-5a4 4 0 0 0-4 1 4 4 0 0 0-4-1H3z'],
  check: ['m20 6-11 11-5-5'],
};

export function icon(name = 'book', size = 20) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const attributes = {
    viewBox: '0 0 24 24',
    width: String(size),
    height: String(size),
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.8',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };
  Object.entries(attributes).forEach(([key, value]) => svg.setAttribute(key, value));
  for (const d of ICON_PATHS[name] || ICON_PATHS.book) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function textElement(tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = String(value ?? '');
  if (className) element.className = className;
  return element;
}

export function announce(message, type = 'success') {
  if (!statusNode) {
    statusNode = document.createElement('div');
    statusNode.className = 'qvc-toast';
    statusNode.setAttribute('role', 'status');
    statusNode.setAttribute('aria-live', 'polite');
    statusNode.setAttribute('aria-atomic', 'true');
    document.body.append(statusNode);
  }
  statusNode.dataset.type = type;
  statusNode.textContent = String(message);
  statusNode.hidden = false;
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    statusNode.hidden = true;
  }, 5500);
}

function validMetadata(value) {
  const defaults = { school: '', student: '', className: '', date: '' };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  for (const key of Object.keys(defaults)) {
    if (typeof value[key] === 'string' && value[key].length <= FIELD_LIMIT)
      defaults[key] = value[key].trim();
  }
  if (defaults.date && !/^\d{4}-\d{2}-\d{2}$/.test(defaults.date)) defaults.date = '';
  return defaults;
}

export function getSchoolMetadata() {
  try {
    return validMetadata(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return validMetadata(null);
  }
}

export function setSchoolMetadata(value) {
  const metadata = validMetadata(value);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
    document.dispatchEvent(new CustomEvent('qvc:school-header', { detail: metadata }));
    return true;
  } catch {
    announce(
      'O navegador não permitiu guardar o cabeçalho. Você pode preenchê-lo novamente ao imprimir.',
      'error'
    );
    return false;
  }
}

export function createSchoolHeader(title = document.title.trim(), values = getSchoolMetadata()) {
  const data = validMetadata(values);
  const header = document.createElement('header');
  header.className = 'qvc-school-header';
  header.setAttribute('data-qvc-school-header', '');
  const brand = textElement('div', 'QVC · BIBLIOTECA EDUCACIONAL', 'qvc-document-brand');
  header.append(brand, textElement('h1', title.replace(/\s+/g, ' ').trim(), 'qvc-document-title'));
  const fields = document.createElement('div');
  fields.className = 'qvc-school-fields';
  const entries = [
    ['Escola', data.school || '________________________________________________'],
    ['Nome do Aluno', data.student || '________________________________________'],
    ['Turma', data.className || '________________'],
    ['Data', data.date ? data.date.split('-').reverse().join('/') : '____ / ____ / ______'],
  ];
  entries.forEach(([label, value]) => {
    const item = document.createElement('p');
    item.append(textElement('strong', `${label}: `), document.createTextNode(value));
    fields.append(item);
  });
  header.append(fields);
  return header;
}

export function openSchoolSettings() {
  if (schoolDialog?.open) return;
  const previousFocus = document.activeElement;
  if (schoolDialog) schoolDialog.remove();
  schoolDialog = document.createElement('dialog');
  schoolDialog.className = 'qvc-dialog';
  schoolDialog.setAttribute('aria-labelledby', 'qvc-school-dialog-title');
  schoolDialog.setAttribute('aria-describedby', 'qvc-school-dialog-description');
  schoolDialog.append(textElement('h2', 'Cabeçalho escolar', 'qvc-dialog-title'));
  schoolDialog.firstElementChild.id = 'qvc-school-dialog-title';
  const description = textElement(
    'p',
    'Preencha os dados para as ferramentas que usam o cabeçalho comum. Se a atividade tem campos próprios, eles prevalecem.',
    'qvc-muted'
  );
  description.id = 'qvc-school-dialog-description';
  schoolDialog.append(description);
  const form = document.createElement('form');
  form.method = 'dialog';
  form.className = 'qvc-form';
  const metadata = getSchoolMetadata();
  for (const [key, label, type] of [
    ['school', 'Escola', 'text'],
    ['student', 'Nome do Aluno', 'text'],
    ['className', 'Turma', 'text'],
    ['date', 'Data', 'date'],
  ]) {
    const field = document.createElement('label');
    field.append(document.createTextNode(label));
    const input = document.createElement('input');
    input.name = key;
    input.type = type;
    input.maxLength = FIELD_LIMIT;
    input.value = metadata[key];
    field.append(input);
    form.append(field);
  }
  const actions = document.createElement('div');
  actions.className = 'qvc-actions';
  const cancel = textElement('button', 'Cancelar', 'qvc-button qvc-button-secondary');
  cancel.type = 'button';
  cancel.addEventListener('click', () => schoolDialog.close());
  const save = textElement('button', 'Guardar cabeçalho', 'qvc-button');
  save.type = 'submit';
  actions.append(cancel, save);
  form.append(actions);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    if (setSchoolMetadata(values)) {
      schoolDialog.close();
      announce('Cabeçalho guardado neste navegador.');
    }
  });
  schoolDialog.append(form);
  schoolDialog.addEventListener('close', () => previousFocus?.focus());
  schoolDialog.addEventListener('click', (event) => {
    if (event.target === schoolDialog) schoolDialog.close();
  });
  document.body.append(schoolDialog);
  schoolDialog.showModal();
}

function printTargets() {
  const explicit = document.body.dataset.qvcPrintTarget;
  if (explicit) {
    try {
      const target = document.querySelector(explicit);
      if (target) return [target];
    } catch {
      /* An invalid author-supplied selector falls back to the known content areas. */
    }
  }
  const result = document.querySelector('#result-panel');
  if (result) return [result, document.querySelector('#chart-slot')].filter(Boolean);
  const calculator = document.querySelector('.calculator-shell');
  if (calculator) return [calculator];
  for (const selector of [
    '#tabelaB',
    '#conteudo',
    '#conto',
    '#main-content',
    '#content',
    '#biblioteca',
    'main',
  ]) {
    const target = document.querySelector(selector);
    if (target && target.textContent.trim()) return [target];
  }
  return [document.body];
}

function printableClone(source) {
  const clone = source.cloneNode(true);
  clone.querySelectorAll('button[data-qvc-printable-button]').forEach((button) => {
    const cell = document.createElement('span');
    cell.className = button.className;
    cell.textContent = button.dataset.qvcPrintText || button.textContent;
    cell.style.cssText = button.style.cssText;
    cell.style.display = 'grid';
    cell.style.placeItems = 'center';
    cell.style.minHeight = '48px';
    cell.style.border = '1px solid #b7ccdb';
    cell.style.borderRadius = '8px';
    cell.style.fontSize = '24px';
    button.replaceWith(cell);
  });
  const originalControls = [...source.querySelectorAll('input,textarea,select,canvas')];
  const clonedControls = [...clone.querySelectorAll('input,textarea,select,canvas')];
  originalControls.forEach((original, index) => {
    const copy = clonedControls[index];
    if (!copy) return;
    if (original instanceof HTMLCanvasElement) {
      try {
        const image = document.createElement('img');
        image.src = original.toDataURL('image/png');
        image.alt = original.getAttribute('aria-label') || 'Gráfico da atividade';
        image.style.maxWidth = '100%';
        copy.replaceWith(image);
      } catch {
        copy.replaceWith(textElement('p', 'Este gráfico não pôde ser incluído na impressão.'));
      }
      return;
    }
    if (
      original.type === 'hidden' ||
      original.type === 'file' ||
      original.type === 'button' ||
      original.type === 'submit' ||
      original.type === 'reset' ||
      original.closest('[data-qvc-no-print],.qvc-no-print')
    ) {
      copy.remove();
      return;
    }
    const value =
      original instanceof HTMLSelectElement
        ? [...original.selectedOptions].map((option) => option.textContent).join(', ')
        : original.type === 'checkbox' || original.type === 'radio'
          ? original.checked
            ? '☑'
            : '☐'
          : original.value;
    const span = textElement(
      original instanceof HTMLTextAreaElement ? 'div' : 'span',
      value,
      'qvc-print-value'
    );
    span.style.whiteSpace = 'pre-wrap';
    copy.replaceWith(span);
  });
  clone
    .querySelectorAll(
      'script,iframe,dialog,.qvc-platform-bar,.qvc-toast,.qvc-no-print,[data-qvc-no-print],.no-print,button,input[type="submit"],input[type="button"],nav,.sidebar,.topbar,.app-footer,#menu,#fundo,#rodape,#vb,#b,#c,#calculator-keypad,.calc-toolbar,.result-actions,.helper-note,.subtle-banner'
    )
    .forEach((node) => node.remove());
  clone.querySelectorAll('[id="cabecalho"]').forEach((node) => {
    if (!node.hasAttribute('data-qvc-school-header')) node.remove();
  });
  [clone, ...clone.querySelectorAll('*')].forEach((node) => {
    for (const attribute of [...node.attributes])
      if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
    if (node.hidden || node.getAttribute('aria-hidden') === 'true') node.remove();
  });
  return clone;
}

const PRINT_RULES = `
@page { size: A4 portrait; margin: 12mm; }
:root { --qvc-bg:#fff!important; --qvc-surface:#fff!important; --qvc-surface-inset:#fff!important; --qvc-text:#172b3a!important; --qvc-muted:#42576a!important; --qvc-primary:#346786!important; --qvc-primary-soft:#eef3f7!important; --qvc-border:#ced9e2!important; color-scheme: light !important; --text:#172b3a!important; --text-soft:#42576a!important; --muted:#526575!important; --bg:#fff!important; --panel:#fff!important; --panel-2:#fff!important; --form-bg:#fff!important; --primary:#346786!important; --border:#ced9e2!important; --border-subtle:#dce3e9!important; }
* { box-sizing:border-box; }
html,body { margin:0!important; padding:0!important; width:100%!important; min-width:0!important; background:#fff!important; color:#172b3a!important; font-family:Arial,Helvetica,sans-serif!important; overflow:visible!important; }
body { display:block!important; font-size:11pt; line-height:1.55; }
.qvc-print-root { width:100%; margin:0; padding:0; }
.qvc-print-root>* { max-width:100%!important; margin-left:0!important; margin-right:0!important; }
.qvc-school-header { display:block!important; color:#172b3a!important; background:white!important; margin:0 0 7mm!important; padding:0 0 5mm!important; border:0!important; border-bottom:1.5px solid #346786!important; break-inside:avoid; }
.qvc-document-brand { font-size:8pt; letter-spacing:1.2px; color:#346786; font-weight:bold; }
.qvc-document-title { font-size:20pt; margin:3mm 0 4mm; text-align:left; }
.qvc-school-fields { display:grid; grid-template-columns:1fr 1fr; gap:2mm 6mm; font-size:10pt; }
.qvc-school-fields p { margin:0; }
.qvc-school-fields p:nth-child(-n+2) { grid-column:1/-1; }
.qvc-print-content { background:white!important; width:100%!important; margin:0!important; padding:0!important; border:0!important; box-shadow:none!important; overflow:visible!important; }
.qvc-print-content .workspace-grid { display:block!important; }
.qvc-print-content .table-container,.qvc-print-content .chart-wrap { overflow:visible!important; max-height:none!important; height:auto; }
.qvc-print-content table { border-collapse:collapse; max-width:100%!important; margin-left:auto!important; margin-right:auto!important; }
.qvc-print-content table th,.qvc-print-content table td { overflow-wrap:anywhere; }
.qvc-print-content img,.qvc-print-content svg { max-width:100%!important; height:auto; }
.qvc-print-content a { color:inherit; text-decoration:none; }
.qvc-print-value { color:#172b3a!important; background:transparent!important; font-family:inherit!important; }
.qvc-print-root .panel,.qvc-print-root .result-panel { background:white!important; border-color:#dce3e9!important; box-shadow:none!important; }
.qvc-print-root #calc-display { color:#172b3a!important; }
.qvc-print-root #tabela { width:100%!important; table-layout:fixed; }
.qvc-print-root #tabela td { font-size:12pt!important; height:7mm!important; width:auto!important; }
nav,button,.qvc-platform-bar,.qvc-no-print,[data-qvc-no-print],.no-print,.toolbar,.editor-panel,.exam-editor,.schedule-editor,.controls-panel,.preview-toolbar { display:none!important; }
tr,.question,.exam-question,.qvc-school-header { break-inside:avoid; }
thead { display:table-header-group; }
.print-only { display:block!important; }
@media screen { body { max-width:210mm; padding:12mm!important; } }
`;

export async function print(options = {}) {
  if (printing) return;
  printing = true;
  document.querySelectorAll('button[data-qvc-print]').forEach((button) => {
    button.disabled = true;
  });
  let frame;
  try {
    const targets = options.target
      ? [
          typeof options.target === 'string'
            ? document.querySelector(options.target)
            : options.target,
        ].filter(Boolean)
      : printTargets();
    if (!targets.length) throw new Error('O conteúdo da atividade ainda não está disponível.');
    frame = document.createElement('iframe');
    frame.id = 'qvc-print-frame';
    frame.title = 'Documento preparado para impressão';
    frame.className = 'qvc-print-frame qvc-no-print';
    frame.setAttribute('aria-hidden', 'true');
    document.body.append(frame);
    const doc = frame.contentDocument;
    doc.documentElement.lang = 'pt-BR';
    doc.head.replaceChildren();
    doc.body.replaceChildren();
    const base = doc.createElement('base');
    base.href = document.baseURI;
    doc.head.append(base, textElement('title', String(options.title || document.title).trim()));
    const loadStyles = [];
    for (const source of document.querySelectorAll('link[rel="stylesheet"],style')) {
      if (source.tagName === 'LINK' && new URL(source.href).origin !== location.origin) continue;
      const copy = source.cloneNode(true);
      if (copy.tagName === 'LINK')
        loadStyles.push(
          new Promise((resolve) => {
            copy.addEventListener('load', resolve, { once: true });
            copy.addEventListener('error', resolve, { once: true });
          })
        );
      doc.head.append(copy);
    }
    const rules = doc.createElement('style');
    rules.textContent = PRINT_RULES;
    if (
      options.orientation === 'landscape' ||
      document.body.dataset.qvcPrintOrientation === 'landscape'
    )
      rules.textContent += '@page{size:A4 landscape}';
    doc.head.append(rules);
    const root = doc.createElement('main');
    root.className = 'qvc-print-root';
    for (const target of targets) {
      const clone = printableClone(target);
      clone.classList.add('qvc-print-content');
      root.append(doc.adoptNode(clone));
    }
    if (!root.querySelector('[data-qvc-school-header]'))
      root.prepend(
        doc.adoptNode(
          createSchoolHeader(
            options.title || document.querySelector('h1')?.textContent || document.title,
            options.metadata || getSchoolMetadata()
          )
        )
      );
    doc.body.append(root);
    await Promise.race([
      Promise.all(loadStyles),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
    await Promise.race([doc.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1000))]);
    await Promise.all(
      [...doc.images].map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
              setTimeout(resolve, 1000);
            })
      )
    );
    doc.dispatchEvent(new CustomEvent('qvc:print-ready'));
    document.dispatchEvent(
      new CustomEvent('qvc:print-ready', { detail: { frame, document: doc } })
    );
    frame.contentWindow.focus();
    frame.contentWindow.print();
    announce(
      'Documento preparado. Na janela de impressão, escolha sua impressora ou “Salvar como PDF”.'
    );
    // Keep the prepared document available for browser preview and smoke checks. Remove only our older frames.
    document.querySelectorAll('#qvc-print-frame').forEach((old) => {
      if (old !== frame) old.remove();
    });
    return frame;
  } catch (error) {
    frame?.remove();
    announce(
      error instanceof Error ? error.message : 'Não foi possível preparar a impressão.',
      'error'
    );
    return null;
  } finally {
    printing = false;
    document.querySelectorAll('button[data-qvc-print]').forEach((button) => {
      button.disabled = false;
    });
  }
}

function toolbarButton(label, iconName, listener, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `qvc-button ${className}`.trim();
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(icon(iconName, 18), textElement('span', label, 'qvc-toolbar-label'));
  button.addEventListener('click', listener);
  return button;
}

function mount() {
  if (!document.documentElement.lang) document.documentElement.lang = 'pt-BR';
  if (
    ![...document.querySelectorAll('link[rel="stylesheet"]')].some(
      (link) => link.href === STYLE_URL
    )
  ) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = STYLE_URL;
    document.head.append(stylesheet);
  }
  if (!document.body.hasAttribute('data-qvc-hub') && !document.querySelector('.qvc-platform-bar')) {
    const bar = document.createElement('div');
    bar.className = 'qvc-platform-bar qvc-no-print';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Navegação do Hub e impressão');
    const content = document.createElement('div');
    content.className = 'qvc-platform-bar-content';
    const back = document.createElement('a');
    back.href = HUB_URL;
    back.className = 'qvc-hub-link';
    back.append(icon('arrowLeft', 19), document.createTextNode('Voltar ao Hub'));
    const actions = document.createElement('div');
    actions.className = 'qvc-platform-actions';
    const metadata = toolbarButton(
      'Cabeçalho escolar',
      'school',
      openSchoolSettings,
      'qvc-button-quiet'
    );
    const printer = toolbarButton('Imprimir / Exportar PDF', 'printer', () => print());
    printer.dataset.qvcPrint = '';
    actions.append(metadata, printer);
    content.append(back, actions);
    bar.append(content);
    document.body.prepend(bar);
    const updateHeight = () =>
      document.documentElement.style.setProperty(
        '--qvc-toolbar-height',
        `${bar.getBoundingClientRect().height}px`
      );
    updateHeight();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateHeight).observe(bar);
    else window.addEventListener('resize', updateHeight);
  }
  // Replace the old direct-print actions with the same A4 document path.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target.closest('[onclick]') : null;
      if (target && /window\.print\s*\(/.test(target.getAttribute('onclick') || '')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        print();
      }
    },
    true
  );
  document.dispatchEvent(new CustomEvent('qvc:ready'));
  updateLegacyHeaders();
}

function updateLegacyHeaders() {
  const values = getSchoolMetadata();
  const names = { school: 'Escola', student: 'Nome do Aluno', className: 'Turma', date: 'Data' };
  for (const line of document.querySelectorAll('[data-qvc-school-field]')) {
    const key = line.dataset.qvcSchoolField;
    if (!Object.hasOwn(names, key)) continue;
    const value =
      key === 'date' && values.date
        ? values.date.split('-').reverse().join('/')
        : values[key] ||
          (key === 'date' ? '____ / ____ / ______' : '________________________________');
    line.textContent = names[key] + ': ' + value;
  }
}
document.addEventListener('qvc:school-header', updateLegacyHeaders);

window.QVC = Object.freeze({
  ...(window.QVC || {}),
  print,
  announce,
  getSchoolMetadata,
  setSchoolMetadata,
  createSchoolHeader,
  openSchoolSettings,
  icon,
  hubUrl: HUB_URL,
});
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
