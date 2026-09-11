const productos = [
  {id:'P0002',categoria:'Postes de quebracho',producto:'Entero',variante:'Colorado',medida:'2,20 m',unidad:'unidad',precio:49900,iva:'Por definir',estado:'Activo',pendiente:false},
  {id:'P0014',categoria:'Postes de eucaliptus',producto:'Poste de eucaliptus',variante:'',medida:'1,80 m',unidad:'unidad',precio:999,iva:'Por definir',estado:'Activo',pendiente:true},
  {id:'P0044',categoria:'Varillas de curupay',producto:'Varilla de curupay',variante:'',medida:'1 1/2 x 2 x 1,20 m',unidad:'unidad',precio:2560,iva:'21%',estado:'Activo',pendiente:false},
  {id:'P0045',categoria:'Varillas de curupay',producto:'Varilla de curupay',variante:'',medida:'1 1/2 x 2 x 1,40 m',unidad:'unidad',precio:3170,iva:'21%',estado:'Activo',pendiente:false},
  {id:'P0049',categoria:'Tablas de curupay',producto:'Tabla de curupay',variante:'',medida:'1 x 4',unidad:'metro lineal',precio:7680,iva:'10,5%',estado:'Activo',pendiente:false},
  {id:'P0066',categoria:'Tranqueras',producto:'Tranquera',variante:'Curupay',medida:'4,00 m',unidad:'unidad',precio:373000,iva:'21%',estado:'Activo',pendiente:false,tranquera:true},
  {id:'P0067',categoria:'Tranqueras',producto:'Tranquera',variante:'Rostrata',medida:'4,00 m',unidad:'unidad',precio:260000,iva:'21%',estado:'Activo',pendiente:false,tranquera:true},
  {id:'P0118',categoria:'Alambres',producto:'Acindar 17/15',variante:'',medida:'',unidad:'rollo',precio:999,iva:'Por definir',estado:'Activo',pendiente:true}
];

const PENDING_ADD_KEY = 'chourrout_producto_para_agregar';
const tabla = document.getElementById('tablaProductos');
const buscar = document.getElementById('buscar');
const categoria = document.getElementById('categoria');
const contador = document.getElementById('contadorFilas');
const modal = document.getElementById('modalProducto');
let editando = null;

function dinero(valor){
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(valor);
}

function ivaNumero(iva){
  if(iva==='21%') return 21;
  if(iva==='10,5%') return 10.5;
  return 0;
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
    iva:ivaNumero(p.iva),
    pendiente:Boolean(p.pendiente),
    tranquera:Boolean(p.tranquera)
  };
  localStorage.setItem(PENDING_ADD_KEY,JSON.stringify(payload));
  alert(`${p.producto}${p.medida?' · '+p.medida:''} fue agregado al presupuesto actual. Podés seguir seleccionando productos o volver a la pestaña del presupuesto.`);
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

render();
