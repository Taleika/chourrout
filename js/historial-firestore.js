import { db } from './firebase-config.js';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const DRAFT_KEY='chourrout_presupuesto_actual';
const SAVED_KEY='chourrout_presupuestos_guardados';
const tabla=document.getElementById('tablaPresupuestos');
let presupuestos=[];

function leer(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(e){return fallback;}}
function escribir(key,value){localStorage.setItem(key,JSON.stringify(value));}
function idPresupuesto(numero){return `P-${String(numero||'').replace(/[^a-zA-Z0-9_-]/g,'')}`;}

async function cargarConfiguracion(){
  try{
    const snap=await getDoc(doc(db,'configuracion','general'));
    window.CH_CONFIG=snap.exists()?snap.data():{};
  }catch(error){
    console.warn('No se pudo cargar la configuración general para el historial.',error);
    window.CH_CONFIG={};
  }
}

async function cargarYActualizarBorradores(){
  const [snapPres,snapProd]=await Promise.all([getDocs(collection(db,'presupuestos')),getDocs(collection(db,'productos'))]);
  const mapaProductos=new Map(snapProd.docs.map(d=>{const p=d.data();return [d.id,{...p,id:d.id}];}));
  presupuestos=[];
  for(const d of snapPres.docs){
    let p={...d.data()};
    if(p.estado!=='definitivo'&&Array.isArray(p.items)){
      let cambio=false;
      p.items=p.items.map(i=>{
        const actual=mapaProductos.get(i.id);if(!actual)return i;
        const precio=Number(actual.precio)||999;
        if(Number(i.precioActual??i.precio)!==precio)cambio=true;
        return {...i,precio,precioActual:precio,pendiente:Boolean(actual.pendiente)||precio===999,producto:actual.producto||i.producto,variante:actual.variante??i.variante,medida:actual.medida??i.medida,unidad:actual.unidad||i.unidad};
      });
      if(cambio){
        p.actualizadoEn=new Date().toISOString();
        await setDoc(doc(db,'presupuestos',d.id),{...p,actualizadoServidor:serverTimestamp()},{merge:false});
      }
    }
    presupuestos.push(p);
  }
  presupuestos.sort((a,b)=>String(b.actualizadoEn||b.fecha||'').localeCompare(String(a.actualizadoEn||a.fecha||'')));
  escribir(SAVED_KEY,presupuestos);
}

function agregarBotonesEliminar(){
  tabla.querySelectorAll('tr').forEach(tr=>{
    const actions=tr.querySelector('.actions');if(!actions||actions.querySelector('[data-action="eliminar-firestore"]'))return;
    const ref=actions.querySelector('[data-numero]');if(!ref)return;
    const b=document.createElement('button');
    b.className='icon-btn';b.dataset.action='eliminar-firestore';b.dataset.numero=ref.dataset.numero;b.dataset.estado=ref.dataset.estado||'borrador';b.textContent='Eliminar';b.style.borderColor='#d8d8d8';
    actions.appendChild(b);
  });
}

async function eliminarPresupuesto(numero){
  const p=presupuestos.find(x=>String(x.numero)===String(numero));if(!p)return;
  const tipo=p.estado==='definitivo'?'presupuesto definitivo':'borrador';
  if(!confirm(`¿Eliminar el ${tipo} Nº ${numero}?\n\nEsta acción lo quitará de la lista para las dos cuentas.`))return;
  await deleteDoc(doc(db,'presupuestos',idPresupuesto(numero)));
  presupuestos=presupuestos.filter(x=>String(x.numero)!==String(numero));
  escribir(SAVED_KEY,presupuestos);
  const draft=leer(DRAFT_KEY,null);if(draft&&String(draft.numero)===String(numero))localStorage.removeItem(DRAFT_KEY);
  location.reload();
}

function aplicarFiltroDesdeUrl(){
  const params=new URL(location.href).searchParams;
  const q=params.get('q')||'';
  const estado=params.get('estado')||'';
  const input=document.getElementById('buscarPresupuesto');
  const select=document.getElementById('filtroEstado');
  if(input&&q)input.value=q;
  if(select&&(estado==='borrador'||estado==='definitivo'))select.value=estado;
  if((input&&q)||(select&&estado)){
    (input||select)?.dispatchEvent(new Event('input',{bubbles:true}));
    select?.dispatchEvent(new Event('change',{bubbles:true}));
  }
}

try{
  await cargarConfiguracion();
  await cargarYActualizarBorradores();
}catch(error){console.error('No se pudo sincronizar el historial con Firebase.',error);}

await import('./historial.js?v=20260911-1348');
aplicarFiltroDesdeUrl();
agregarBotonesEliminar();
new MutationObserver(agregarBotonesEliminar).observe(tabla,{childList:true,subtree:true});
tabla.addEventListener('click',e=>{const b=e.target.closest('[data-action="eliminar-firestore"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();eliminarPresupuesto(b.dataset.numero).catch(err=>alert(`No se pudo eliminar el presupuesto: ${err.message||err}`));},true);
