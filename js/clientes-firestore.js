import { db } from './firebase-config.js';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const CLIENTES_KEY='chourrout_clientes';
const clientesRef=collection(db,'clientes');
let clientes=[];
let editandoId=null;

const tabla=document.getElementById('tablaClientes');
const modal=document.getElementById('modalCliente');
const buscar=document.getElementById('buscarCliente');
const contador=document.getElementById('contadorClientes');

function leerLocal(){try{return JSON.parse(localStorage.getItem(CLIENTES_KEY)||'[]')||[];}catch(e){return[];}}
function guardarCache(){localStorage.setItem(CLIENTES_KEY,JSON.stringify(clientes));}
function nuevoId(){return `C${String(Date.now()).slice(-8)}`;}

async function migrarLocalesSiHaceFalta(){
  const snap=await getDocs(clientesRef);
  if(!snap.empty)return snap;
  const locales=leerLocal();
  if(!locales.length)return snap;
  for(const c of locales){
    await setDoc(doc(db,'clientes',c.id||nuevoId()),{...c,actualizadoEn:serverTimestamp()},{merge:true});
  }
  return getDocs(clientesRef);
}

function render(lista=clientes){
  tabla.innerHTML='';
  if(!lista.length)tabla.innerHTML='<tr><td colspan="5" class="muted">Todavía no hay clientes cargados.</td></tr>';
  lista.forEach(c=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${c.nombre||''}</strong></td><td>${c.cuit||'—'}</td><td>${c.telefono||'—'}</td><td>${c.email||'—'}</td><td><div class="actions"><button class="icon-btn" data-action="editar" data-id="${c.id}">Editar</button><button class="icon-btn" data-action="eliminar" data-id="${c.id}">Eliminar</button></div></td>`;
    tabla.appendChild(tr);
  });
  contador.textContent=`${lista.length} cliente${lista.length===1?'':'s'} · Firebase`;
}
function filtrar(){const q=buscar.value.toLowerCase().trim();render(clientes.filter(c=>`${c.nombre||''} ${c.cuit||''} ${c.telefono||''} ${c.email||''}`.toLowerCase().includes(q)));}
function abrir(){modal.classList.add('open');}
function cerrar(){modal.classList.remove('open');editandoId=null;['cNombre','cCuit','cTelefono','cEmail','cObservaciones'].forEach(id=>document.getElementById(id).value='');}

function editarCliente(id){const c=clientes.find(x=>x.id===id);if(!c)return;editandoId=id;document.getElementById('tituloCliente').textContent='Editar cliente';document.getElementById('cNombre').value=c.nombre||'';document.getElementById('cCuit').value=c.cuit||'';document.getElementById('cTelefono').value=c.telefono||'';document.getElementById('cEmail').value=c.email||'';document.getElementById('cObservaciones').value=c.observaciones||'';abrir();}
async function eliminarCliente(id){const c=clientes.find(x=>x.id===id);if(!c)return;if(!confirm(`¿Eliminar a ${c.nombre}?`))return;await deleteDoc(doc(db,'clientes',id));clientes=clientes.filter(x=>x.id!==id);guardarCache();filtrar();}

async function guardarCliente(){
  const nombre=document.getElementById('cNombre').value.trim();
  if(!nombre){alert('Ingresá el nombre o razón social.');return;}
  const datos={nombre,cuit:document.getElementById('cCuit').value.trim(),telefono:document.getElementById('cTelefono').value.trim(),email:document.getElementById('cEmail').value.trim(),observaciones:document.getElementById('cObservaciones').value.trim()};
  const id=editandoId||nuevoId();
  await setDoc(doc(db,'clientes',id),{id,...datos,actualizadoEn:serverTimestamp()},{merge:true});
  const existente=clientes.find(x=>x.id===id);if(existente)Object.assign(existente,datos);else clientes.push({id,...datos});
  clientes.sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
  guardarCache();cerrar();filtrar();
}

async function iniciar(){
  contador.textContent='Cargando clientes desde Firebase...';
  try{
    const snap=await migrarLocalesSiHaceFalta();
    clientes=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
    guardarCache();render();
  }catch(error){console.error(error);clientes=leerLocal();render();contador.textContent=`${clientes.length} clientes · copia local`;}
}

tabla.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;if(b.dataset.action==='editar')editarCliente(b.dataset.id);if(b.dataset.action==='eliminar')eliminarCliente(b.dataset.id);});
document.getElementById('nuevoCliente').addEventListener('click',()=>{editandoId=null;document.getElementById('tituloCliente').textContent='Nuevo cliente';abrir();});
document.getElementById('cerrarCliente').addEventListener('click',cerrar);
document.getElementById('cancelarCliente').addEventListener('click',cerrar);
modal.addEventListener('click',e=>{if(e.target===modal)cerrar();});
document.getElementById('guardarCliente').addEventListener('click',()=>guardarCliente().catch(e=>alert(`No se pudo guardar el cliente: ${e.message||e}`)));
buscar.addEventListener('input',filtrar);
document.getElementById('mostrarTodos').addEventListener('click',()=>{buscar.value='';render(clientes);});

iniciar();
