import { db } from './firebase-config.js';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const CLIENTES_KEY='chourrout_clientes';
const clientesRef=collection(db,'clientes');
let clientes=[];
let presupuestos=[];
let editandoId=null;

const tabla=document.getElementById('tablaClientes');
const modal=document.getElementById('modalCliente');
const buscar=document.getElementById('buscarCliente');
const contador=document.getElementById('contadorClientes');

function leerLocal(){try{return JSON.parse(localStorage.getItem(CLIENTES_KEY)||'[]')||[];}catch(e){return[];}}
function guardarCache(){localStorage.setItem(CLIENTES_KEY,JSON.stringify(clientes));}
function nuevoId(){return `C${String(Date.now()).slice(-8)}`;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function cantidadPresupuestos(cliente){
  return presupuestos.filter(p=>p.clienteId===cliente.id || (!p.clienteId && cliente.cuit && p.clienteCuit===cliente.cuit)).length;
}
function ultimoPresupuesto(cliente){
  const lista=presupuestos.filter(p=>p.clienteId===cliente.id || (!p.clienteId && cliente.cuit && p.clienteCuit===cliente.cuit));
  lista.sort((a,b)=>String(b.actualizadoEn||b.fecha||'').localeCompare(String(a.actualizadoEn||a.fecha||'')));
  return lista[0]||null;
}
function fechaAR(value){
  if(!value)return '—';
  const [y,m,d]=String(value).split('-');
  return y&&m&&d?`${d}/${m}/${y}`:String(value);
}

async function migrarLocalesSiHaceFalta(){
  const snap=await getDocs(clientesRef);
  if(!snap.empty)return snap;
  const locales=leerLocal();
  if(!locales.length)return snap;
  for(const c of locales){
    const id=c.id||nuevoId();
    await setDoc(doc(db,'clientes',id),{...c,id,creadoEn:serverTimestamp(),actualizadoEn:serverTimestamp()},{merge:true});
  }
  return getDocs(clientesRef);
}

function render(lista=clientes){
  tabla.innerHTML='';
  if(!lista.length)tabla.innerHTML='<tr><td colspan="5" class="muted">Todavía no hay clientes cargados.</td></tr>';
  lista.forEach(c=>{
    const cant=cantidadPresupuestos(c);
    const ultimo=ultimoPresupuesto(c);
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>
        <strong>${esc(c.nombre||'')}</strong>
        ${ultimo?`<div class="muted" style="font-size:12px;margin-top:4px">${cant} presupuesto${cant===1?'':'s'} · último ${esc(fechaAR(ultimo.fecha))}</div>`:'<div class="muted" style="font-size:12px;margin-top:4px">Sin presupuestos</div>'}
      </td>
      <td>${esc(c.cuit||'—')}</td>
      <td>${esc(c.telefono||'—')}</td>
      <td>${esc(c.email||'—')}</td>
      <td><div class="actions">
        ${cant?`<button class="icon-btn" data-action="presupuestos" data-id="${esc(c.id)}">Presupuestos (${cant})</button>`:''}
        <button class="icon-btn" data-action="editar" data-id="${esc(c.id)}">Editar</button>
        <button class="icon-btn" data-action="eliminar" data-id="${esc(c.id)}">Eliminar</button>
      </div></td>`;
    tabla.appendChild(tr);
  });
  contador.textContent=`${lista.length} cliente${lista.length===1?'':'s'} · Firebase`;
}

function filtrar(){
  const q=buscar.value.toLowerCase().trim();
  render(clientes.filter(c=>`${c.nombre||''} ${c.cuit||''} ${c.telefono||''} ${c.email||''}`.toLowerCase().includes(q)));
}
function abrir(){modal.classList.add('open');}
function cerrar(){modal.classList.remove('open');editandoId=null;['cNombre','cCuit','cTelefono','cEmail','cObservaciones'].forEach(id=>document.getElementById(id).value='');}

function editarCliente(id){
  const c=clientes.find(x=>x.id===id);if(!c)return;
  editandoId=id;
  document.getElementById('tituloCliente').textContent='Editar cliente';
  document.getElementById('cNombre').value=c.nombre||'';
  document.getElementById('cCuit').value=c.cuit||'';
  document.getElementById('cTelefono').value=c.telefono||'';
  document.getElementById('cEmail').value=c.email||'';
  document.getElementById('cObservaciones').value=c.observaciones||'';
  abrir();
}

function verPresupuestos(id){
  const c=clientes.find(x=>x.id===id);if(!c)return;
  const q=encodeURIComponent(c.cuit||c.nombre||'');
  location.href=`../presupuestos/historial.html?q=${q}`;
}

async function eliminarCliente(id){
  const c=clientes.find(x=>x.id===id);if(!c)return;
  const cant=cantidadPresupuestos(c);
  const detalle=cant?`\n\nTiene ${cant} presupuesto${cant===1?'':'s'} asociado${cant===1?'':'s'}. Los presupuestos NO se borrarán y conservarán los datos históricos del cliente.`:'';
  if(!confirm(`¿Eliminar a ${c.nombre} de la lista de clientes?${detalle}`))return;
  await deleteDoc(doc(db,'clientes',id));
  clientes=clientes.filter(x=>x.id!==id);
  guardarCache();
  filtrar();
}

async function guardarCliente(){
  const nombre=document.getElementById('cNombre').value.trim();
  if(!nombre){alert('Ingresá el nombre o razón social.');return;}
  const datos={
    nombre,
    cuit:document.getElementById('cCuit').value.trim(),
    telefono:document.getElementById('cTelefono').value.trim(),
    email:document.getElementById('cEmail').value.trim(),
    observaciones:document.getElementById('cObservaciones').value.trim()
  };
  const id=editandoId||nuevoId();
  const payload={id,...datos,actualizadoEn:serverTimestamp()};
  if(!editandoId)payload.creadoEn=serverTimestamp();
  await setDoc(doc(db,'clientes',id),payload,{merge:true});
  const existente=clientes.find(x=>x.id===id);
  if(existente)Object.assign(existente,datos);else clientes.push({id,...datos});
  clientes.sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
  guardarCache();cerrar();filtrar();
}

async function iniciar(){
  contador.textContent='Cargando clientes desde Firebase...';
  try{
    const [snapClientes,snapPresupuestos]=await Promise.all([
      migrarLocalesSiHaceFalta(),
      getDocs(collection(db,'presupuestos'))
    ]);
    clientes=snapClientes.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
    presupuestos=snapPresupuestos.docs.map(d=>({id:d.id,...d.data()}));
    guardarCache();render();
  }catch(error){
    console.error(error);
    clientes=leerLocal();render();contador.textContent=`${clientes.length} clientes · copia local`;
  }
}

tabla.addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');if(!b)return;
  if(b.dataset.action==='presupuestos')verPresupuestos(b.dataset.id);
  if(b.dataset.action==='editar')editarCliente(b.dataset.id);
  if(b.dataset.action==='eliminar')eliminarCliente(b.dataset.id).catch(err=>alert(`No se pudo eliminar el cliente: ${err.message||err}`));
});
document.getElementById('nuevoCliente').addEventListener('click',()=>{editandoId=null;document.getElementById('tituloCliente').textContent='Nuevo cliente';abrir();});
document.getElementById('cerrarCliente').addEventListener('click',cerrar);
document.getElementById('cancelarCliente').addEventListener('click',cerrar);
modal.addEventListener('click',e=>{if(e.target===modal)cerrar();});
document.getElementById('guardarCliente').addEventListener('click',()=>guardarCliente().catch(e=>alert(`No se pudo guardar el cliente: ${e.message||e}`)));
buscar.addEventListener('input',filtrar);
document.getElementById('mostrarTodos').addEventListener('click',()=>{buscar.value='';render(clientes);});

iniciar();
