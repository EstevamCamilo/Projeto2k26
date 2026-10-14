import test from 'node:test';
import assert from 'node:assert/strict';
import * as calc from '../js/calculations.js';
const approx=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`Esperado ${b}, obtido ${a}`);
test('parser seguro: precedência e potenciação associativa',()=>{
 assert.equal(calc.evaluateExpression('2+3*4'),14);
 assert.equal(calc.evaluateExpression('(2+3)*4'),20);
 assert.equal(calc.evaluateExpression('2^3^2'),512);
 assert.equal(calc.evaluateExpression('-2^2'),-4);
 assert.equal(calc.evaluateExpression('5!'),120);
});
test('calculadora: porcentagem contextual, raiz, logaritmo, trigonometria',()=>{
 assert.equal(calc.evaluateExpression('200+10%'),220);
 assert.equal(calc.evaluateExpression('200-10%'),180);
 assert.equal(calc.evaluateExpression('sqrt(81)'),9);
 assert.equal(calc.evaluateExpression('log(1000)'),3);
 approx(calc.evaluateExpression('sin(30)'),.5);
 approx(calc.evaluateExpression('sin(pi/2)',false),1);
 assert.throws(()=>calc.evaluateExpression('sqrt(-1)'));
 assert.throws(()=>calc.evaluateExpression('foo(5)'));
});
test('Bhaskara: duas, uma ou nenhuma raiz real',()=>{
 assert.deepEqual(calc.quadratic(1,-5,6).roots,[2,3]);
 assert.deepEqual(calc.quadratic(1,2,1).roots,[-1]);
 assert.equal(calc.quadratic(1,0,1).roots.length,0);
 assert.throws(()=>calc.quadratic(0,3,1));
});
test('áreas e perímetros válidos',()=>{
 assert.equal(calc.area('triangulo',{b:8,h:5}),20);
 approx(calc.area('circulo',{r:2}),Math.PI*4);
 assert.equal(calc.area('trapezio',{B:12,b:7,h:6}),57);
 assert.equal(calc.perimeter('triangulo',{a:3,b:4,c:5}),12);
 assert.throws(()=>calc.perimeter('triangulo',{a:1,b:2,c:5}));
});
test('volumes tridimensionais',()=>{
 assert.equal(calc.volume('cubo',{l:5}),125);
 approx(calc.volume('esfera',{r:3}),Math.PI*36);
 assert.equal(calc.volume('piramide',{A:12,h:6}),24);
});
test('conversor de temperatura',()=>{
 approx(calc.convert('temperatura',0,'C','F'),32);
 approx(calc.convert('temperatura',25,'C','K'),298.15);
 approx(calc.convert('temperatura',273.15,'K','C'),0);
 assert.throws(()=>calc.convert('temperatura',-300,'C','F'));
});
test('conversões lineares entre unidades',()=>{
 assert.equal(calc.convert('comprimento',1,'km','m'),1000);
 assert.equal(calc.convert('peso',2,'kg','g'),2000);
 assert.equal(calc.convert('tempo',2,'h','min'),120);
 assert.equal(calc.convert('area',1,'ha','m2'),10000);
 assert.equal(calc.convert('volume',1,'m3','L'),1000);
});
test('números primos, crivo e fatoração',()=>{
 assert.equal(calc.isPrime(97),true);
 assert.equal(calc.isPrime(1),false);
 assert.deepEqual(calc.primesUpTo(20),[2,3,5,7,11,13,17,19]);
 assert.deepEqual(calc.primeFactors(360),[2,2,2,3,3,5]);
});
test('porcentagem, desconto, acréscimo e margem',()=>{
 assert.equal(calc.percentages('desconto',200,15),170);
 approx(calc.percentages('acrescimo',200,10),220);
 assert.equal(calc.percentages('comissao',1000,5),50);
 assert.equal(calc.percentages('margem',200,250),20);
});
test('juros simples e compostos com e sem aportes',()=>{
 const simple=calc.interest('simples',1000,12,12);
 approx(simple.balance,1120);
 const compound=calc.interest('compostos',1000,12,12);
 approx(compound.balance,1120);
 const contributions=calc.interest('simples',1000,12,2,100);
 approx(contributions.balance,1221);
 assert.equal(contributions.invested,1200);
});
test('IMC e limites',()=>{
 const result=calc.bmi(70,1.75);
 approx(result.value,70/(1.75*1.75));
 assert.equal(result.classification,'Peso adequado');
 assert.throws(()=>calc.bmi(70,0));
});
test('equação de primeiro grau e sistema 2x2',()=>{
 assert.equal(calc.linear(3,-12).x,4);
 assert.equal(calc.linear(0,0).kind,'infinite');
 assert.equal(calc.linear(0,5).kind,'none');
 const system=calc.linearSystem(2,1,7,1,-1,2);
 approx(system.x,3);approx(system.y,1);
 assert.equal(calc.linearSystem(1,1,2,2,2,4).kind,'infinite');
 assert.equal(calc.linearSystem(1,1,2,2,2,5).kind,'none');
});
test('estatística populacional',()=>{
 const s=calc.statistics('1, 2, 2, 3');
 assert.equal(s.mean,2);assert.equal(s.median,2);
 assert.deepEqual(s.modes,[2]);approx(s.variance,.5);approx(s.std,Math.sqrt(.5));
});
test('fibonacci, PA, PG, MMC e MDC',()=>{
 assert.deepEqual(calc.fibonacci(7),[0,1,1,2,3,5,8]);
 assert.deepEqual(calc.progression('pa',2,3,4).arr,[2,5,8,11]);
 assert.deepEqual(calc.progression('pg',2,3,4).arr,[2,6,18,54]);
 assert.deepEqual(calc.gcdLcm(24,36),{g:12,l:72});
});
