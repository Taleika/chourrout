import { db } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const DRAFT_KEY='chourrout_presupuesto_actual';
const SAVED_KEY='chourrout_presupuestos_guardados';
const CLIENTES_KEY='chourrout_clientes';
let catalogoFirestore=[];
let syncTimer=null;

function leerJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(e){return fallback;}}
function escribirJson(key,value){localStorage.setItem(key,JSON.stringify(value));}
function nuevoNumero(){return String(Date.now()).slice(-6);}
function idPresupuesto(numero){return `P-${String(numero||nuevoNumero()).replace(/[^a-zA-Z0-9_-]/g,'')}`;}

function normalizarProducto(p){
  return {id:String(p.id||''),categoria:String(p.categoria||''),producto:String(p.producto||''),variante:String(p.variante||''),medida:String(p.medida||''),unidad:String(p.unidad||'unidad'),precio:Number(p.precio)||999,iva:p.iva||'Sin IVA',estado:p.estado||'Activo',observaciones:String(p.observaciones||''),pendiente:Boolean(p.pendiente)||Number(p.precio)===999,tranquera:Boolean(p.tranquera),tiretas:Boolean(p.tiretas)};
}

async function cargarCatalogoFirestore(){
  const buscador=document.getElementById('buscarProducto');
  const ayuda=buscador?.closest('.product-picker')?.querySelector('.picker-help');
  if(buscador){buscador.disabled=true;buscador.placeholder='Cargando productos desde Firebase...';}
  try{
    const snap=await getDocs(collection(db,'productos'));
    catalogoFirestore=snap.docs.map(d=>normalizarProducto({...d.data(),id:d.id})).filter(p=>p.estado!=='Inactivo').sort((a,b)=>a.id.localeCompare(b.id,'es',{numeric:true}));
    if(!catalogoFirestore.length)throw new Error('La colección de productos está vacía.');
    window.CH_PRODUCTOS=catalogoFirestore;window.CH_PRODUCTOS_FIRESTORE=catalogoFirestore;
    if(ayuda)ayuda.textContent=`Productos sincronizados con Firebase · ${catalogoFirestore.length} artículos disponibles.`;
  }catch(error){
    console.error('No se pudo cargar el catálogo desde Firestore.',error);
    catalogoFirestore=Array.isArray(window.CH_PRODUCTOS)?window.CH_PRODUCTOS:[];
    if(ayuda)ayuda.textContent=catalogoFirestore.length?'No se pudo conectar con Firebase. Se está usando temporalmente la copia local del catálogo.':'No se pudo cargar el catálogo de productos.';
  }finally{if(buscador){buscador.disabled=false;buscador.placeholder='Buscar productos: tranquera, poste, varilla, medida...';}}
}

async function cargarClientesFirestore(){
  try{
    const snap=await getDocs(collection(db,'clientes'));
    const clientes=snap.docs.map(d=>({id:d.id,...d.data()}));
    escribirJson(CLIENTES_KEY,clientes);
  }catch(error){console.warn('No se pudieron sincronizar los clientes.',error);}
}

function prepararBorradorConPreciosActuales(){
  const draft=leerJson(DRAFT_KEY,null);if(!draft)return;
  if(draft.estado==='definitivo'){
    const copia=JSON.parse(JSON.stringify(draft));
    copia.origenDefinitivo=draft.numero;
    copia.numero=nuevoNumero();
    copia.estado='borrador';
    copia.actualizadoEn=new Date().toISOString();
    escribirJson(DRAFT_KEY,copia);
    return;
  }
  if(!Array.isArray(draft.items)||!catalogoFirestore.length)return;
  const mapa=new Map(catalogoFirestore.map(p=>[p.id,p]));
  draft.items=draft.items.map(i=>{
    const actual=mapa.get(i.id);if(!actual)return i;
    return {...i,precio:Number(actual.precio)||999,precioActual:Number(actual.precio)||999,pendiente:Boolean(actual.pendiente)||Number(actual.precio)===999,iva:actual.iva||i.iva,producto:actual.producto||i.producto,variante:actual.variante??i.variante,medida:actual.medida??i.medida,unidad:actual.unidad||i.unidad};
  });
  draft.actualizadoEn=new Date().toISOString();
  escribirJson(DRAFT_KEY,draft);
}

async function guardarSnapshotFirestore(snapshot){
  if(!snapshot||!snapshot.numero)return;
  if(snapshot.estado!=='definitivo'){
    const refActual=doc(db,'presupuestos',idPresupuesto(snapshot.numero));
    const existente=await getDoc(refActual);
    if(existente.exists()&&existente.data().estado==='definitivo'){
      const viejo=snapshot.numero;
      snapshot={...snapshot,origenDefinitivo:viejo,numero:nuevoNumero(),estado:'borrador',actualizadoEn:new Date().toISOString()};
      escribirJson(DRAFT_KEY,snapshot);
      const numeroDom=document.getElementById('numeroPresupuesto');if(numeroDom)numeroDom.textContent=snapshot.numero;
    }
  }
  const definitivo=snapshot.estado==='definitivo';
  const payload={...snapshot,preciosCongelados:definitivo,actualizadoServidor:serverTimestamp()};
  if(definitivo)payload.cerradoEn=serverTimestamp();
  await setDoc(doc(db,'presupuestos',idPresupuesto(snapshot.numero)),payload,{merge:false});

  let guardados=leerJson(SAVED_KEY,[]);if(!Array.isArray(guardados))guardados=[];
  const idx=guardados.findIndex(p=>String(p.numero)===String(snapshot.numero));
  if(idx>=0)guardados[idx]=snapshot;else guardados.push(snapshot);
  escribirJson(SAVED_KEY,guardados);
}

async function sincronizarBorrador(){
  const snapshot=leerJson(DRAFT_KEY,null);
  if(!snapshot||(!snapshot.clienteNombre&&!(snapshot.items||[]).length))return;
  try{await guardarSnapshotFirestore(snapshot);}catch(error){console.error('No se pudo guardar el presupuesto en Firebase.',error);}
}
function programarSync(){clearTimeout(syncTimer);syncTimer=setTimeout(sincronizarBorrador,700);}

await Promise.all([cargarCatalogoFirestore(),cargarClientesFirestore()]);
prepararBorradorConPreciosActuales();
await import('./nuevo-presupuesto.js');

const nota=document.querySelector('.prototype-note');if(nota)nota.textContent='Borradores y presupuestos definitivos se guardan en Firebase. Los borradores toman los precios vigentes; al cerrar un presupuesto, sus precios quedan congelados.';

document.addEventListener('input',programarSync);
document.addEventListener('change',programarSync);
['guardarBorrador','guardarDefinitivo'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(sincronizarBorrador,50)));
window.addEventListener('beforeunload',()=>{clearTimeout(syncTimer);});
