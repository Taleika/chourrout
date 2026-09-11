const DRAFT_KEY='chourrout_presupuesto_actual';
const SAVED_KEY='chourrout_presupuestos_guardados';
const tabla=document.getElementById('tablaPresupuestos');
const buscar=document.getElementById('buscarPresupuesto');
const filtroEstado=document.getElementById('filtroEstado');

function leer(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(e){return fallback;}}
function dinero(v){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v||0);}
function totalPresupuesto(p){
  const modo=p.ivaGlobal??'0';
  let subtotal=0,iva=0;
  (p.items||[]).forEach(i=>{
    let neto=(Number(i.cantidad)||0)*(Number(i.precioActual??i.precio)||0)*(1+Number(i.extra||0));
    if(i.tiretas){neto+=(Number(i.cantidadDibujo||0)*77000)+(Number(i.cantidadCuadrados||0)*106000);}
    subtotal+=neto;
    const tasa=modo==='individual'?Number(i.ivaActual||0):Number(modo||0);
    iva+=neto*(tasa/100);
  });
  return subtotal+iva;
}
function obtener(){
  let lista=leer(SAVED_KEY,[]);if(!Array.isArray(lista))lista=[];
  const draft=leer(DRAFT_KEY,null);
  if(draft&&draft.estado!=='definitivo'&&((draft.items||[]).length||draft.clienteNombre)){
    lista=[draft,...lista.filter(p=>!(p.numero===draft.numero&&p.estado==='borrador'))];
  }
  return lista.sort((a,b)=>String(b.actualizadoEn||b.fecha||'').localeCompare(String(a.actualizadoEn||a.fecha||'')));
}
function render(lista){
  tabla.innerHTML='';
  if(!lista.length) tabla.innerHTML='<tr><td colspan="7" class="muted">Todavía no hay presupuestos guardados.</td></tr>';
  lista.forEach(p=>{
    const tr=document.createElement('tr');
    const estado=p.estado==='definitivo'?'Guardado definitivo':'Borrador';
    tr.innerHTML=`<td><strong>${p.numero||'—'}</strong></td><td>${p.fecha||'—'}</td><td>${p.clienteNombre||'Sin cliente'}</td><td><span class="badge ${p.estado==='definitivo'?'badge-ok':'badge-pending'}">${estado}</span></td><td>${(p.items||[]).length}</td><td class="money">${dinero(totalPresupuesto(p))}</td><td><div class="actions"><button class="icon-btn" onclick="abrirPresupuesto('${p.numero||''}','${p.estado||'borrador'}')">Abrir</button><button class="icon-btn" onclick="duplicarPresupuesto('${p.numero||''}','${p.estado||'borrador'}')">Duplicar</button></div></td>`;
    tabla.appendChild(tr);
  });
  document.getElementById('contadorPresupuestos').textContent=`${lista.length} presupuesto${lista.length===1?'':'s'}`;
}
function buscarLista(){
  const q=buscar.value.toLowerCase().trim();const e=filtroEstado.value;
  return obtener().filter(p=>{const t=`${p.numero||''} ${p.clienteNombre||''}`.toLowerCase();return(!q||t.includes(q))&&(!e||p.estado===e);});
}
function filtrar(){render(buscarLista());}
function encontrar(numero,estado){return obtener().find(p=>String(p.numero)===String(numero)&&p.estado===estado);}
window.abrirPresupuesto=(numero,estado)=>{const p=encontrar(numero,estado);if(!p)return;localStorage.setItem(DRAFT_KEY,JSON.stringify(p));location.href='nuevo.html';};
window.duplicarPresupuesto=(numero,estado)=>{const p=encontrar(numero,estado);if(!p)return;const copia=JSON.parse(JSON.stringify(p));copia.numero=String(Date.now()).slice(-6);copia.estado='borrador';copia.actualizadoEn=new Date().toISOString();localStorage.setItem(DRAFT_KEY,JSON.stringify(copia));location.href='nuevo.html';};
buscar.addEventListener('input',filtrar);filtroEstado.addEventListener('change',filtrar);document.getElementById('mostrarTodos').addEventListener('click',()=>{buscar.value='';filtroEstado.value='';render(obtener());});
render(obtener());