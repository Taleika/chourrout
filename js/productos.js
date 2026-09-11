const productos = Array.isArray(window.CH_PRODUCTOS) ? window.CH_PRODUCTOS.map(p=>({...p,iva:'Sin IVA'})) : [];

const DRAFT_KEY = 'chourrout_presupuesto_actual';
const ADD_QUEUE_KEY = 'chourrout_productos_para_agregar';
const tabla = document.getElementById('tablaProductos');
const buscar = document.getElementById('buscar');
const categoria = document.getElementById('categoria');
const contador = document.getElementById('contadorFilas');
const modal = document.getElementById('modalProducto');
const volverPresupuesto = document.getElementById('volverPresupuesto');
let editando = null;

function dinero(valor){
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(valor);
}

function leerJson(key, fallback){
  try{ const value=JSON.parse(localStorage.getItem(key)||'null'); return value ?? fallback; }
  catch(e){ return fallback; }
}

function cantidadItemsActuales(){
  const draft=leerJson(DRAFT_KEY,{});
  const items=Array.isArray(draft.items)?draft.items:[];
  const cola=leerJson(ADD_QUEUE_KEY,[]);
  const ids=new Set(items.map(i=>i.id).filter(Boolean));
  if(Array.isArray(cola)) cola.forEach(p=>{if(p&&p.id) ids.add(p.id);});
  return ids.size;
}

function actualizarBotonVolver(){
  const cantidad=cantidadItemsActuales();
  volverPresupuesto.textContent=cantidad?`← Volver al presupuesto actual (${cantidad} ítem${cantidad===1?'':'s'})`:'← Volver al presupuesto actual';
}

