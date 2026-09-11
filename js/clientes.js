const CLIENTES_KEY='chourrout_clientes';
let clientes=[];
let editandoId=null;

function leer(){try{return JSON.parse(localStorage.getItem(CLIENTES_KEY)||'[]')||[];}catch(e){return[];}}
function guardar(){localStorage.setItem(CLIENTES_KEY,JSON.stringify(clientes));}
function nuevoId(){return `C${String(Date.now()).slice(-8)}`;}

const tabla=document.getElementById('tablaClientes');
const modal=document.getElementById('modalCliente');
const buscar=document.getElementById('buscarCliente');

function render(lista=clientes){
  tabla.innerHTML='';
  if(!lista.length){tabla.innerHTML='<tr><td colspan="5" class="muted">Todavía no hay clientes cargados.</td></tr>';}
  lista.forEach(c=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${c.nombre}</strong></td><td>${c.cuit||'—'}</td><td>${c.telefono||'—'}</td><td>${c.email||'—'}</td><td><div class="actions"><button class="icon-btn" onclick="editarCliente('${c.id}')">Editar</button><button class="icon-btn" onclick="eliminarCliente('${c.id}')">Eliminar</button></div></td>`;
    tabla.appendChild(tr);
  });
  document.getElementById('contadorClientes').textContent=`${lista.length} cliente${lista.length===1?'':'s'}`;
}
function filtrar(){const q=buscar.value.toLowerCase().trim();render(clientes.filter(c=>`${c.nombre} ${c.cuit} ${c.telefono} ${c.email}`.toLowerCase().includes(q)));}
function abrir(){modal.classList.add('open');}
function cerrar(){modal.classList.remove('open');editandoId=null;['cNombre','cCuit','cTelefono','cEmail','cObservaciones'].forEach(id=>document.getElementById(id).value='');}

window.editarCliente=id=>{const c=clientes.find(x=>x.id===id);if(!c)return;editandoId=id;document.getElementById('tituloCliente').textContent='Editar cliente';document.getElementById('cNombre').value=c.nombre||'';document.getElementById('cCuit').value=c.cuit||'';document.getElementById('cTelefono').value=c.telefono||'';document.getElementById('cEmail').value=c.email||'';document.getElementById('cObservaciones').value=c.observaciones||'';abrir();};
window.eliminarCliente=id=>{const c=clientes.find(x=>x.id===id);if(!c)return;if(!confirm(`¿Eliminar a ${c.nombre}?`))return;clientes=clientes.filter(x=>x.id!==id);guardar();filtrar();};

document.getElementById('nuevoCliente').addEventListener('click',()=>{document.getElementById('tituloCliente').textContent='Nuevo cliente';abrir();});
document.getElementById('cerrarCliente').addEventListener('click',cerrar);
document.getElementById('cancelarCliente').addEventListener('click',cerrar);
modal.addEventListener('click',e=>{if(e.target===modal)cerrar();});
document.getElementById('guardarCliente').addEventListener('click',()=>{
  const nombre=document.getElementById('cNombre').value.trim();
  if(!nombre){alert('Ingresá el nombre o razón social.');return;}
  const datos={nombre,cuit:document.getElementById('cCuit').value.trim(),telefono:document.getElementById('cTelefono').value.trim(),email:document.getElementById('cEmail').value.trim(),observaciones:document.getElementById('cObservaciones').value.trim()};
  if(editandoId){Object.assign(clientes.find(x=>x.id===editandoId),datos);}else{clientes.push({id:nuevoId(),...datos});}
  guardar();cerrar();filtrar();
});
buscar.addEventListener('input',filtrar);
document.getElementById('mostrarTodos').addEventListener('click',()=>{buscar.value='';render(clientes);});
clientes=leer();render();