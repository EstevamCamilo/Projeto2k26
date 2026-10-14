//MODAL
var modal = {
    //Gerencia modal
    showDialog: function (content, id) {
        console.log(content);
        console.log(id);
        console.log(typeof content);
        let overlay = document.createElement('div');
        overlay.id = id === undefined ? 'o' + new Date().getTime() : id;
        overlay.style.position = 'absolute';
        overlay.style.top =
            overlay.style.bottom =
            overlay.style.left =
            overlay.style.right =
                '0';
        overlay.style.backgroundColor = 'rgba(255,255,255,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = overlay.style.justifyContent = 'center';
        let dialog = document.createElement('div');
        dialog.style.display = 'inline-block';
        dialog.style.padding = '1rem';
        dialog.style.border = '5px solid rgb(52, 103, 134)';
        dialog.style.borderRadius = '1rem';
        dialog.style.boxShadow = '0 0 1em black';
        dialog.style.backgroundColor = 'white';
        let bClose = document.createElement('button');
        bClose.innerHTML = "<img src='../../cross.png'/>";
        bClose.style.position = 'relative';
        bClose.style.float = 'right';
        bClose.style.border = 'none';
        bClose.style.background = 'none';
        bClose.style.fontSize = '30px';
        bClose.onclick = () => this.closeDialog(id);
        dialog.appendChild(bClose);
        if (typeof content === 'string' || content instanceof String) {
            let element = document.createElement('div');
            element.innerHTML = content;
            dialog.appendChild(element);
        } else {
            dialog.appendChild(content);
        }

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    },
    closeDialog: function (id) {
        document.body.removeChild(document.querySelector('#' + id));
    },
};
const sobre = function () {
    let html = '';
    html += "<br/><img src='../../logo2.png' id='lg'/>";
    html += "<h2 id=''>Criadores:</h2>";
    html += "<p id='n'>Estevam Fernandes Camilo</p>";
    html += "<p id='n'>Juan Henrique Conceição Veronez</p>";
    html += "<p id='n'>Matheus Henrique Queiroz da Silva</p>";
    html += "<h1 id=''>QVC.org - Up Software para o futuro!</h1>";
    html += "<ul class='s'>";
    html += '<li>Site: qvc-educador-on.web.app</li>';
    html += '<li>Contato: siteqvc@gmail.com</li>';
    html += '<li>Suporte: suporteQVC@gmail.com</li>';
    html += '</ul>';
    modal.showDialog(html, 'Sobre');
};

window.onload = function () {
    document.getElementById('educacao Geral').click();
};