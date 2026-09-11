const productos = [
  {id:'P0002',categoria:'Postes de quebracho',producto:'Entero',variante:'Colorado',medida:'2,20 m',unidad:'unidad',precio:49900,iva:'Sin IVA',estado:'Activo',pendiente:false},
  {id:'P0014',categoria:'Postes de eucaliptus',producto:'Poste de eucaliptus',variante:'',medida:'1,80 m',unidad:'unidad',precio:999,iva:'Sin IVA',estado:'Activo',pendiente:true},
  {id:'P0044',categoria:'Varillas de curupay',producto:'Varilla de curupay',variante:'',medida:'1 1/2 x 2 x 1,20 m',unidad:'unidad',precio:2560,iva:'Sin IVA',estado:'Activo',pendiente:false},
  {id:'P0045',categoria:'Varillas de curupay',producto:'Varilla de curupay',variante:'',medida:'1 1/2 x 2 x 1,40 m',unidad:'unidad',precio:3170,iva:'Sin IVA',estado:'Activo',pendiente:false},
  {id:'P0049',categoria:'Tablas de curupay',producto:'Tabla de curupay',variante:'',medida:'1 x 4',unidad:'metro lineal',precio:7680,iva:'Sin IVA',estado:'Activo',pendiente:false},
  {id:'P0066',categoria:'Tranqueras',producto:'Tranquera',variante:'Curupay',medida:'4,00 m',unidad:'unidad',precio:373000,iva:'Sin IVA',estado:'Activo',pendiente:false,tranquera:true},
  {id:'P0067',categoria:'Tranqueras',producto:'Tranquera',variante:'Rostrata',medida:'4,00 m',unidad:'unidad',precio:260000,iva:'Sin IVA',estado:'Activo',pendiente:false,tranquera:true},
  {id:'P0118',categoria:'Alambres',producto:'Acindar 17/15',variante:'',medida:'',unidad:'rollo',precio:999,iva:'Sin IVA',estado:'Activo',pendiente:true}
];

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

function ivaNumero(iva){
  if(iva==='21%') return 21;
  if(iva==='10,5%') return 10.5;
  return 0;
}

function leerJson(key, fallback){
  try{
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  }catch(e){
    return fallback;
  }
}

function cantidadItemsActuales(){
  const draft = leerJson(DRAFT_KEY, {});
  const items = Array.isArray(draft.items) ? draft.items : [];
  const cola = leerJson(ADD_QUEUE_KEY, []);
  const ids = new Set(items.map(i=>i.id).filter(Boolean));
  if(Array.isArray(cola)) cola.forEach(p=>{ if(p && p.id) ids.add(p.id); });
  return ids.size;
}

function actualizarBotonVolver(){
  const cantidad = cantidadItemsActuales();
  volverPresupuesto.textContent = cantidad
    ? `← Volver al presupuesto actual (${cantidad} ítem${cantidad===1?'':'s'})`
    : '← Volver al presupuesto actual';
}

