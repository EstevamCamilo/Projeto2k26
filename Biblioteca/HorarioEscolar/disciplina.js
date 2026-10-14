/* disciplina.js */

//******************************************************************************
// Class Disciplina
//******************************************************************************
var Disciplina = function () {
    return {
        id: -1,
        ano: new Date().getFullYear(),
        serie: "",
        nome: "",
        abreviacao: "",
        professor: -1,
        nAulasSemanais: 1,

        setId: function (id) {
            this.id = Number(id);
        },
        setAno: function (ano) {
            this.ano = Number(ano);
        },
        setNome: function (nome) {
            this.nome = nome.toUpperCase();//Atribui o nome com maiúsculo
        },
        setAbreviacao: function (abreviacao) {
            this.abreviacao = abreviacao.toUpperCase();//Atribui a abreviação com maiúsculo
        },
        setProfessor: function (professor) {
            this.professor = Number(professor);
        },
        setNAulasSemanais: function (nAulasSemanais) {
            this.nAulasSemanais = Number(nAulasSemanais);
        },

        fromJSON: function (json) {
            this.setId(json.id);
            this.setAno(json.ano);
            this.serie = json.serie;
            this.setNome(json.nome);
            this.setAbreviacao(json.abreviacao);
            this.setProfessor(json.professor);
            this.setNAulasSemanais(json.nAulasSemanais);
        }
    };
};

