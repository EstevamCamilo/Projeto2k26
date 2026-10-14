/* professor.js */

//******************************************************************************
// Class Professor
//******************************************************************************
var Professor = function () {
    return {
        id: -1,
        nome: "",
        nascimento: new Date("0001-01-01T03:00:00.000Z"),
        email: "",
        celular: "",
        afastado: false,

        setId: function (id) {
            this.id = Number(id);
        },
        setNome: function (nome) {
            this.nome = nome.toUpperCase();
        },
        setNascimento: function (nascimento) {
            this.nascimento = new Date(nascimento); //yyyy-MM-ddThh:mm:ss.iiiZ
        },
        setNascimentoF: function (nascimento) {
            this.nascimento = new Date(nascimento + "T03:00:00.000Z"); // yyyy-MM-dd
        },
        getNascimento: function () { //    yyyy-MM-dd
            return this.nascimento.toISOString().split('T')[0];
        },
        getNascimentoF: function () { //   dd/MM/yyyy
            return this.nascimento.toLocaleDateString("pt-br", {timeZone: "UTC"});
        },
        setAfastado: function (afastado) {
            this.afastado = Boolean(afastado);
        },

        fromJSON: function (json) {
            this.setId(json.id);
            this.setNome(json.nome);
            this.setNascimento(json.nascimento);
            this.email = json.email;
            this.celular = json.celular;
            this.setAfastado(json.afastado);
        }
    };
};

//******************************************************************************
// Data Professor
//******************************************************************************
var professorData = {
    //Lista vazia que vai guardar os objetos Professor
    list: [],

    //Import JSON list
    fromJSON: function (jsonList) {
        for (let json of jsonList) {
            //cria outro objeto professor
            let obj = new Professor();
            //Pega os dados do JSON e coloca no objeto professor
            obj.fromJSON(json);
            //Acrescenta o objeto na lista professor
            this.list.push(obj);
        }
    },

    //Encontra um objeto com base no id
    get: function (id) {
        id = Number(id);
        let obj = null;
        for (let i = 0; i < this.list.length; i++) {
            if (this.list[i].id === id) {
                obj = this.list[i];
                i = this.list.length;
            }
        }
        return obj;
    },

    //Ordena lista por nome
    sortByNome: function () {
        this.list.sort((a, b) => (a.nome > b.nome ? 1 : -1));
    },

    //Obtem lista de professores afastados (true) e em exercício (false)
    listAfastado: function (situacao) {
        let list = [];
        for (let prof of this.list) {
            if (prof.afastado === situacao) {
                list.push(prof);
            }
        }
        return list;
    },

};

//******************************************************************************
// UI Professor
//******************************************************************************
var professorUI = {
    ui: "",
    obj: null,

    //Carrega o arquivo HTML para a variável ui
    init: function () {
        fetch("professor.html").then(function (data) {
            data.text().then(function (html) {
                professorUI.ui = html;
            }).catch(function () {
                alert("Falha ao converter os dados em texto");
            });
        }).catch(function () {
            alert("Falha ao carregar professor.html");
        });
    },

    //Exibe o HTML ui na divId do parâmetro
    start: function (divId) {
        document.querySelector(divId).innerHTML = this.ui;
        this.list();
    },

    //Passa os dados do objeto para o formulário
    obj2form: function () {
        document.querySelector("input[name=id]").value = this.obj.id;
        document.querySelector("input[name=nome]").value = this.obj.nome;
        document.querySelector("input[name=nascimento]").value = this.obj.getNascimento();
        document.querySelector("input[name=email]").value = this.obj.email;
        document.querySelector("input[name=celular]").value = this.obj.celular;
        document.querySelector("input[name=afastado]").checked = this.obj.afastado;
    },

    //Passa os dados do formulário para o objeto
    form2obj: function () {
        this.obj.setId(document.querySelector("input[name=id]").value);
        this.obj.setNome(document.querySelector("input[name=nome]").value);
        this.obj.setNascimento(document.querySelector("input[name=nascimento]").value);
        this.obj.email = document.querySelector("input[name=email]").value;
        this.obj.celular = document.querySelector("input[name=celular]").value;
        this.obj.setAfastado(document.querySelector("input[name=afastado]").checked);
    },

    //Exibe o formulário para editar dados do objeto
    edit: function (id) {
        document.querySelector("#form").style.display = "block";
        document.querySelector("#table").style.display = "none";
        if (id === undefined || id === null || id < 0) {
            this.obj = new Professor();
        } else {
            this.obj = professorData.get(id);
        }
        this.obj2form();
    },

    //Salva os dados editados no formulário 
    save: function (event) {
        event.preventDefault();
        this.form2obj();
        if (this.obj.id < 0) { //Se for um novo objeto
            this.obj.setId(new Date().getTime()); //Obtém o id do objeto
            professorData.list.push(this.obj); //Adiciona o objeto na lista
        }
        //Ordena em ordem alfabética
        professorData.sortByNome();
        //Lista os professores
        this.list();
    },

    //Remove um objeto com base no id
    remove: function (id) {
        let obj = professorData.get(id);
        if (confirm("Deseja remover o professor "+obj.nome+" ?")) {
            professorData.list.splice(professorData.list.indexOf(obj), 1);
            //Lista os professores
            this.list();
        }
    },

    //Exibe os registros dos objetos conforme a visualização selecionada
    list: function () {
        document.querySelector("#form").style.display = "none";
        document.querySelector("#table").style.display = "block";

        let opt = (document.querySelector("#view") !== null) ? document.querySelector("#view").value : "0";
        let list;
        switch (opt) {
            case("1"):
                list = professorData.listAfastado(false);
                break;
            case("2"):
                list = professorData.listAfastado(true);
                break;
            default:
                list = professorData.list;
                break;
        }

        let html = "";
        html += "<h2><u>Professores</u></h2>";

        html += "<select id='view' onchange='professorUI.list()'>";
        html += "<option value='1' " + (opt === "1" ? "selected " : "") + ">Ver professores em exercício</option>";
        html += "<option value='2' " + (opt === "2" ? "selected " : "") + ">Ver professores afastados</option>";
        html += "<option value='0' " + (opt === "0" ? "selected " : "") + ">Ver todos os professores</option>";
        html += "</select>";

        html += "<table>";
        html += "<tr><th>Nome<th>Nascimento<th>Email";
        html += "<th><button onclick='professorUI.edit()'>📄</button>";
        for (let prof of list) {
            html += "<tr>";
            html += "<td><button style='width:100%;' onclick='professorUI.edit(" + prof.id + ")'>" + prof.nome + "</button>";
            html += "<td>" + prof.getNascimentoF();
            html += "<td>" + prof.email;
            html += "<td><button onclick='professorUI.remove(" + prof.id + ")'>❌</button>";
        }
        html += "</table>";
        document.querySelector("#table").innerHTML = html;
    }
};