function render(lista = productos){
  tabla.innerHTML = '';
  lista.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="muted">${p.id}</td>
      <td>${p.categoria}</td>
      <td><strong>${p.producto}</strong></td>
      <td>${[p.variante,p.medida].filter(Boolean).join(' · ') || '—'}</td>
      <td>${p.unidad}</td>
      <td class="money">${dinero(p.precio)} ${p.pendiente ? '<span class="badge badge-pending">Pendiente</span>' : ''}</td>
      <td><span class="badge badge-iva">${p.iva}</span></td>
      <td><span class="badge badge-ok">${p.estado}</span></td>
      <td><div class="actions"><button class="icon-btn" onclick="agregarAPresupuesto('${p.id}')">+ Presupuesto</button><button class="icon-btn" onclick="editar('${p.id}')">Editar</button></div></td>
    `;
    tabla.appendChild(tr);
  });
  contador.textContent = `Mostrando ${lista.length} producto${lista.length === 1 ? '' : 's'} de ejemplo`;
}

function filtrar(){
  const q = buscar.value.trim().toLowerCase();
  const c = categoria.value;
  const lista = productos.filter(p => {
    const texto = `${p.id} ${p.categoria} ${p.producto} ${p.variante} ${p.medida}`.toLowerCase();
    return (!q || texto.includes(q)) && (!c || p.categoria === c);
  });
  render(lista);
}

window.agregarAPresupuesto = function(id){
  const p=productos.find(x=>x.id===id);
  if(!p) return;

  const payload={
    id:p.id,
    categoria:p.categoria,
    producto:p.producto,
    variante:p.variante||'',
    medida:p.medida||'',
    unidad:p.unidad,
    precio:Number(p.precio)||999,
    iva:0,
    pendiente:Boolean(p.pendiente),
    tranquera:Boolean(p.tranquera)
  };

  const cola = leerJson(ADD_QUEUE_KEY, []);
  const lista = Array.isArray(cola) ? cola : [];
  const existente = lista.find(x=>x.id===payload.id);
  if(existente) existente.cantidad = Number(existente.cantidad||1) + 1;
  else lista.push({...payload,cantidad:1});
  localStorage.setItem(ADD_QUEUE_KEY,JSON.stringify(lista));
  actualizarBotonVolver();

  const boton = [...document.querySelectorAll('.icon-btn')].find(b=>b.getAttribute('onclick')===`agregarAPresupuesto('${p.id}')`);
  if(boton){
    const original = boton.textContent;
    boton.textContent = '✓ Agregado';
    boton.style.borderColor = '#111';
    boton.style.background = '#111';
    boton.style.color = '#fff';
    setTimeout(()=>{boton.textContent=original;boton.removeAttribute('style');},900);
  }
}

function abrirModal(){ modal.classList.add('open'); }
function cerrarModal(){ modal.classList.remove('open'); editando = null; document.querySelectorAll('#modalProducto input').forEach(i=>i.value=''); }

window.editar = function(id){
  const p = productos.find(x=>x.id===id);
  if(!p) return;
  editando = p;
  document.getElementById('modalTitulo').textContent = `Editar ${p.id}`;
  document.getElementById('fCategoria').value = p.categoria;
  document.getElementById('fProducto').value = p.producto;
  document.getElementById('fVariante').value = p.variante;
  document.getElementById('fMedida').value = p.medida;
  document.getElementById('fUnidad').value = p.unidad;
  document.getElementById('fPrecio').value = p.precio;
  document.getElementById('fIva').value = p.iva;
  document.getElementById('fEstado').value = p.estado;
  abrirModal();
}

document.getElementById('btnNuevo').addEventListener('click',()=>{
  editando = null;
  document.getElementById('modalTitulo').textContent = 'Nuevo producto';
  document.getElementById('fIva').value = 'Sin IVA';
  abrirModal();
});
document.getElementById('cerrarModal').addEventListener('click',cerrarModal);
document.getElementById('cancelarModal').addEventListener('click',cerrarModal);
modal.addEventListener('click',e=>{ if(e.target===modal) cerrarModal(); });

document.getElementById('guardarProducto').addEventListener('click',()=>{
  const datos = {
    categoria:document.getElementById('fCategoria').value.trim(),
    producto:document.getElementById('fProducto').value.trim(),
    variante:document.getElementById('fVariante').value.trim(),
    medida:document.getElementById('fMedida').value.trim(),
    unidad:document.getElementById('fUnidad').value,
    precio:Number(document.getElementById('fPrecio').value || 999),
    iva:document.getElementById('fIva').value,
    estado:document.getElementById('fEstado').value
  };
  if(!datos.producto || !datos.categoria){ alert('Completá al menos categoría y producto.'); return; }
  datos.pendiente = datos.precio === 999;
  if(editando){ Object.assign(editando,datos); }
  else {
    const nro = String(productos.length + 129).padStart(4,'0');
    productos.push({id:`P${nro}`,...datos});
  }
  cerrarModal();
  filtrar();
});

document.getElementById('verPendientes').addEventListener('click',()=>render(productos.filter(p=>p.pendiente)));
document.getElementById('mostrarTodos').addEventListener('click',()=>{buscar.value='';categoria.value='';render(productos);});
buscar.addEventListener('input',filtrar);
categoria.addEventListener('change',filtrar);
window.addEventListener('storage',actualizarBotonVolver);
window.addEventListener('focus',actualizarBotonVolver);

actualizarBotonVolver();
render();
