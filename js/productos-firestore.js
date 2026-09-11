import { db } from './firebase-config.js';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const DRAFT_KEY = 'chourrout_presupuesto_actual';
const ADD_QUEUE_KEY = 'chourrout_productos_para_agregar';
const productosRef = collection(db, 'productos');

const tabla = document.getElementById('tablaProductos');
const buscar = document.getElementById('buscar');
const categoria = document.getElementById('categoria');
const contador = document.getElementById('contadorFilas');
const modal = document.getElementById('modalProducto');
const volverPresupuesto = document.getElementById('volverPresupuesto');
let productos = [];
let editando = null;

function leerJson(key, fallback){
  try{ const value=JSON.parse(localStorage.getItem(key)||'null'); return value ?? fallback; }
  catch(e){ return fallback; }
}

function dinero(valor){
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(valor)||0);
}

function normalizarProducto(p){
  return {
    id:String(p.id||''),
    categoria:String(p.categoria||''),
    producto:String(p.producto||''),
    variante:String(p.variante||''),
    medida:String(p.medida||''),
    unidad:String(p.unidad||'unidad'),
    precio:Number(p.precio)||999,
    iva:p.iva||'Sin IVA',
    estado:p.estado||'Activo',
    observaciones:String(p.observaciones||''),
    pendiente:Boolean(p.pendiente)||Number(p.precio)===999,
    tranquera:Boolean(p.tranquera),
    tiretas:Boolean(p.tiretas)
  };
}

async function importarCatalogoInicialSiHaceFalta(){
  const snap = await getDocs(productosRef);
  if(!snap.empty) return false;

  const origen = Array.isArray(window.CH_PRODUCTOS) ? window.CH_PRODUCTOS : [];
  if(!origen.length) throw new Error('No se encontró el catálogo inicial de productos.');

  const batch = writeBatch(db);
  origen.map(normalizarProducto).forEach(p=>{
    batch.set(doc(db,'productos',p.id),{
      ...p,
      creadoEn:serverTimestamp(),
      actualizadoEn:serverTimestamp()
    });
  });
  batch.set(doc(db,'configuracion','catalogoInicial'),{
    importado:true,
    cantidad:origen.length,
    fecha:serverTimestamp()
  });
  await batch.commit();
  return true;
}