function cargarCategorias(){
  const categorias=[...new Set(productos.map(p=>p.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  categoria.innerHTML='<option value="">Todas las categorías</option>'+categorias.map(c=>`<option>${c}</option>`).join('');
}

function actualizarEstadisticas(){
  const pendientes=productos.filter(p=>p.pendiente||Number(p.precio)===999).length;
  document.getElementById('totalProductos').textContent=productos.length;
  document.getElementById('totalPendientes').textContent=pendientes;
  document.getElementById('noticePendientes').textContent=pendientes;
}

function render(lista=productos){
  tabla.innerHTML='';
  lista.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td class="muted">${p.id}</td>
      <td>${p.categoria}</td>
      <td><strong>${p.producto}</strong></td>
      <td>${[p.variante,p.medida].filter(Boolean).join(' · ')||'—'}</td>
      <td>${p.unidad}</td>
      <td class="money">${dinero(p.precio)} ${p.pendiente?'<span class="badge badge-pending">Pendiente</span>':''}</td>
      <td><span class="badge badge-iva">${p.iva||'Sin IVA'}</span></td>
      <td><span class="badge badge-ok">${p.estado}</span></td>
      <td><div class="actions"><button class="icon-btn" onclick="agregarAPresupuesto('${p.id}')">+ Presupuesto</button><button class="icon-btn" onclick="editar('${p.id}')">Editar</button></div></td>`;
    tabla.appendChild(tr);
  });
  contador.textContent=`Mostrando ${lista.length} de ${productos.length} productos`;
}

function filtrar(){
  const q=buscar.value.trim().toLowerCase();
  const c=categoria.value;
  render(productos.filter(p=>{
    const texto=`${p.id} ${p.categoria} ${p.producto} ${p.variante} ${p.medida}`.toLowerCase();
    return (!q||texto.includes(q))&&(!c||p.categoria===c);
  }));
}

window.agregarAPresupuesto=function(id){
  const p=productos.find(x=>x.id===id); if(!p) return;
  const payload={id:p.id,categoria:p.categoria,producto:p.producto,variante:p.variante||'',medida:p.medida||'',unidad:p.unidad,precio:Number(p.precio)||999,iva:0,pendiente:Boolean(p.pendiente),tranquera:Boolean(p.tranquera)};
  const cola=leerJson(ADD_QUEUE_KEY,[]);
  const lista=Array.isArray(cola)?cola:[];
  const existente=lista.find(x=>x.id===payload.id);
  if(existente) existente.cantidad=Number(existente.cantidad||1)+1; else lista.push({...payload,cantidad:1});
  localStorage.setItem(ADD_QUEUE_KEY,JSON.stringify(lista));
  actualizarBotonVolver();
  const boton=[...document.querySelectorAll('.icon-btn')].find(b=>b.getAttribute('onclick')===`agregarAPresupuesto('${p.id}')`);
  if(boton){const original=boton.textContent;boton.textContent='✓ Agregado';boton.style.borderColor='#111';boton.style.background='#111';boton.style.color='#fff';setTimeout(()=>{boton.textContent=original;boton.removeAttribute('style');},900);}
};

function abrirModal(){modal.classList.add('open');}
function cerrarModal(){modal.classList.remove('open');editando=null;document.querySelectorAll('#modalProducto input').forEach(i=>i.value='');}

window.editar=function(id){
  const p=productos.find(x=>x.id===id); if(!p) return;
  editando=p;
  document.getElementById('modalTitulo').textContent=`Editar ${p.id}`;
  document.getElementById('fCategoria').value=p.categoria;
  document.getElementById('fProducto').value=p.producto;
  document.getElementById('fVariante').value=p.variante||'';
  document.getElementById('fMedida').value=p.medida||'';
  document.getElementById('fUnidad').value=p.unidad;
  document.getElementById('fPrecio').value=p.precio;
  document.getElementById('fIva').value=p.iva||'Sin IVA';
  document.getElementById('fEstado').value=p.estado;
  document.getElementById('fObservaciones').value=p.observaciones||'';
  abrirModal();
};

document.getElementById('btnNuevo').addEventListener('click',()=>{editando=null;document.getElementById('modalTitulo').textContent='Nuevo producto';document.getElementById('fIva').value='Sin IVA';abrirModal();});
document.getElementById('cerrarModal').addEventListener('click',cerrarModal);
document.getElementById('cancelarModal').addEventListener('click',cerrarModal);
modal.addEventListener('click',e=>{if(e.target===modal) cerrarModal();});

document.getElementById('guardarProducto').addEventListener('click',()=>{
  const datos={
    categoria:document.getElementById('fCategoria').value.trim(),producto:document.getElementById('fProducto').value.trim(),variante:document.getElementById('fVariante').value.trim(),medida:document.getElementById('fMedida').value.trim(),unidad:document.getElementById('fUnidad').value,precio:Number(document.getElementById('fPrecio').value||999),iva:document.getElementById('fIva').value,estado:document.getElementById('fEstado').value,observaciones:document.getElementById('fObservaciones').value.trim()
  };
  if(!datos.producto||!datos.categoria){alert('Completá al menos categoría y producto.');return;}
  datos.pendiente=datos.precio===999;
  if(editando) Object.assign(editando,datos);
  else {const maxId=Math.max(0,...productos.map(p=>Number(String(p.id).replace(/\D/g,''))||0));productos.push({id:`P${String(maxId+1).padStart(4,'0')}`,...datos,tranquera:datos.categoria.toLowerCase().includes('tranquera')});}
  cerrarModal();cargarCategorias();actualizarEstadisticas();filtrar();
});

document.getElementById('verPendientes').addEventListener('click',()=>render(productos.filter(p=>p.pendiente||Number(p.precio)===999)));
document.getElementById('mostrarTodos').addEventListener('click',()=>{buscar.value='';categoria.value='';render(productos);});
buscar.addEventListener('input',filtrar);
categoria.addEventListener('change',filtrar);
window.addEventListener('storage',actualizarBotonVolver);
window.addEventListener('focus',actualizarBotonVolver);

cargarCategorias();
actualizarEstadisticas();
actualizarBotonVolver();
render();
