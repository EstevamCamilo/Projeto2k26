/* app.js */
var app = {
    home: "",

    init: function () {
        //Guarda na variável o conteúdo da página de início
        this.home = document.querySelector("#content").innerHTML;
        //Exibe a página de início
        this.goHome();
        professorUI.init();
        disciplinaUI.init();
        horarioUI.init();
    },

    loadFile: function () {
        //Obtém o elemento input com id "arquivo" do HTML
        let arquivo = document.querySelector("#arquivo");
        //Cria um novo objeto leitor de arquivo
        let fileReader = new FileReader();

        //Cria o evento ao carregar o arquivo
        fileReader.onload = function () {
            try {
                let data = JSON.parse(fileReader.result);
                //Pega os dados do arquivo e passa para a lista de objetos
                professorData.fromJSON(data.professores);
                disciplinaData.fromJSON(data.disciplinas);
                horarioData.fromJSON(data.horarios);

                app.goHome();
            } catch (e) {
                alert("Falha no carregamento do arquivo.\n" + e);
            }
        };

        //Faz a leitura do arquivo selecionado 
        fileReader.readAsText(arquivo.files[0]);
    },

    saveFile: function () {
        //Conteúdo que será salvo no arquivo
        let data = {
            professores: professorData.list,
            disciplinas: disciplinaData.list,
            horarios: horarioData.list
        }
        let text = JSON.stringify(data);

        //Nome do arquivo
        let fileName = "gradehorario.txt";
        //Cria um hiperlink
        let a = document.createElement("a");
        //Define o nome arquivo
        a.download = fileName;
        //Define o conteúdo do hiperlink
        a.href = "data:text/plain," + encodeURIComponent(text);
        //Faz o download
        a.click();
    },

    goHome: function () {
        document.querySelector('#content').innerHTML = app.home;
        let stats = "";
        stats += "<br/><b>Professores: </b>" + professorData.list.length;
        stats += "<br/><b>Disciplinas: </b>" + disciplinaData.list.length;
        stats += "<br/><b>Horários: </b>" + horarioData.list.length;
        document.querySelector('#stats').innerHTML = stats;
    }

};

window.addEventListener("beforeunload", (event) => {
    event.preventDefault();
    event.returnValue = "";
});

window.addEventListener("load", (event) => {
    app.init();
});


