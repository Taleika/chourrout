import { db } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const DRAFT_KEY='chourrout_presupuesto_actual';
const SAVED_KEY='chourrout_presupuestos_guardados';
const CLIENTES_KEY='chourrout_clientes';
const ADD_QUEUE_KEY='chourrout_productos_para_agregar';
const PENDING_ADD_KEY='chourrout_producto_para_agregar';
const NUMERACION_REF=doc(db,'configuracion','numeracionPresupuestos');
const CONFIG_REF=doc(db,'configuracion','general');
let catalogoFirestore=[];
let syncTimer=null;
let reservandoNumero=null;
let configuracionGeneral=null;
let inicioComoNuevo=false;

function leerJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(e){return fallback;}}
function escribirJson(key,value){localStorage.setItem(key,JSON.stringify(value));}
function idPresupuesto(numero){return `P-${String(numero||'').replace(/[^a-zA-Z0-9_-]/g,'')}`;}
function esNumeroCorrelativo(numero){return /^\d{6}$/.test(String(numero||''));}
function formatearNumero(n){return String(Math.max(0,Number(n)||0)).padStart(6,'0');}

function iniciarPresupuestoVacioSiCorresponde(){
  const url=new URL(location.href);
  if(url.searchParams.get('nuevo')!=='1')return;
  inicioComoNuevo=true;
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(ADD_QUEUE_KEY);
  localStorage.removeItem(PENDING_ADD_KEY);
  url.searchParams.delete('nuevo');
  history.replaceState({},'',url.pathname+(url.search||'')+(url.hash||''));
}

async function cargarConfiguracionGeneral(){
  try{
    const snap=await getDoc(CONFIG_REF);
    configuracionGeneral=snap.exists()?snap.data():null;
    window.CH_CONFIG=configuracionGeneral||{};
  }catch(error){
    console.warn('No se pudo cargar la configuración general.',error);
    configuracionGeneral=null;
    window.CH_CONFIG={};
  }
}

async function reservarNumeroCorrelativo(){
  if(reservandoNumero)return reservandoNumero;
  reservandoNumero=runTransaction(db,async tx=>{
    const contadorSnap=await tx.get(NUMERACION_REF);
    let ultimo=contadorSnap.exists()?Number(contadorSnap.data().ultimo||0):0;
    let candidato=ultimo+1;
    while(candidato<1000000){
      const numero=formatearNumero(candidato);
      const existente=await tx.get(doc(db,'presupuestos',idPresupuesto(numero)));
      if(!existente.exists()){
        tx.set(NUMERACION_REF,{ultimo:candidato,actualizadoEn:serverTimestamp()},{merge:true});
        return numero;
      }
      candidato++;
    }
    throw new Error('Se agotó el rango de numeración de presupuestos.');
  }).finally(()=>{reservandoNumero=null;});
  return reservandoNumero;
}

async function asegurarNumero(snapshot){
  if(snapshot&&esNumeroCorrelativo(snapshot.numero))return snapshot;
  const numero=await reservarNumeroCorrelativo();
  const actualizado={...snapshot,numero,actualizadoEn:new Date().toISOString()};
  escribirJson(DRAFT_KEY,actualizado);
  const numeroDom=document.getElementById('numeroPresupuesto');
  if(numeroDom)numeroDom.textContent=numero;
  return actualizado;
}

function enteroNoNegativo(valor){
  const n=Number(valor);
  return Number.isFinite(n)?Math.max(0,Math.round(n)):0;
}

function normalizarInputCantidad(input,disparar=false){
  if(!input?.classList?.contains('js-cantidad'))return;
  input.step='1';
  input.min='0';
  const entero=enteroNoNegativo(input.value);
  if(String(entero)!==String(input.value)){
    input.value=String(entero);
    if(disparar)input.dispatchEvent(new Event('input',{bubbles:true}));
  }
}

function normalizarInputsCantidad(disparar=false){
  document.querySelectorAll('.js-cantidad').forEach(input=>normalizarInputCantidad(input,disparar));
}

document.addEventListener('input',e=>{
  const input=e.target;
  if(!input?.classList?.contains('js-cantidad'))return;
  const entero=enteroNoNegativo(input.value);
  if(String(entero)!==String(input.value))input.value=String(entero);
},true);

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
    copia.numero='';
    copia.estado='borrador';
    copia.actualizadoEn=new Date().toISOString();
    copia.items=(copia.items||[]).map(i=>({...i,cantidad:enteroNoNegativo(i.cantidad)}));
    escribirJson(DRAFT_KEY,copia);
    return;
  }
  if(!Array.isArray(draft.items)||!catalogoFirestore.length)return;
  const mapa=new Map(catalogoFirestore.map(p=>[p.id,p]));
  draft.items=draft.items.map(i=>{
    const actual=mapa.get(i.id);
    const base={...i,cantidad:enteroNoNegativo(i.cantidad)};
    if(!actual)return base;
    return {...base,precio:Number(actual.precio)||999,precioActual:Number(actual.precio)||999,pendiente:Boolean(actual.pendiente)||Number(actual.precio)===999,iva:actual.iva||i.iva,producto:actual.producto||i.producto,variante:actual.variante??i.variante,medida:actual.medida??i.medida,unidad:actual.unidad||i.unidad};
  });
  draft.actualizadoEn=new Date().toISOString();
  escribirJson(DRAFT_KEY,draft);
}

