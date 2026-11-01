/* Diálogos acessíveis e utilitários compartilhados dos geradores clássicos. */
var modal = {
    showDialog: function (content, id) {
        const dialogId = id || 'qvc-dialog-' + Date.now();
        document.getElementById(dialogId)?.remove();
        const previousFocus = document.activeElement;
        const dialog = document.createElement('dialog');
        dialog.id = dialogId;
        dialog.setAttribute('aria-label', 'Informações da Biblioteca QVC');
        dialog.className = 'qvc-legacy-dialog';
        dialog.style.cssText = 'max-width:min(92vw,560px);border:1px solid #d9e4ed;border-radius:20px;padding:28px;color:#24364b;background:white;box-shadow:0 24px 70px #17384930;';
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Fechar ×';
        close.setAttribute('aria-label', 'Fechar informações');
        close.style.cssText = 'display:block;margin:0 0 16px auto;padding:8px 12px;border:1px solid #d9e4ed;border-radius:8px;background:white;color:#346786;cursor:pointer;';
        close.addEventListener('click', () => dialog.close());
        dialog.append(close);
        if (content instanceof Node) dialog.append(content);
        else {
            const text = document.createElement('p');
            text.textContent = String(content ?? '');
            dialog.append(text);
        }
        dialog.addEventListener('close', () => {
            dialog.remove();
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        }, { once: true });
        dialog.addEventListener('click', event => {
            if (event.target !== dialog) return;
            const rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        });
        document.body.append(dialog);
        dialog.showModal();
        close.focus();
    },
    closeDialog: function (id) {
        const dialog = document.getElementById(id);
        if (dialog instanceof HTMLDialogElement) dialog.close();
    },
};

const sobre = function () {
    const content = document.createElement('section');
    const title = document.createElement('h2');
    title.textContent = 'Biblioteca QVC';
    const introduction = document.createElement('p');
    introduction.textContent = 'Ferramentas pedagógicas para aprender, criar e ensinar.';
    const creators = document.createElement('p');
    creators.textContent = 'Criadores: Estevam Fernandes Camilo, Juan Henrique Conceição Veronez e Matheus Henrique Queiroz da Silva.';
    const contact = document.createElement('p');
    contact.textContent = 'Contato: siteqvc@gmail.com · Suporte: suporteQVC.org@gmail.com';
    content.append(title, introduction, creators, contact);
    modal.showDialog(content, 'Sobre');
};