async function cargarProductos(){
  contador.textContent='Cargando productos desde Firebase...';
  try{
    const importado = await importarCatalogoInicialSiHaceFalta();
    const snap = await getDocs(productosRef);
    productos = snap.docs.map(d=>normalizarProducto({...d.data(),id:d.id}))
      .sort((a,b)=>a.id.localeCompare(b.id,'es',{numeric:true}));
    window.CH_PRODUCTOS_FIRESTORE = productos;
    cargarCategorias();
    actualizarEstadisticas();
    actualizarBotonVolver();
    render();
    if(importado) console.info(`Catálogo inicial importado a Firestore: ${productos.length} productos.`);
  }catch(error){
    console.error(error);
    tabla.innerHTML=`<tr><td colspan="9" style="padding:24px;color:#b00020"><strong>No se pudieron cargar los productos.</strong><br>${error.message||error}</td></tr>`;
    contador.textContent='Error al conectar con Firebase';
  }
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
  const valorActual=categoria.value;
  const categorias=[...new Set(productos.map(p=>p.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  categoria.innerHTML='<option value="">Todas las categorías</option>'+categorias.map(c=>`<option>${c}</option>`).join('');
  if(categorias.includes(valorActual)) categoria.value=valorActual;
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
    const estadoClase=p.estado==='Activo'?'badge-ok':'badge-pending';
    tr.innerHTML=`
      <td class="muted">${p.id}</td>
      <td>${p.categoria}</td>
      <td><strong>${p.producto}</strong></td>
      <td>${[p.variante,p.medida].filter(Boolean).join(' · ')||'—'}</td>
      <td>${p.unidad}</td>
      <td class="money">${dinero(p.precio)} ${p.pendiente?'<span class="badge badge-pending">Pendiente</span>':''}</td>
      <td><span class="badge badge-iva">${p.iva||'Sin IVA'}</span></td>
      <td><span class="badge ${estadoClase}">${p.estado}</span></td>
      <td><div class="actions"><button class="icon-btn" data-action="presupuesto" data-id="${p.id}">+ Presupuesto</button><button class="icon-btn" data-action="editar" data-id="${p.id}">Editar</button><button class="icon-btn" data-action="eliminar" data-id="${p.id}">Eliminar</button></div></td>`;
    tabla.appendChild(tr);
  });
  contador.textContent=`Mostrando ${lista.length} de ${productos.length} productos · Firebase`;
}

function filtrar(){
  const q=buscar.value.trim().toLowerCase();
  const c=categoria.value;
  render(productos.filter(p=>{
    const texto=`${p.id} ${p.categoria} ${p.producto} ${p.variante} ${p.medida}`.toLowerCase();
    return (!q||texto.includes(q))&&(!c||p.categoria===c);
  }));
}

function agregarAPresupuesto(id, boton){
  const p=productos.find(x=>x.id===id); if(!p) return;
  const payload={id:p.id,categoria:p.categoria,producto:p.producto,variante:p.variante||'',medida:p.medida||'',unidad:p.unidad,precio:Number(p.precio)||999,iva:0,pendiente:Boolean(p.pendiente),tranquera:Boolean(p.tranquera),tiretas:Boolean(p.tiretas)};
  const cola=leerJson(ADD_QUEUE_KEY,[]);
  const lista=Array.isArray(cola)?cola:[];
  const existente=lista.find(x=>x.id===payload.id);
  if(existente) existente.cantidad=Number(existente.cantidad||1)+1; else lista.push({...payload,cantidad:1});
  localStorage.setItem(ADD_QUEUE_KEY,JSON.stringify(lista));
  actualizarBotonVolver();
  if(boton){const original=boton.textContent;boton.textContent='✓ Agregado';boton.style.borderColor='#111';boton.style.background='#111';boton.style.color='#fff';setTimeout(()=>{boton.textContent=original;boton.removeAttribute('style');},900);}
}

async function eliminarProducto(id){
  const p=productos.find(x=>x.id===id); if(!p) return;
  if(!confirm(`¿Eliminar ${p.producto}${p.medida?` · ${p.medida}`:''} de la lista de productos?\n\nLos presupuestos ya guardados no se modifican.`)) return;
  try{
    await deleteDoc(doc(db,'productos',id));
    productos=productos.filter(x=>x.id!==id);
    cargarCategorias();actualizarEstadisticas();filtrar();
  }catch(error){ alert(`No se pudo eliminar el producto: ${error.message||error}`); }
}

function abrirModal(){modal.classList.add('open');}
function cerrarModal(){modal.classList.remove('open');editando=null;document.querySelectorAll('#modalProducto input').forEach(i=>i.value='');}

function editar(id){
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
}

function nuevoId(){
  const maxId=Math.max(0,...productos.map(p=>Number(String(p.id).replace(/\D/g,''))||0));
  return `P${String(maxId+1).padStart(4,'0')}`;
}

async function guardarProducto(){
  const boton=document.getElementById('guardarProducto');
  const datos={
    categoria:document.getElementById('fCategoria').value.trim(),
    producto:document.getElementById('fProducto').value.trim(),
    variante:document.getElementById('fVariante').value.trim(),
    medida:document.getElementById('fMedida').value.trim(),
    unidad:document.getElementById('fUnidad').value,
    precio:Number(document.getElementById('fPrecio').value||999),
    iva:document.getElementById('fIva').value,
    estado:document.getElementById('fEstado').value,
    observaciones:document.getElementById('fObservaciones').value.trim()
  };
  if(!datos.producto||!datos.categoria){alert('Completá al menos categoría y producto.');return;}
  datos.pendiente=datos.precio===999;
  boton.disabled=true; boton.textContent='Guardando...';
  try{
    if(editando){
      await updateDoc(doc(db,'productos',editando.id),{...datos,actualizadoEn:serverTimestamp()});
      Object.assign(editando,datos);
    }else{
      const id=nuevoId();
      const nuevo={id,...datos,tranquera:datos.categoria.toLowerCase().includes('tranquera'),tiretas:datos.categoria.toLowerCase().includes('tireta')};
      await setDoc(doc(db,'productos',id),{...nuevo,creadoEn:serverTimestamp(),actualizadoEn:serverTimestamp()});
      productos.push(nuevo);
      productos.sort((a,b)=>a.id.localeCompare(b.id,'es',{numeric:true}));
    }
    cerrarModal();cargarCategorias();actualizarEstadisticas();filtrar();
  }catch(error){ alert(`No se pudo guardar el producto: ${error.message||error}`); }
  finally{boton.disabled=false;boton.textContent='Guardar producto';}
}

tabla.addEventListener('click',e=>{
  const boton=e.target.closest('button[data-action]'); if(!boton) return;
  const {action,id}=boton.dataset;
  if(action==='presupuesto') agregarAPresupuesto(id,boton);
  if(action==='editar') editar(id);
  if(action==='eliminar') eliminarProducto(id);
});

document.getElementById('btnNuevo').addEventListener('click',()=>{editando=null;document.getElementById('modalTitulo').textContent='Nuevo producto';document.getElementById('fIva').value='Sin IVA';document.getElementById('fEstado').value='Activo';abrirModal();});
document.getElementById('cerrarModal').addEventListener('click',cerrarModal);
document.getElementById('cancelarModal').addEventListener('click',cerrarModal);
modal.addEventListener('click',e=>{if(e.target===modal) cerrarModal();});
document.getElementById('guardarProducto').addEventListener('click',guardarProducto);
document.getElementById('verPendientes').addEventListener('click',()=>render(productos.filter(p=>p.pendiente||Number(p.precio)===999)));
document.getElementById('mostrarTodos').addEventListener('click',()=>{buscar.value='';categoria.value='';render(productos);});
buscar.addEventListener('input',filtrar);
categoria.addEventListener('change',filtrar);
window.addEventListener('storage',actualizarBotonVolver);
window.addEventListener('focus',actualizarBotonVolver);

cargarProductos();
