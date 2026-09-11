import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

function descargar(nombre,contenido,tipo='application/json;charset=utf-8'){
  const blob=new Blob([contenido],{type:tipo});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=nombre;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function fechaArchivo(){return new Date().toISOString().slice(0,10);}
function plano(v){
  if(v&&typeof v.toDate==='function')return v.toDate().toISOString();
  if(Array.isArray(v))return v.map(plano);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,val])=>[k,plano(val)]));
  return v;
}
function csvEscape(v){
  const s=String(v??'');
  return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}
async function leerColeccion(nombre){
  const snap=await getDocs(collection(db,nombre));
  return snap.docs.map(d=>plano({id:d.id,...d.data()}));
}

async function exportarJson(){
  const boton=document.getElementById('exportarJson');
  const estado=document.getElementById('estadoRespaldo');
  boton.disabled=true;boton.textContent='Generando...';estado.textContent='Leyendo Firebase...';
  try{
    const [productos,clientes,presupuestos,configSnap]=await Promise.all([
      leerColeccion('productos'),leerColeccion('clientes'),leerColeccion('presupuestos'),getDoc(doc(db,'configuracion','general'))
    ]);
    const payload={
      generadoEn:new Date().toISOString(),
      productos,clientes,presupuestos,
      configuracion:configSnap.exists()?plano(configSnap.data()):null
    };
    descargar(`chourrout-respaldo-${fechaArchivo()}.json`,JSON.stringify(payload,null,2));
    estado.textContent=`✓ Respaldo generado: ${productos.length} productos, ${clientes.length} clientes y ${presupuestos.length} presupuestos.`;
  }catch(error){
    console.error(error);estado.textContent='No se pudo generar el respaldo.';alert(`No se pudo generar el respaldo: ${error.message||error}`);
  }finally{boton.disabled=false;boton.textContent='Descargar respaldo JSON';}
}

async function exportarCsvClientes(){
  const clientes=await leerColeccion('clientes');
  const cab=['ID','Nombre','CUIT','Teléfono','Email','Observaciones'];
  const filas=clientes.map(c=>[c.id,c.nombre,c.cuit,c.telefono,c.email,c.observaciones]);
  descargar(`chourrout-clientes-${fechaArchivo()}.csv`,[cab,...filas].map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv;charset=utf-8');
}

async function exportarCsvProductos(){
  const productos=await leerColeccion('productos');
  const cab=['ID','Categoría','Producto','Variante','Medida','Unidad','Precio','IVA','Estado','Observaciones'];
  const filas=productos.map(p=>[p.id,p.categoria,p.producto,p.variante,p.medida,p.unidad,p.precio,p.iva,p.estado,p.observaciones]);
  descargar(`chourrout-productos-${fechaArchivo()}.csv`,[cab,...filas].map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv;charset=utf-8');
}

document.getElementById('exportarJson')?.addEventListener('click',exportarJson);
document.getElementById('exportarClientesCsv')?.addEventListener('click',()=>exportarCsvClientes().catch(e=>alert(`No se pudo exportar clientes: ${e.message||e}`)));
document.getElementById('exportarProductosCsv')?.addEventListener('click',()=>exportarCsvProductos().catch(e=>alert(`No se pudo exportar productos: ${e.message||e}`)));
