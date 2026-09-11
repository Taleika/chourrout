const catalogo = Array.isArray(window.CH_PRODUCTOS)
  ? window.CH_PRODUCTOS.filter(p=>p.estado!=='Inactivo' && p.categoria!=='Tranqueras - adicionales')
  : [];

const extrasTranquera = [
  {label:'Sin adicional',factor:0},
  {label:'Con diagonal +20%',factor:.20},
  {label:'Corral · 6 tablas 1x4 · alto 1,40 m +30%',factor:.30},
  {label:'Corral · 5 tablas 1x6 · alto 1,40 m +50%',factor:.50},
  {label:'Tranquera ciega +140%',factor:1.40}
];

const EXTRA_DIBUJO_TIRETAS = 77000;
const EXTRA_CUADRADOS_TIRETAS = 106000;

const DRAFT_KEY='chourrout_presupuesto_actual';
const SAVED_KEY='chourrout_presupuestos_guardados';
const CLIENTES_KEY='chourrout_clientes';
const PENDING_ADD_KEY='chourrout_producto_para_agregar';
const ADD_QUEUE_KEY='chourrout_productos_para_agregar';
let items=[];
let itemSeq=1;
let estadoActual='borrador';
let clientes=[];
let clienteSeleccionadoId=null;

const buscar=document.getElementById('buscarProducto');
const resultados=document.getElementById('resultadosProducto');
const contenedor=document.getElementById('itemsPresupuesto');
const ivaGlobal=document.getElementById('ivaGlobal');
const estadoPresupuesto=document.getElementById('estadoPresupuesto');
const buscarCliente=document.getElementById('buscarClientePresupuesto');
const resultadosCliente=document.getElementById('resultadosCliente');
const ayudaCliente=document.getElementById('ayudaCliente');

