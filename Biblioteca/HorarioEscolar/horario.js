/* horario.js */

//******************************************************************************
// Class Horario
//******************************************************************************
var Horario = function () {
    return {
        id: -1,
        ano: new Date().getFullYear(),
        serie: "",
        grade: [],

        setId: function (id) {
            this.id = Number(id);
        },
        setAno: function (ano) {
            this.ano = Number(ano);
        },

        fromJSON: function (json) {
            this.setId(json.id);
            this.setAno(json.ano);
            this.serie = json.serie;
            this.grade = json.grade;
        }
    };
};

//******************************************************************************
// Data Horario
//******************************************************************************
var horarioData = {
    //Lista vazia que vai guardar os objetos Horario
    list: [],

    //Import JSON list
    fromJSON: function (jsonList) {
        for (let json of jsonList) {
            //cria outro objeto horario
            let obj = new Horario();
            //Pega os dados do JSON e coloca no objeto horario
            obj.fromJSON(json);
            //Acrescenta o objeto na lista horario
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
    sortByAno: function () {
        this.list.sort((a, b) => (a.serie > b.serie ? 1 : (a.serie < b.serie ? -1 : 0)));
        this.list.sort((a, b) => (a.ano > b.ano ? 1 : (a.ano < b.ano ? -1 : 0)));
    },

    //Obtem lista de horarios por ano
    listAno: function (ano) {
        let list = [];
        for (let horario of this.list) {
            if (horario.ano === ano) {
                list.push(horario);
            }
        }
        return list;
    }
};

//******************************************************************************
// UI Horario
//******************************************************************************
var horarioUI = {
    ui: "",
    obj: null,
    grade: null,

    init: function () {
        fetch("horario.html").then(function (data) {
            data.text().then(function (html) {
                horarioUI.ui = html;
            }).catch(function () {
                alert("Falha ao converter os dados em texto");
            });
        }).catch(function () {
            alert("Falha ao carregar horario.html");
        });
    },

    start: function (divId) {
        document.querySelector(divId).innerHTML = this.ui;
        this.list();
    },

    obj2form: function () {
        document.querySelector("input[name=id]").value = this.obj.id;
        document.querySelector("select[name=ano]").value = this.obj.ano;
        this.refreshSerie();
        document.querySelector("select[name=serie]").value = this.obj.serie;
        this.grade = this.obj.grade;
        this.refreshGrade();
    },

    form2obj: function () {
        this.obj.setId(document.querySelector("input[name=id]").value);
        this.obj.setAno(document.querySelector("select[name=ano]").value);
        this.obj.serie = document.querySelector("select[name=serie]").value;
        this.obj.grade = this.grade;
    },

    edit: function (id) {
        document.querySelector("#form").style.display = "block";
        document.querySelector("#table").style.display = "none";
        this.refreshAno();
        if (id === undefined || id === null || id < 0) {
            this.obj = new Horario();
        } else {
            this.obj = horarioData.get(id);
        }
        this.obj2form();
    },

    save: function (event) {
        event.preventDefault();
        this.form2obj();
        if (this.obj.id < 0) {
            this.obj.setId(new Date().getTime());
            horarioData.list.push(this.obj);
        }
        horarioData.sortByAno();
        this.list();
    },

    remove: function (id) {
        let obj = horarioData.get(id);
        if (confirm("Deseja remover a horario do " + obj.serie + "de " + obj.ano + " ?")) {
            horarioData.list.splice(horarioData.list.indexOf(obj), 1);
            //Lista os horarios
            this.list();
        }
    },

    list: function () {
        document.querySelector("#form").style.display = "none";
        document.querySelector("#table").style.display = "block";

        let ano = document.querySelector("#discAno") !== null ? Number(document.querySelector("#discAno").value) : -1;
        let list;
        if (ano < 0) {
            list = horarioData.list;
        } else {
            list = horarioData.listAno(ano);
        }

        let html = "";
        html += "<h2><u>Horarios</u></h2>";

        let anoList = disciplinaData.anoList();
        html += "<select id='discAno' onchange='horarioUI.list()'>";
        html += "<option value='-1' " + (ano === -1 ? "selected" : "") + "></option>";
        for (let anoOpt of anoList) {
            html += "<option value='" + anoOpt + "' " + (ano === anoOpt ? "selected" : "") + ">" + anoOpt + "</option>";
        }
        html += "</select>&nbsp;";

        html += "<table>";
        html += "<tr><th>Série<th>Ano";
        html += "<th><button onclick='horarioUI.edit()'>📄</button>";
        for (let horario of list) {
            html += "<tr>";
            html += "<td><button style='width:100%;' onclick='horarioUI.edit(" + horario.id + ")'>" + horario.serie + "</button>";
            html += "<td>" + horario.ano;
            html += "<td><button onclick='horarioUI.remove(" + horario.id + ")'>❌</button>";
        }
        html += "</table>";
        document.querySelector("#table").innerHTML = html;
    },

    refreshAno: function () {
        let html = "";
        for (let ano of disciplinaData.anoList()) {
            html += "<option value='" + ano + "'>" + ano + "</option>";
        }
        document.querySelector("select[name=ano]").innerHTML = html;
    },

    refreshSerie: function () {
        let ano = 0;
        ano = Number(document.querySelector("select[name=ano]").value);
        let html = "";
        for (let serie of disciplinaData.serieList(ano)) {
            html += "<option value='" + serie + "'>" + serie + "</option>";
        }
        document.querySelector("select[name=serie]").innerHTML = html;
    },

    //***********************************************************************
    //Atualiza a tabela da grade horários
    refreshGrade: function () {
        if (this.grade.length === 0) {
            this.addHora();
        } else {
            let ano = Number(document.querySelector("select[name=ano]").value);
            let serie = document.querySelector("select[name=serie]").value;

            let list = disciplinaData.listSerie(ano, serie);
            let html = "<tr><th>Hora<th>Segunda-feira<th>Terça-feira<th>Quarta-Feira<th>Quinta-Feira<th>Sexta-Feira<th>Sábado";
            for (let i = 0; i < this.grade.length; i++) {
                html += "<tr>";
                html += "<th><input id='s" + i + "_0' type='time' value='" + this.grade[i][0] + "' oninput='horarioUI.onHorarioInput(event,\"" + i + "\",\"0\")'/>";
                html += "<th>" + this.disciplinaList(i, 1, list);
                html += "<th>" + this.disciplinaList(i, 2, list);
                html += "<th>" + this.disciplinaList(i, 3, list);
                html += "<th>" + this.disciplinaList(i, 4, list);
                html += "<th>" + this.disciplinaList(i, 5, list);
                html += "<th>" + this.disciplinaList(i, 6, list);
            }
            document.querySelector("#grade").innerHTML = html;
        }
    },

    //Evento para adicionar hora à grade de horários
    addHora: function () {
        let row = ["", "-1", "-1", "-1", "-1", "-1", "-1"];
        this.grade.push(row);
        this.refreshGrade();
    },
    //Evento para remover hora da grade de horários
    remHora: function () {
        if (confirm("Deseja remover essa hora da grade de horários?")) {
            this.grade.pop();
            this.refreshGrade();
        }
    },

    //Cria <select> com a lista de disciplinas
    disciplinaList: function (row, col, list) {
        let html = "<select id='s" + row + "_" + col + "' oninput='horarioUI.onHorarioInput(event,\"" + row + "\",\"" + col + "\")'>";
        html += "<option value='-1'> - </option>";
        for (let disc of list) {
            html += "<option value='" + disc.id + "'";
            html += this.grade[row][col] === "" + disc.id ? " selected" : "";
            html += ">" + disc.abreviacao + "</option>";
        }
        html += "</select>";
        return html;
    },

    //Evento para alterar os dados do horário
    onHorarioInput: function (event, row, col) {
        this.grade[row][col] = document.querySelector("#s" + row + "_" + col).value;
    }
};