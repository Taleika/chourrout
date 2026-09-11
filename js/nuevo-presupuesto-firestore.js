import { db } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

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

async function cargarCatalogoFirestore(){
  const buscador=document.getElementById('buscarProducto');
  const ayuda=buscador?.closest('.product-picker')?.querySelector('.picker-help');
  if(buscador){
    buscador.disabled=true;
    buscador.placeholder='Cargando productos desde Firebase...';
  }

  try{
    const snap=await getDocs(collection(db,'productos'));
    const productos=snap.docs
      .map(d=>normalizarProducto({...d.data(),id:d.id}))
      .filter(p=>p.estado!=='Inactivo')
      .sort((a,b)=>a.id.localeCompare(b.id,'es',{numeric:true}));

    if(!productos.length) throw new Error('La colección de productos está vacía.');

    window.CH_PRODUCTOS=productos;
    window.CH_PRODUCTOS_FIRESTORE=productos;
    if(ayuda) ayuda.textContent=`Productos sincronizados con Firebase · ${productos.length} artículos disponibles.`;
  }catch(error){
    console.error('No se pudo cargar el catálogo desde Firestore.',error);
    const fallback=Array.isArray(window.CH_PRODUCTOS)?window.CH_PRODUCTOS:[];
    if(ayuda) ayuda.textContent=fallback.length
      ? 'No se pudo conectar con Firebase. Se está usando temporalmente la copia local del catálogo.'
      : 'No se pudo cargar el catálogo de productos.';
  }finally{
    if(buscador){
      buscador.disabled=false;
      buscador.placeholder='Buscar productos: tranquera, poste, varilla, medida...';
    }
  }
}

await cargarCatalogoFirestore();
await import('./nuevo-presupuesto.js');
