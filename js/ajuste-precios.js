import { db } from './firebase-config.js';
import { collection, doc, getDocs, serverTimestamp, setDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const tabla=document.getElementById('tablaProductos');
const productosRef=collection(db,'productos');
let productos=[];
let seleccionados=new Set();

function dinero(v){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(v)||0);}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

function instalarUi(){
  const top=document.querySelector('.topbar > div:last-child');
  if(top&&!document.getElementById('btnAjustePrecios')){
    const b=document.createElement('button');
    b.id='btnAjustePrecios';b.className='btn btn-outline';b.textContent='% Actualizar precios';
    top.insertBefore(b,document.getElementById('btnNuevo'));
  }

  if(!document.getElementById('modalAjustePrecios')){
    const wrap=document.createElement('div');
    wrap.className='modal-backdrop';wrap.id='modalAjustePrecios';
    wrap.innerHTML=`<div class="modal" style="max-width:680px"><div class="modal-head"><h3>Actualización masiva de precios</h3><button class="icon-btn" id="cerrarAjuste">✕</button></div><div class="modal-body">
      <div class="modal-grid">
        <div class="field"><label>Aplicar a</label><select class="control" id="ajusteAlcance"><option value="categoria">Una categoría</option><option value="seleccion">Productos seleccionados</option><option value="todos">Todos los productos</option></select></div>
        <div class="field" id="campoCategoriaAjuste"><label>Categoría</label><select class="control" id="ajusteCategoria"></select></div>
        <div class="field"><label>Variación (%)</label><input class="control" id="ajustePorcentaje" type="number" step="0.1" placeholder="Ej: 10 o -5"></div>
        <div class="field"><label>Redondeo</label><select class="control" id="ajusteRedondeo"><option value="1">Al peso</option><option value="10">A decenas</option><option value="100">A centenas</option><option value="1000">A miles</option></select></div>
      </div>
      <div class="notice" style="margin:16px 0 0"><div><strong>Los productos con precio pendiente ($999) se excluyen automáticamente.</strong><br>Los presupuestos definitivos ya emitidos no se modifican.</div></div>
      <div id="previewAjuste" style="margin-top:16px;background:#f7f7f7;border-radius:12px;padding:14px;line-height:1.55">Ingresá un porcentaje para ver la vista previa.</div>
    </div><div class="modal-foot"><button class="btn btn-outline" id="cancelarAjuste">Cancelar</button><button class="btn btn-primary" id="aplicarAjuste">Aplicar actualización</button></div></div>`;
    document.body.appendChild(wrap);
  }
  prepararSeleccionTabla();
  enlazarEventos();
}

function prepararSeleccionTabla(){
  const th=tabla?.closest('table')?.querySelector('thead tr');
  if(th&&!th.querySelector('.th-seleccion')){
    const c=document.createElement('th');c.className='th-seleccion';c.style.width='36px';c.innerHTML='<input type="checkbox" id="seleccionarTodosProductos" title="Seleccionar visibles">';th.insertBefore(c,th.firstChild);
    c.querySelector('input').addEventListener('change',e=>{
      tabla.querySelectorAll('tr').forEach(tr=>{
        if(tr.style.display==='none')return;
        const cb=tr.querySelector('.sel-producto');if(cb){cb.checked=e.target.checked;const id=cb.dataset.id;e.target.checked?seleccionados.add(id):seleccionados.delete(id);}
      });
      actualizarTextoSeleccion();
    });
  }
  tabla?.querySelectorAll('tr').forEach(tr=>{
    if(tr.querySelector('.sel-producto'))return;
    const ref=tr.querySelector('[data-id]');if(!ref)return;
    const id=ref.dataset.id;
    const td=document.createElement('td');td.style.textAlign='center';td.innerHTML=`<input class="sel-producto" type="checkbox" data-id="${esc(id)}" ${seleccionados.has(id)?'checked':''}>`;
    tr.insertBefore(td,tr.firstChild);
    td.querySelector('input').addEventListener('change',e=>{e.target.checked?seleccionados.add(id):seleccionados.delete(id);actualizarTextoSeleccion();});
  });
}
function actualizarTextoSeleccion(){
  const b=document.getElementById('btnAjustePrecios');if(b)b.textContent=seleccionados.size?`% Actualizar precios (${seleccionados.size})`:'% Actualizar precios';
}