function dinero(v){
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0,maximumFractionDigits:2}).format(v||0);
}
function descripcion(p){return [p.producto,p.variante,p.medida].filter(Boolean).join(' · ');}
function hoy(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
function leerJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null') ?? fallback;}catch(e){return fallback;}}
function cargarClientes(){const data=leerJson(CLIENTES_KEY,[]);clientes=Array.isArray(data)?data:[];}

function actualizarEstado(){
  if(estadoActual==='definitivo'){
    estadoPresupuesto.textContent='Guardado definitivo';
    estadoPresupuesto.className='budget-status status-final';
  }else{
    estadoPresupuesto.textContent='Borrador';
    estadoPresupuesto.className='budget-status status-draft';
  }
}
function marcarComoBorrador(){
  if(estadoActual!=='borrador'){estadoActual='borrador';actualizarEstado();}
}

function snapshotPresupuesto(estado='borrador'){
  return {
    numero:document.getElementById('numeroPresupuesto').textContent.trim(),
    estado,
    clienteId:clienteSeleccionadoId,
    clienteNombre:document.getElementById('clienteNombre').value,
    clienteCuit:document.getElementById('clienteCuit').value,
    clienteTelefono:document.getElementById('clienteTelefono').value,
    fecha:document.getElementById('fechaPresupuesto').value,
    observaciones:document.getElementById('observaciones').value,
    ivaGlobal:ivaGlobal.value,
    items:items.map(i=>({...i})),
    actualizadoEn:new Date().toISOString()
  };
}
function guardarDraft(){localStorage.setItem(DRAFT_KEY,JSON.stringify(snapshotPresupuesto(estadoActual)));}
function cargarDraft(){
  const draft=leerJson(DRAFT_KEY,null);
  if(draft){
    clienteSeleccionadoId=draft.clienteId||null;
    document.getElementById('clienteNombre').value=draft.clienteNombre||'';
    document.getElementById('clienteCuit').value=draft.clienteCuit||'';
    document.getElementById('clienteTelefono').value=draft.clienteTelefono||'';
    document.getElementById('fechaPresupuesto').value=draft.fecha||hoy();
    document.getElementById('observaciones').value=draft.observaciones||'';
    ivaGlobal.value=draft.ivaGlobal ?? '0';
    items=Array.isArray(draft.items)?draft.items:[];
    items=items.map(i=>({dibujos:Number(i.dibujos||0),cuadrados:Number(i.cuadrados||0),...i}));
    itemSeq=Math.max(1,...items.map(i=>Number(i.uid)||0))+1;
    estadoActual=draft.estado==='definitivo'?'definitivo':'borrador';
  }else{
    document.getElementById('fechaPresupuesto').value=hoy();
    ivaGlobal.value='0';
    estadoActual='borrador';
  }
  actualizarEstado();
  actualizarAyudaCliente();
}

function actualizarAyudaCliente(){
  if(clienteSeleccionadoId){
    const c=clientes.find(x=>x.id===clienteSeleccionadoId);
    ayudaCliente.textContent=c?`Cliente seleccionado: ${c.nombre}`:'Cliente guardado seleccionado.';
  }else{
    ayudaCliente.textContent='Seleccioná un cliente guardado o completá los datos manualmente.';
  }
}

function buscarClientesPresupuesto(){
  cargarClientes();
  const q=buscarCliente.value.trim().toLowerCase();
  if(!q){resultadosCliente.classList.remove('open');resultadosCliente.innerHTML='';return;}
  const lista=clientes.filter(c=>`${c.nombre||''} ${c.cuit||''} ${c.telefono||''} ${c.email||''}`.toLowerCase().includes(q)).slice(0,10);
  if(!lista.length){
    resultadosCliente.innerHTML='<div class="product-option"><div><strong>Sin resultados</strong><small>Podés cargarlo desde Clientes.</small></div></div>';
  }else{
    resultadosCliente.innerHTML=lista.map(c=>`
      <div class="product-option" data-cliente-id="${c.id}">
        <div><strong>${c.nombre}</strong><small>${[c.cuit,c.telefono,c.email].filter(Boolean).join(' · ')||'Sin datos adicionales'}</small></div>
        <div class="product-option-price"><small>Seleccionar</small></div>
      </div>`).join('');
  }
  resultadosCliente.classList.add('open');
  resultadosCliente.querySelectorAll('[data-cliente-id]').forEach(el=>el.addEventListener('click',()=>seleccionarCliente(el.dataset.clienteId)));
}

function seleccionarCliente(id){
  const c=clientes.find(x=>x.id===id);if(!c)return;
  clienteSeleccionadoId=c.id;
  document.getElementById('clienteNombre').value=c.nombre||'';
  document.getElementById('clienteCuit').value=c.cuit||'';
  document.getElementById('clienteTelefono').value=c.telefono||'';
  buscarCliente.value='';
  resultadosCliente.classList.remove('open');
  actualizarAyudaCliente();
  marcarComoBorrador();
  guardarDraft();
}

function nuevoItemDesdeProducto(p,cantidad=1){
  return {uid:itemSeq++,...p,cantidad,precioActual:Number(p.precio)||999,ivaActual:0,extra:0,dibujos:0,cuadrados:0};
}

function sumarProductoImportado(p){
  if(!p||!p.id)return;
  const existente=items.find(i=>i.id===p.id);
  const cantidadAgregar=Number(p.cantidad||1);
  if(existente) existente.cantidad=Number(existente.cantidad||0)+cantidadAgregar;
  else items.push(nuevoItemDesdeProducto(p,cantidadAgregar));
}
function importarProductosPendientes(){
  let huboCambios=false;
  const cola=leerJson(ADD_QUEUE_KEY,[]);
  if(Array.isArray(cola)&&cola.length){cola.forEach(sumarProductoImportado);localStorage.removeItem(ADD_QUEUE_KEY);huboCambios=true;}
  const legado=leerJson(PENDING_ADD_KEY,null);
  if(legado){sumarProductoImportado(legado);localStorage.removeItem(PENDING_ADD_KEY);huboCambios=true;}
  if(huboCambios){marcarComoBorrador();guardarDraft();}
  return huboCambios;
}

function buscarProductos(){
  const q=buscar.value.trim().toLowerCase();
  if(!q){resultados.classList.remove('open');resultados.innerHTML='';return;}
  const lista=catalogo.filter(p=>`${p.id} ${p.categoria} ${p.producto} ${p.variante} ${p.medida}`.toLowerCase().includes(q)).slice(0,12);
  if(!lista.length){
    resultados.innerHTML='<div class="product-option"><div><strong>Sin resultados</strong><small>Probá otra búsqueda.</small></div></div>';
  }else{
    resultados.innerHTML=lista.map(p=>`
      <div class="product-option" data-id="${p.id}">
        <div><strong>${descripcion(p)}</strong><small>${p.id} · ${p.categoria} · ${p.unidad}${p.pendiente?' · Precio pendiente':''}</small></div>
        <div class="product-option-price">${dinero(p.precio)}<small>Sin IVA</small></div>
      </div>`).join('');
  }
  resultados.classList.add('open');
  resultados.querySelectorAll('[data-id]').forEach(el=>el.addEventListener('click',()=>agregar(el.dataset.id)));
}

function agregar(id){
  const p=catalogo.find(x=>x.id===id);if(!p)return;
  const existente=items.find(i=>i.id===id);
  if(existente) existente.cantidad=Number(existente.cantidad||0)+1;
  else items.push(nuevoItemDesdeProducto(p,1));
  buscar.value='';resultados.classList.remove('open');marcarComoBorrador();render();guardarDraft();
}

function calcItem(i){
  const cantidad=Number(i.cantidad)||0;
  const base=cantidad*(Number(i.precioActual)||0)*(1+Number(i.extra||0));
  if(i.tiretas){
    return base + (Number(i.dibujos)||0)*EXTRA_DIBUJO_TIRETAS + (Number(i.cuadrados)||0)*EXTRA_CUADRADOS_TIRETAS;
  }
  return base;
}

function render(){
  if(!items.length){
    contenedor.innerHTML='<div class="empty-state"><strong>Todavía no agregaste productos.</strong><span>Usá el buscador de arriba para comenzar.</span></div>';
  }else{
    contenedor.innerHTML=items.map(i=>`
      <div class="quote-item" data-uid="${i.uid}">
        <div class="quote-item-top">
          <div class="item-name"><strong>${descripcion(i)}</strong><span>${i.id} · ${i.categoria} · ${i.unidad}</span></div>
          <div class="item-mini"><label>Cantidad</label><input class="control js-cantidad" type="number" min="0" step="0.01" value="${i.cantidad}"></div>
          <div class="item-mini"><label>Precio unitario</label><input class="control price-edit ${i.pendiente?'pending-price':''} js-precio" type="number" min="0" step="0.01" value="${i.precioActual}"></div>
          <div class="item-mini"><label>IVA</label><select class="control iva-inline js-iva"><option value="0" ${Number(i.ivaActual)===0?'selected':''}>Sin IVA</option><option value="21" ${Number(i.ivaActual)===21?'selected':''}>21%</option><option value="10.5" ${Number(i.ivaActual)===10.5?'selected':''}>10,5%</option></select></div>
          <div class="item-total"><span>Total neto</span><strong>${dinero(calcItem(i))}</strong></div>
          <button class="remove-item js-remove" title="Quitar">×</button>
        </div>
        ${i.tranquera?`<div class="item-extra"><label>Adicional de tranquera</label><select class="control js-extra">${extrasTranquera.map(e=>`<option value="${e.factor}" ${Number(i.extra)===e.factor?'selected':''}>${e.label}</option>`).join('')}</select></div>`:''}
        ${i.tiretas?`
          <div class="item-extra tiretas-extra">
            <label>Adicionales de tiretas</label>
            <div style="display:grid;grid-template-columns:1fr 110px;gap:8px;width:100%;align-items:center;">
              <span>Dibujo artístico por hoja · ${dinero(EXTRA_DIBUJO_TIRETAS)} c/u</span>
              <input class="control js-dibujos" type="number" min="0" step="1" value="${Number(i.dibujos)||0}" title="Cantidad de hojas con dibujo artístico">
              <span>Cuadrados · ${dinero(EXTRA_CUADRADOS_TIRETAS)} c/u</span>
              <input class="control js-cuadrados" type="number" min="0" step="1" value="${Number(i.cuadrados)||0}" title="Cantidad de cuadrados">
            </div>
          </div>`:''}
        ${i.pendiente?'<div class="pending-line">⚠ Este producto estaba sin precio en el Excel original. El valor $999 es provisorio: podés corregirlo directamente en este presupuesto.</div>':''}
      </div>`).join('');

    contenedor.querySelectorAll('.quote-item').forEach(el=>{
      const uid=Number(el.dataset.uid);const item=items.find(x=>x.uid===uid);
      const refrescarItem=()=>{marcarComoBorrador();actualizarTotalesSinRender();el.querySelector('.item-total strong').textContent=dinero(calcItem(item));guardarDraft();};
      el.querySelector('.js-cantidad').addEventListener('input',e=>{item.cantidad=Number(e.target.value);refrescarItem();});
      el.querySelector('.js-precio').addEventListener('input',e=>{item.precioActual=Number(e.target.value);item.pendiente=item.precioActual===999;refrescarItem();});
      el.querySelector('.js-iva').addEventListener('change',e=>{item.ivaActual=Number(e.target.value);marcarComoBorrador();actualizarTotalesSinRender();guardarDraft();});
      const extra=el.querySelector('.js-extra');
      if(extra)extra.addEventListener('change',e=>{item.extra=Number(e.target.value);refrescarItem();});
      const dibujos=el.querySelector('.js-dibujos');
      if(dibujos)dibujos.addEventListener('input',e=>{item.dibujos=Math.max(0,Number(e.target.value)||0);refrescarItem();});
      const cuadrados=el.querySelector('.js-cuadrados');
      if(cuadrados)cuadrados.addEventListener('input',e=>{item.cuadrados=Math.max(0,Number(e.target.value)||0);refrescarItem();});
      el.querySelector('.js-remove').addEventListener('click',()=>{items=items.filter(x=>x.uid!==uid);marcarComoBorrador();render();guardarDraft();});
    });
  }
  actualizarTotalesSinRender();
}

function actualizarTotalesSinRender(){
  let subtotal=0,iva21=0,iva105=0;const modo=ivaGlobal.value;
  items.forEach(i=>{const neto=calcItem(i);subtotal+=neto;const iva=modo==='individual'?Number(i.ivaActual):Number(modo);if(iva===21)iva21+=neto*.21;if(iva===10.5)iva105+=neto*.105;});
  document.getElementById('subtotal').textContent=dinero(subtotal);
  document.getElementById('iva21').textContent=dinero(iva21);
  document.getElementById('iva105').textContent=dinero(iva105);
  document.getElementById('total').textContent=dinero(subtotal+iva21+iva105);
  document.getElementById('cantidadItems').textContent=`${items.length} ítem${items.length===1?'':'s'}`;
  document.getElementById('warningPendientes').hidden=!items.some(i=>i.pendiente||Number(i.precioActual)===999);
}

function validarParaDefinitivo(){
  if(!items.length){alert('Agregá al menos un producto antes de guardar el presupuesto definitivo.');return false;}
  if(items.some(i=>i.pendiente||Number(i.precioActual)===999)) return confirm('Hay productos con precio pendiente ($999). ¿Querés guardar el presupuesto como definitivo igualmente?');
  return true;
}
function guardarDefinitivo(){
  if(!validarParaDefinitivo())return;
  if(!confirm('¿Guardar este presupuesto como definitivo? Si después hacés cambios, volverá a marcarse como borrador.'))return;
  estadoActual='definitivo';
  const snapshot=snapshotPresupuesto('definitivo');
  let guardados=leerJson(SAVED_KEY,[]);if(!Array.isArray(guardados))guardados=[];
  const idx=guardados.findIndex(p=>p.numero===snapshot.numero);if(idx>=0)guardados[idx]=snapshot;else guardados.push(snapshot);
  localStorage.setItem(SAVED_KEY,JSON.stringify(guardados));
  localStorage.setItem(DRAFT_KEY,JSON.stringify(snapshot));
  actualizarEstado();
  alert('Presupuesto guardado como definitivo.');
}

buscar.addEventListener('input',buscarProductos);
buscarCliente.addEventListener('input',buscarClientesPresupuesto);
document.addEventListener('click',e=>{
  if(!e.target.closest('.product-picker'))resultados.classList.remove('open');
  if(!e.target.closest('.client-picker'))resultadosCliente.classList.remove('open');
});
ivaGlobal.addEventListener('change',()=>{marcarComoBorrador();actualizarTotalesSinRender();guardarDraft();});
['clienteNombre','clienteCuit','clienteTelefono','fechaPresupuesto','observaciones'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{
  if(id==='clienteNombre'||id==='clienteCuit'||id==='clienteTelefono') clienteSeleccionadoId=null;
  actualizarAyudaCliente();
  marcarComoBorrador();
  guardarDraft();
}));
window.addEventListener('storage',e=>{
  if((e.key===ADD_QUEUE_KEY||e.key===PENDING_ADD_KEY)&&e.newValue){if(importarProductosPendientes())render();}
  if(e.key===CLIENTES_KEY){cargarClientes();actualizarAyudaCliente();}
});
window.addEventListener('focus',()=>{cargarClientes();actualizarAyudaCliente();if(importarProductosPendientes())render();});

document.getElementById('guardarBorrador').addEventListener('click',()=>{estadoActual='borrador';actualizarEstado();guardarDraft();alert('Presupuesto guardado como borrador.');});
document.getElementById('guardarDefinitivo').addEventListener('click',guardarDefinitivo);

cargarClientes();
cargarDraft();
importarProductosPendientes();
render();