function aplicarConfiguracionANuevo(){
  if(!inicioComoNuevo||!configuracionGeneral)return;
  const obs=document.getElementById('observaciones');
  const iva=document.getElementById('ivaGlobal');
  if(obs&&!obs.value.trim()&&configuracionGeneral.observacionesDefault)obs.value=configuracionGeneral.observacionesDefault;
  if(iva&&configuracionGeneral.ivaPorDefecto!=null)iva.value=String(configuracionGeneral.ivaPorDefecto);
  const draft=leerJson(DRAFT_KEY,null);
  if(draft){
    draft.observaciones=obs?.value||draft.observaciones||'';
    draft.ivaGlobal=iva?.value??draft.ivaGlobal??'0';
    escribirJson(DRAFT_KEY,draft);
  }
}

async function guardarSnapshotFirestore(snapshot){
  if(!snapshot)return;
  snapshot={...snapshot,items:(snapshot.items||[]).map(i=>({...i,cantidad:enteroNoNegativo(i.cantidad)}))};
  snapshot=await asegurarNumero(snapshot);

  if(snapshot.estado!=='definitivo'){
    const refActual=doc(db,'presupuestos',idPresupuesto(snapshot.numero));
    const existente=await getDoc(refActual);
    if(existente.exists()&&existente.data().estado==='definitivo'){
      const viejo=snapshot.numero;
      snapshot={...snapshot,origenDefinitivo:viejo,numero:'',estado:'borrador',actualizadoEn:new Date().toISOString()};
      snapshot=await asegurarNumero(snapshot);
    }
  }

  const definitivo=snapshot.estado==='definitivo';
  const payload={...snapshot,numeroCorrelativo:Number(snapshot.numero),preciosCongelados:definitivo,actualizadoServidor:serverTimestamp()};
  if(definitivo)payload.cerradoEn=serverTimestamp();
  await setDoc(doc(db,'presupuestos',idPresupuesto(snapshot.numero)),payload,{merge:false});

  let guardados=leerJson(SAVED_KEY,[]);if(!Array.isArray(guardados))guardados=[];
  const idx=guardados.findIndex(p=>String(p.numero)===String(snapshot.numero));
  if(idx>=0)guardados[idx]=snapshot;else guardados.push(snapshot);
  escribirJson(SAVED_KEY,guardados);
}

async function sincronizarBorrador(){
  let snapshot=leerJson(DRAFT_KEY,null);
  if(!snapshot||(!snapshot.clienteNombre&&!(snapshot.items||[]).length))return;
  try{
    snapshot=await asegurarNumero(snapshot);
    await guardarSnapshotFirestore(snapshot);
  }catch(error){console.error('No se pudo guardar el presupuesto en Firebase.',error);}
}
function programarSync(){clearTimeout(syncTimer);syncTimer=setTimeout(sincronizarBorrador,700);}

iniciarPresupuestoVacioSiCorresponde();
await Promise.all([cargarCatalogoFirestore(),cargarClientesFirestore(),cargarConfiguracionGeneral()]);
prepararBorradorConPreciosActuales();
await import('./nuevo-presupuesto.js?v=20260911-1335');
aplicarConfiguracionANuevo();

const draftInicial=leerJson(DRAFT_KEY,null);
const numeroDom=document.getElementById('numeroPresupuesto');
if(numeroDom)numeroDom.textContent=esNumeroCorrelativo(draftInicial?.numero)?draftInicial.numero:'NUEVO';

normalizarInputsCantidad(true);
const itemsContenedor=document.getElementById('itemsPresupuesto');
if(itemsContenedor){
  new MutationObserver(()=>normalizarInputsCantidad(false)).observe(itemsContenedor,{childList:true,subtree:true});
}

const nota=document.querySelector('.prototype-note');if(nota)nota.textContent='Borradores y presupuestos definitivos se guardan en Firebase. La numeración es correlativa y compartida entre usuarios; los definitivos conservan sus precios históricos.';

document.addEventListener('input',programarSync);
document.addEventListener('change',programarSync);
['guardarBorrador','guardarDefinitivo'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(sincronizarBorrador,50)));
window.addEventListener('beforeunload',()=>{clearTimeout(syncTimer);});
