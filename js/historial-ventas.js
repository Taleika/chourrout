import { db } from './firebase-config.js';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const SAVED_KEY='chourrout_presupuestos_guardados';
const tabla=document.getElementById('tablaPresupuestos');
let presupuestos=[];

function leerLocal(){try{return JSON.parse(localStorage.getItem(SAVED_KEY)||'[]')||[];}catch(e){return[];}}
function guardarLocal(){localStorage.setItem(SAVED_KEY,JSON.stringify(presupuestos));}
function num(v){return Number(v)||0;}
function entero(v){return Math.max(0,Math.round(num(v)));}
function dinero(v){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(num(v));}
function idPresupuesto(numero){return `P-${String(numero||'').replace(/[^a-zA-Z0-9_-]/g,'')}`;}
function netoItem(i){
  let neto=entero(i.cantidad)*num(i.precioActual??i.precio)*(1+num(i.extra));
  if(i.tiretas){neto+=entero(i.dibujos??i.cantidadDibujo)*77000;neto+=entero(i.cuadrados??i.cantidadCuadrados)*106000;}
  return neto;
}
function totalPresupuesto(p){
  let total=0;(p.items||[]).forEach(i=>{const neto=netoItem(i);const tasa=(p.ivaGlobal??'0')==='individual'?num(i.ivaActual):num(p.ivaGlobal??0);total+=neto+(tasa===21?neto*.21:tasa===10.5?neto*.105:0);});return total;
}
function estadoComercial(p){return p.resultadoComercial||'pendiente';}

function instalarPanel(){
  if(document.getElementById('ventasResumen'))return;
  const toolbar=document.querySelector('.toolbar');if(!toolbar)return;
  const panel=document.createElement('section');panel.id='ventasResumen';panel.className='history-stats';panel.style.marginBottom='16px';
  panel.style.gridTemplateColumns='repeat(5,minmax(0,1fr))';
  panel.innerHTML=`
    <div class="history-stat"><span>Total definitivo</span><strong id="ventaTotal">—</strong><small id="ventaTotalCant" style="color:#888"></small></div>
    <div class="history-stat"><span>Concretado</span><strong id="ventaConcretado">—</strong><small id="ventaConcretadoCant" style="color:#888"></small></div>
    <div class="history-stat"><span>No concretado</span><strong id="ventaNoConcretado">—</strong><small id="ventaNoConcretadoCant" style="color:#888"></small></div>
    <div class="history-stat"><span>Pendiente</span><strong id="ventaPendiente">—</strong><small id="ventaPendienteCant" style="color:#888"></small></div>
    <div class="history-stat"><span>Aprobación</span><strong id="ventaAprobacion">—</strong><small style="color:#888">Sobre presupuestos resueltos</small></div>`;
  toolbar.parentNode.insertBefore(panel,toolbar);
}

function actualizarResumen(){
  const definitivos=presupuestos.filter(p=>p.estado==='definitivo');
  const concretados=definitivos.filter(p=>estadoComercial(p)==='concretado');
  const noConcretados=definitivos.filter(p=>estadoComercial(p)==='no_concretado');
  const pendientes=definitivos.filter(p=>estadoComercial(p)==='pendiente');
  const suma=lista=>lista.reduce((a,p)=>a+totalPresupuesto(p),0);
  const resueltos=concretados.length+noConcretados.length;
  const aprobacion=resueltos?(concretados.length/resueltos*100):0;
  document.getElementById('ventaTotal').textContent=dinero(suma(definitivos));
  document.getElementById('ventaConcretado').textContent=dinero(suma(concretados));
  document.getElementById('ventaNoConcretado').textContent=dinero(suma(noConcretados));
  document.getElementById('ventaPendiente').textContent=dinero(suma(pendientes));
  document.getElementById('ventaAprobacion').textContent=resueltos?`${aprobacion.toFixed(1).replace('.',',')}%`:'—';
  document.getElementById('ventaTotalCant').textContent=`${definitivos.length} presupuesto${definitivos.length===1?'':'s'}`;
  document.getElementById('ventaConcretadoCant').textContent=`${concretados.length} venta${concretados.length===1?'':'s'}`;
  document.getElementById('ventaNoConcretadoCant').textContent=`${noConcretados.length} presupuesto${noConcretados.length===1?'':'s'}`;
  document.getElementById('ventaPendienteCant').textContent=`${pendientes.length} por definir`;
}

function prepararColumna(){
  const head=tabla?.closest('table')?.querySelector('thead tr');
  if(head&&!head.querySelector('.th-venta')){
    const th=document.createElement('th');th.className='th-venta';th.textContent='Venta';
    const acciones=[...head.children].find(x=>x.textContent.trim()==='Acciones');
    head.insertBefore(th,acciones||null);
  }
  tabla?.querySelectorAll('tr').forEach(tr=>{
    if(tr.querySelector('.estado-venta'))return;
    const ref=tr.querySelector('[data-numero]');if(!ref)return;
    const numero=ref.dataset.numero;
    const estado=ref.dataset.estado;
    const p=presupuestos.find(x=>String(x.numero)===String(numero));
    const td=document.createElement('td');td.className='estado-venta';
    if(estado!=='definitivo'){
      td.innerHTML='<span class="muted">—</span>';
    }else{
      const actual=estadoComercial(p||{});
      td.innerHTML=`<select class="control control-compact js-venta" data-numero="${numero}" style="min-width:135px;height:34px;padding:4px 8px"><option value="pendiente" ${actual==='pendiente'?'selected':''}>Pendiente</option><option value="concretado" ${actual==='concretado'?'selected':''}>✓ Concretado</option><option value="no_concretado" ${actual==='no_concretado'?'selected':''}>No concretado</option></select>`;
    }
    const actions=tr.querySelector('.actions')?.closest('td');tr.insertBefore(td,actions||null);
  });
  tabla?.querySelectorAll('.js-venta').forEach(sel=>{
    if(sel.dataset.ready)return;sel.dataset.ready='1';sel.addEventListener('change',()=>cambiarEstado(sel));
  });
}

async function cambiarEstado(sel){
  const numero=sel.dataset.numero;const nuevo=sel.value;
  const p=presupuestos.find(x=>String(x.numero)===String(numero));if(!p)return;
  const anterior=estadoComercial(p);
  const texto=nuevo==='concretado'?'marcarlo como venta concretada':nuevo==='no_concretado'?'marcarlo como no concretado':'devolverlo a pendiente';
  if(!confirm(`¿Querés ${texto}?\n\nPresupuesto Nº ${numero}`)){sel.value=anterior;return;}
  sel.disabled=true;
  try{
    await updateDoc(doc(db,'presupuestos',idPresupuesto(numero)),{resultadoComercial:nuevo,resultadoComercialActualizadoEn:serverTimestamp()});
    p.resultadoComercial=nuevo;guardarLocal();actualizarResumen();
    sel.style.borderColor=nuevo==='concretado'?'#84c59a':nuevo==='no_concretado'?'#e2a7a7':'#d8d8d8';
  }catch(error){console.error(error);sel.value=anterior;alert(`No se pudo actualizar el estado comercial: ${error.message||error}`);}
  finally{sel.disabled=false;}
}

async function cargar(){
  instalarPanel();
  try{
    const snap=await getDocs(collection(db,'presupuestos'));
    presupuestos=snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(error){console.warn('No se pudo leer Firebase para el resumen comercial; se usa la copia local.',error);presupuestos=leerLocal();}
  actualizarResumen();prepararColumna();
}

await cargar();
new MutationObserver(()=>requestAnimationFrame(prepararColumna)).observe(tabla,{childList:true,subtree:true});