window.QVCLegacy = {
    shuffle: function (values) {
        const result = values.slice();
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },
    status: function (message, error) {
        let status = document.getElementById('qvc-generator-status');
        if (!status) {
            status = document.createElement('p');
            status.id = 'qvc-generator-status';
            status.className = 'qvc-generator-status';
            const target = document.getElementById('tabelaB') || document.getElementById('conteudo');
            if (target) target.before(status);
            else document.body.append(status);
        }
        status.setAttribute('role', error ? 'alert' : 'status');
        status.textContent = message;
        status.style.cssText = 'margin:16px auto;max-width:900px;padding:10px 16px;color:' + (error ? '#9f2d3c' : '#346786') + ';font:14px/1.6 system-ui,sans-serif;';
    },
    count: function (id, available, maximum) {
        const input = document.getElementById(id);
        const requested = Number(input.value);
        if (!Number.isInteger(requested) || requested < 1) {
            input.setAttribute('aria-invalid', 'true');
            this.status('Informe uma quantidade inteira maior que zero.', true);
            return null;
        }
        input.removeAttribute('aria-invalid');
        const limit = Math.min(available, maximum);
        if (limit < 1) {
            this.status('Não há palavras disponíveis para esta seleção. Escolha outra categoria ou amplie o limite de sílabas.', true);
            return null;
        }
        const result = Math.min(requested, limit);
        if (result !== requested) {
            input.value = String(result);
            this.status('A seleção foi ajustada para ' + result + ' palavra(s) disponíveis nesta atividade.');
        } else this.status('Atividade pronta com ' + result + ' palavra(s). Você pode criar outra versão ou imprimir.');
        return result;
    },
    prepare: function (target, title) {
        const header = document.createElement('header');
        const metadata = window.QVC?.getSchoolMetadata() || {};
        header.className = 'qvc-activity-header';
        header.setAttribute('data-qvc-school-header', '');
        for (const label of ['Escola', 'Nome do Aluno', 'Turma', 'Data']) {
            const line = document.createElement('p');
            line.textContent = label + ': ' + (label === 'Data' ? '____ / ____ / ______' : '________________________________');
            line.setAttribute('data-qvc-school-field', label === 'Nome do Aluno' ? 'student' : ({ Escola: 'school', Turma: 'className', Data: 'date' })[label]);
            const key = line.getAttribute('data-qvc-school-field');
            if(metadata[key])line.textContent=label+': '+(key==='date'?metadata[key].split('-').reverse().join('/'):metadata[key]);
            header.append(line);
        }
        const heading = document.createElement('h2');
        heading.id = 'ca';
        heading.textContent = title;
        target.replaceChildren(header, heading);
        target.classList.add('qvc-generator-sheet');
        if (!document.getElementById('qvc-generator-styles')) {
            const style = document.createElement('style');
            style.id = 'qvc-generator-styles';
            style.textContent = '.qvc-generator-sheet{padding:28px!important;max-width:900px;margin:22px auto!important;background:white;border:1px solid #e0e7ef;font:18px/1.7 system-ui,sans-serif!important;color:#24364b;font-style:normal!important;border-radius:16px;box-sizing:border-box}.qvc-activity-header{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;text-align:left;border-bottom:1px solid #d9e4ed;padding-bottom:18px;margin-bottom:22px;font:13px/1.6 system-ui,sans-serif}.qvc-activity-header p{margin:0}.qvc-exercise-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 26px;text-align:left;padding:22px 0}.qvc-exercise-row{break-inside:avoid;display:flex;flex-wrap:wrap;align-items:center;gap:12px;border-bottom:1px dashed #cbd6df;padding:12px 0;min-width:0}.qvc-exercise-image{font-size:36px}.qvc-answer-space{letter-spacing:2px;overflow-wrap:anywhere}.qvc-matching-list{display:grid;gap:12px;margin-top:24px}.qvc-matching-row{display:flex;align-items:center;gap:16px;break-inside:avoid;text-align:left;min-height:56px}.qvc-matching-row strong{width:40%;font-size:18px}.qvc-matching-gap{flex:1}.qvc-matching-row .qvc-exercise-image{width:50px;text-align:center}.qvc-wordsearch-list{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 18px;padding:16px 0;list-style:none;font:15px/1.6 system-ui,sans-serif;color:#24364b}.qvc-wordsearch-grid{width:100%!important;border-collapse:collapse;table-layout:fixed;margin:20px auto;max-width:700px;text-align:center;font:16px/1.2 system-ui,sans-serif}.qvc-wordsearch-grid td{height:25px;border:1px solid #c6d3df;padding:0!important}.qvc-wordsearch-instruction{font-size:14px;color:#53687b}@media(max-width:640px){.qvc-generator-sheet{padding:20px!important}.qvc-exercise-list{grid-template-columns:1fr}.qvc-activity-header{grid-template-columns:1fr}.qvc-wordsearch-grid{font-size:11px}.qvc-wordsearch-grid td{height:20px}.qvc-matching-row strong{font-size:14px}}@media print{.qvc-generator-status{display:none!important}.qvc-generator-sheet{margin:0!important;padding:0!important;border:0!important;border-radius:0;max-width:none;box-shadow:none}.qvc-activity-header{grid-template-columns:1fr 1fr}.qvc-exercise-list{grid-template-columns:1fr 1fr}.qvc-wordsearch-grid{font-size:13px;max-width:100%}.qvc-wordsearch-grid td{height:22px}.qvc-wordsearch-list{font-size:12px}}';
            document.head.append(style);
        }
        return target;
    },
};