async function cargarProductos(){
  const snap=await getDocs(productosRef);
  productos=snap.docs.map(d=>({id:d.id,...d.data()}));
  const cats=[...new Set(productos.map(p=>p.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  document.getElementById('ajusteCategoria').innerHTML=cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
}
function productosObjetivo(){
  const alcance=document.getElementById('ajusteAlcance').value;
  let lista=[];
  if(alcance==='todos')lista=[...productos];
  if(alcance==='categoria'){const c=document.getElementById('ajusteCategoria').value;lista=productos.filter(p=>p.categoria===c);}
  if(alcance==='seleccion')lista=productos.filter(p=>seleccionados.has(p.id));
  return lista.filter(p=>Number(p.precio)!==999&&!p.pendiente&&Number(p.precio)>0);
}
function nuevoPrecio(precio,pct,redondeo){
  const bruto=Number(precio)*(1+pct/100);return Math.round(bruto/redondeo)*redondeo;
}
function actualizarPreview(){
  const pct=Number(document.getElementById('ajustePorcentaje').value);
  const red=Math.max(1,Number(document.getElementById('ajusteRedondeo').value)||1);
  const lista=productosObjetivo();const box=document.getElementById('previewAjuste');
  if(!Number.isFinite(pct)||pct===0){box.innerHTML='Ingresá un porcentaje distinto de 0 para ver la vista previa.';return;}
  const actual=lista.reduce((a,p)=>a+Number(p.precio||0),0);
  const nuevo=lista.reduce((a,p)=>a+nuevoPrecio(p.precio,pct,red),0);
  const muestra=lista.slice(0,5).map(p=>`<div style="display:flex;justify-content:space-between;gap:12px"><span>${esc([p.producto,p.variante,p.medida].filter(Boolean).join(' · '))}</span><strong>${dinero(p.precio)} → ${dinero(nuevoPrecio(p.precio,pct,red))}</strong></div>`).join('');
  box.innerHTML=`<strong>${lista.length} producto${lista.length===1?'':'s'} serán modificados.</strong><div style="margin:6px 0 10px">Suma de precios: ${dinero(actual)} → <strong>${dinero(nuevo)}</strong></div>${muestra}${lista.length>5?`<div class="muted" style="margin-top:6px">…y ${lista.length-5} productos más.</div>`:''}`;
}

async function abrirModal(){
  await cargarProductos();
  const m=document.getElementById('modalAjustePrecios');m.classList.add('open');
  document.getElementById('ajusteAlcance').value=seleccionados.size?'seleccion':'categoria';
  document.getElementById('campoCategoriaAjuste').style.display=seleccionados.size?'none':'';
  actualizarPreview();
}
function cerrar(){document.getElementById('modalAjustePrecios').classList.remove('open');}
async function aplicar(){
  const pct=Number(document.getElementById('ajustePorcentaje').value);
  const red=Math.max(1,Number(document.getElementById('ajusteRedondeo').value)||1);
  const lista=productosObjetivo();
  if(!Number.isFinite(pct)||pct===0){alert('Ingresá un porcentaje distinto de 0.');return;}
  if(!lista.length){alert('No hay productos válidos para actualizar con ese criterio.');return;}
  const verbo=pct>0?'aumentar':'reducir';
  if(!confirm(`¿Confirmás ${verbo} ${Math.abs(pct)}% el precio de ${lista.length} producto${lista.length===1?'':'s'}?\n\nEsta acción actualizará la lista maestra de precios.`))return;
  const boton=document.getElementById('aplicarAjuste');boton.disabled=true;boton.textContent='Actualizando...';
  try{
    const batch=writeBatch(db);
    lista.forEach(p=>batch.update(doc(db,'productos',p.id),{precio:nuevoPrecio(p.precio,pct,red),actualizadoEn:serverTimestamp(),ultimoAjustePorcentaje:pct}));
    const ajusteId=`A-${Date.now()}`;
    batch.set(doc(db,'ajustesPrecios',ajusteId),{
      porcentaje:pct,redondeo:red,alcance:document.getElementById('ajusteAlcance').value,
      categoria:document.getElementById('ajusteAlcance').value==='categoria'?document.getElementById('ajusteCategoria').value:'',
      productos:lista.map(p=>p.id),cantidad:lista.length,creadoEn:serverTimestamp()
    });
    await batch.commit();
    alert(`Precios actualizados correctamente: ${lista.length} producto${lista.length===1?'':'s'}.`);
    location.reload();
  }catch(error){console.error(error);alert(`No se pudieron actualizar los precios: ${error.message||error}`);}
  finally{boton.disabled=false;boton.textContent='Aplicar actualización';}
}

function enlazarEventos(){
  const b=document.getElementById('btnAjustePrecios');if(b&&!b.dataset.ready){b.dataset.ready='1';b.addEventListener('click',abrirModal);}
  document.getElementById('cerrarAjuste')?.addEventListener('click',cerrar);
  document.getElementById('cancelarAjuste')?.addEventListener('click',cerrar);
  document.getElementById('modalAjustePrecios')?.addEventListener('click',e=>{if(e.target.id==='modalAjustePrecios')cerrar();});
  document.getElementById('ajusteAlcance')?.addEventListener('change',e=>{document.getElementById('campoCategoriaAjuste').style.display=e.target.value==='categoria'?'':'none';actualizarPreview();});
  document.getElementById('ajusteCategoria')?.addEventListener('change',actualizarPreview);
  document.getElementById('ajustePorcentaje')?.addEventListener('input',actualizarPreview);
  document.getElementById('ajusteRedondeo')?.addEventListener('change',actualizarPreview);
  document.getElementById('aplicarAjuste')?.addEventListener('click',aplicar);
}

instalarUi();
new MutationObserver(()=>requestAnimationFrame(prepararSeleccionTabla)).observe(tabla,{childList:true,subtree:true});