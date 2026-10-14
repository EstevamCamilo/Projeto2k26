const sites = [
  "https://pt.wikipedia.org/wiki/Tabela_peri%C3%B3dica",
  "https://pt.wikipedia.org/wiki/Hidrogénio",
  "https://pt.wikipedia.org/wiki/Hélio",
  "https://pt.wikipedia.org/wiki/Lítio",
  "https://pt.wikipedia.org/wiki/Ber%C3%ADlio",
  "https://pt.wikipedia.org/wiki/Boro",
  "https://pt.wikipedia.org/wiki/Carbono",
  "https://pt.wikipedia.org/wiki/Nitrog%C3%AAnio",
  "https://pt.wikipedia.org/wiki/Oxig%C3%AAnio",
  "https://pt.wikipedia.org/wiki/Fl%C3%BAor",
  "https://pt.wikipedia.org/wiki/N%C3%A9on",
  "https://pt.wikipedia.org/wiki/S%C3%B3dio",
  "https://pt.wikipedia.org/wiki/Magn%C3%A9sio",
  "https://pt.wikipedia.org/wiki/Alum%C3%ADnio",
  "https://pt.wikipedia.org/wiki/Sil%C3%ADcio",
  "https://pt.wikipedia.org/wiki/F%C3%B3sforo",
  "https://pt.wikipedia.org/wiki/Enxofre",
  "https://pt.wikipedia.org/wiki/Cloro",
  "https://pt.wikipedia.org/wiki/Arg%C3%B4nio",
  "https://pt.wikipedia.org/wiki/Pot%C3%A1ssio",
  "https://pt.wikipedia.org/wiki/C%C3%A1lcio", 
  "https://pt.wikipedia.org/wiki/Esc%C3%A2ndio",
  "https://pt.wikipedia.org/wiki/Tit%C3%A2nio", //
  "https://pt.wikipedia.org/wiki/Van%C3%A1dio", //
  "https://pt.wikipedia.org/wiki/Cr%C3%B4mio", //
  "https://pt.wikipedia.org/wiki/Mangan%C3%AAs", //25
  "https://pt.wikipedia.org/wiki/Ferro", //
  "https://pt.wikipedia.org/wiki/Cobalto", //
  "https://pt.wikipedia.org/wiki/N%C3%ADquel", //
  "https://pt.wikipedia.org/wiki/Cobre", //
  "https://pt.wikipedia.org/wiki/Zinco", //30
  "https://pt.wikipedia.org/wiki/G%C3%A1lio", //
  "https://pt.wikipedia.org/wiki/Germ%C3%A2nio", //
  "https://pt.wikipedia.org/wiki/Ars%C3%AAnio", //
  "https://pt.wikipedia.org/wiki/Sel%C3%AAnio", //
  "https://pt.wikipedia.org/wiki/Bromo", //35
  "https://pt.wikipedia.org/wiki/Cript%C3%B4nio", //
  "https://pt.wikipedia.org/wiki/Rub%C3%ADdio", //
  "https://pt.wikipedia.org/wiki/Estr%C3%B4ncio", //
  "https://pt.wikipedia.org/wiki/%C3%8Dtrio", //
  "https://pt.wikipedia.org/wiki/Zirc%C3%B4nio", //40
  "https://pt.wikipedia.org/wiki/Ni%C3%B3bio", //
  "https://pt.wikipedia.org/wiki/Molibd%C3%AAnio", //
  "https://pt.wikipedia.org/wiki/Tecn%C3%A9cio", //
  "https://pt.wikipedia.org/wiki/Rut%C3%AAnio", //
  "https://pt.wikipedia.org/wiki/R%C3%B3dio", //45
  "https://pt.wikipedia.org/wiki/Pal%C3%A1dio", //
  "https://pt.wikipedia.org/wiki/Prata", //
  "https://pt.wikipedia.org/wiki/C%C3%A1dmio", //
  "https://pt.wikipedia.org/wiki/%C3%8Dndio_(elemento_qu%C3%ADmico)", //
  "https://pt.wikipedia.org/wiki/Estanho", //50
  "https://pt.wikipedia.org/wiki/Antim%C3%B4nio", //
  "https://pt.wikipedia.org/wiki/Tel%C3%BArio", //
  "https://pt.wikipedia.org/wiki/Iodo", //
  "https://pt.wikipedia.org/wiki/Xen%C3%B4nio", //
  "", //55
  "", //
  "", //
  "", //
  "", //
  "", //60
  "", //
  "", //
  "", //
  "", //
  "https://pt.wikipedia.org/wiki/T%C3%A9rbio", //65
  "https://pt.wikipedia.org/wiki/Dispr%C3%B3sio", //
  "https://pt.wikipedia.org/wiki/H%C3%B3lmio", //
  "https://pt.wikipedia.org/wiki/%C3%89rbio", //
  "https://pt.wikipedia.org/wiki/T%C3%BAlio", //
  "https://pt.wikipedia.org/wiki/It%C3%A9rbio", //70
  "https://pt.wikipedia.org/wiki/Lut%C3%A9cio", //
  "https://pt.wikipedia.org/wiki/H%C3%A1fnio", //
  "https://pt.wikipedia.org/wiki/T%C3%A2ntalo_(elemento_qu%C3%ADmico)", //
  "https://pt.wikipedia.org/wiki/Tungst%C3%AAnio", //
  "https://pt.wikipedia.org/wiki/R%C3%AAnio", //75
  "https://pt.wikipedia.org/wiki/%C3%93smio", //
  "https://pt.wikipedia.org/wiki/Ir%C3%ADdio", //
  "https://pt.wikipedia.org/wiki/Platina", //
  "https://pt.wikipedia.org/wiki/Ouro", //
  "https://pt.wikipedia.org/wiki/Merc%C3%BArio_(elemento_qu%C3%ADmico)", //80
  "https://pt.wikipedia.org/wiki/T%C3%A1lio", //
  "https://pt.wikipedia.org/wiki/Chumbo", //
  "https://pt.wikipedia.org/wiki/Bismuto", //
  "https://pt.wikipedia.org/wiki/Pol%C3%B4nio", //
  "https://pt.wikipedia.org/wiki/%C3%81stato", //85
  "https://pt.wikipedia.org/wiki/Rad%C3%B4nio", //
  "https://pt.wikipedia.org/wiki/Fr%C3%A2ncio", //
  "https://pt.wikipedia.org/wiki/R%C3%A1dio_(elemento_qu%C3%ADmico)", //
  "https://pt.wikipedia.org/wiki/Act%C3%ADnio", //
  "https://pt.wikipedia.org/wiki/T%C3%B3rio", //90
  "", //
  "", //
  "", //
  "", //
  "", //95
  "", //
  "", //
  "", //
  "", //
  "", //100
  "", //
  "", //
  "", //
  "", //
  "", //105
  "https://pt.wikipedia.org/wiki/Seab%C3%B3rgio", //
  "https://pt.wikipedia.org/wiki/B%C3%B3hrio", //
  "https://pt.wikipedia.org/wiki/H%C3%A1ssio", //
  "https://pt.wikipedia.org/wiki/Meitn%C3%A9rio", //
  "https://pt.wikipedia.org/wiki/Darmst%C3%A1cio", //110
  "https://pt.wikipedia.org/wiki/Roentg%C3%AAnio", //
  "https://pt.wikipedia.org/wiki/Copern%C3%ADcio", //
  "https://pt.wikipedia.org/wiki/Nih%C3%B4nio", //
  "https://pt.wikipedia.org/wiki/Fler%C3%B3vio", //
  "https://pt.wikipedia.org/wiki/Mosc%C3%B3vio", //115
  "https://pt.wikipedia.org/wiki/Liverm%C3%B3rio", //
  "https://pt.wikipedia.org/wiki/Teness%C3%ADnio", //
  "https://pt.wikipedia.org/wiki/Oganess%C3%B4nio"
];

function elementoClick(n) {
  //Obtem a janela dialog
  var janela = document.querySelector("#janela");
  //Obtem o iframe
  var frame = document.querySelector("#frame");
  //Define a url do frame
  frame.src = sites[n];
  //Exibe o dialog
  janela.showModal();
}