//******************************************************************************
// Data Disciplina
//******************************************************************************
var disciplinaData = {
    //Lista vazia que vai guardar os objetos Disciplina
    list: [],

    //Import JSON list
    fromJSON: function (jsonList) {
        for (let json of jsonList) {
            //cria outro objeto disciplina
            let obj = new Disciplina();
            //Pega os dados do JSON e coloca no objeto disciplina
            obj.fromJSON(json);
            //Acrescenta o objeto na lista disciplina
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

    //Ordena lista por serie
    sortBySerie: function () {
        this.list.sort((a, b) => (a.nome > b.nome ? 1 : -1));
        this.list.sort((a, b) => (a.serie > b.serie ? 1 : (a.serie < b.serie ? -1 : 0)));
        this.list.sort((a, b) => (a.ano > b.ano ? 1 : (a.ano < b.ano ? -1 : 0)));
        /*this.list.sort((a, b) => {
            let val = 0;
            if (a.ano > b.ano) {
                if (a.serie > b.serie) {
                    val = 1;
                } else if (a.serie < b.serie) {
                    val = -1;
                }
            } else if (a.ano < b.ano) {
                val = -1;
            }
            return val;
        });*/
    },

    //Obtem lista de disciplinas por ano
    listAno: function (ano) {
        let list = [];
        for (let disc of this.list) {
            if (disc.ano === ano) {
                list.push(disc);
            }
        }
        return list;
    },

    //Obtem lista de disciplinas por serie
    listSerie: function (ano, serie) {
        let list = [];
        for (let disc of this.list) {
            if (disc.ano === ano && disc.serie === serie) {
                list.push(disc);
            }
        }
        return list;
    },

    //Obtem lista de ano de disciplinas
    anoList: function () {
        let list = [];
        for (let disc of this.list) {
            let ano = disc.ano;
            if (list.indexOf(ano) < 0) {
                list.push(ano);
            }
        }
        return list;
    },
    
    //Obtem lista de séries por ano de disciplinas
    serieList: function (ano) {
        let list = [];
        for (let disc of this.list) {
            let serie = disc.serie;
            if (disc.ano === ano && list.indexOf(serie) < 0) {
                list.push(serie);
            }
        }
        return list;
    }

};

//******************************************************************************
// UI Disciplina
//******************************************************************************
var disciplinaUI = {
    ui: "",
    obj: null,

    init: function () {
        fetch("disciplina.html").then(function (data) {
            data.text().then(function (html) {
                disciplinaUI.ui = html;
            }).catch(function () {
                alert("Falha ao converter os dados em texto");
            });
        }).catch(function () {
            alert("Falha ao carregar disciplina.html");
        });
    },

    start: function (divId) {
        document.querySelector(divId).innerHTML = this.ui;
        this.list();
    },

    obj2form: function () {
        document.querySelector("input[name=id]").value = this.obj.id;
        document.querySelector("input[name=ano]").value = this.obj.ano;
        document.querySelector("input[name=serie]").value = this.obj.serie;
        document.querySelector("input[name=nome]").value = this.obj.nome;
        document.querySelector("input[name=abreviacao]").value = this.obj.abreviacao;
        document.querySelector("select[name=professor]").value = this.obj.professor;
        document.querySelector("input[name=nAulasSemanais]").value = this.obj.nAulasSemanais;
    },

    form2obj: function () {
        this.obj.setId(document.querySelector("input[name=id]").value);
        this.obj.setAno(document.querySelector("input[name=ano]").value);
        this.obj.serie = document.querySelector("input[name=serie]").value;
        this.obj.setNome(document.querySelector("input[name=nome]").value);
        this.obj.setAbreviacao(document.querySelector("input[name=abreviacao]").value);
        this.obj.setProfessor(document.querySelector("select[name=professor]").value);
        this.obj.setNAulasSemanais(document.querySelector("input[name=nAulasSemanais]").value);
    },

    edit: function (id) {
        document.querySelector("#form").style.display = "block";
        document.querySelector("#table").style.display = "none";
        this.refreshProfessor();
        if (id === undefined || id === null || id < 0) {
            this.obj = new Disciplina();
        } else {
            this.obj = disciplinaData.get(id);
        }
        this.obj2form();
    },

    save: function (event) {
        event.preventDefault();
        this.form2obj();
        if (this.obj.id < 0) {
            this.obj.setId(new Date().getTime());
            disciplinaData.list.push(this.obj);
        }
        disciplinaData.sortBySerie();
        this.list();
    },

    remove: function (id) {
        let obj = disciplinaData.get(id);
        if (confirm("Deseja remover a disciplina " + obj.nome + " do " + obj.serie + "de " + obj.ano + " ?")) {
            disciplinaData.list.splice(disciplinaData.list.indexOf(obj), 1);
            //Lista os disciplinaes
            this.list();
        }
    },

    list: function () {
        document.querySelector("#form").style.display = "none";
        document.querySelector("#table").style.display = "block";

        let ano = document.querySelector("#discAno") !== null ? Number(document.querySelector("#discAno").value) : -1;
        let serie = document.querySelector("#discSerie") !== null ? document.querySelector("#discSerie").value : "";
        let list;
        if (ano < 0) {
            list = disciplinaData.list;
        } else if (serie === "") {
            list = disciplinaData.listAno(ano);
        } else {
            list = disciplinaData.listSerie(ano, serie);
        }

        let html = "";
        html += "<h2><u>Disciplinas</u></h2>";

        let anoList = disciplinaData.anoList();
        html += "<select id='discAno' onchange='disciplinaUI.list()'>";
        html += "<option value='-1' " + (ano === -1 ? "selected" : "") + "></option>";
        for (let anoOpt of anoList) {
            html += "<option value='" + anoOpt + "' " + (ano === anoOpt ? "selected" : "") + ">" + anoOpt + "</option>";
        }
        html += "</select>&nbsp;";

        if (ano > 0) {
            let serieList = disciplinaData.serieList(ano);
            html += "<select id='discSerie' onchange='disciplinaUI.list()'>";
            html += "<option value='' " + (serie === "" ? "selected" : "") + "></option>";
            for (let serieOpt of serieList) {
                html += "<option value='" + serieOpt + "' " + (serie === serieOpt ? "selected" : "") + ">" + serieOpt + "</option>";
            }
            html += "</select>";
        }

        html += "<table>";
        html += "<tr><th>Disciplina<th>Ano<th>Série";
        html += "<th><button onclick='disciplinaUI.edit()'>📄</button>";
        for (let disc of list) {
            html += "<tr>";
            html += "<td><button style='width:100%;' onclick='disciplinaUI.edit(" + disc.id + ")'>" + disc.nome + "</button>";
            html += "<td>" + disc.ano;
            html += "<td>" + disc.serie;
            html += "<td><button onclick='disciplinaUI.remove(" + disc.id + ")'>❌</button>";
        }
        html += "</table>";
        document.querySelector("#table").innerHTML = html;
    },

    refreshProfessor: function () {
        let html = "";
        for (let prof of professorData.listAfastado(false)) {
            html += "<option value='" + prof.id + "'>" + prof.nome + "</option>";
        }
        document.querySelector("select[name=professor]").innerHTML = html;
    }
};