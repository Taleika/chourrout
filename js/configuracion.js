import { db } from './firebase-config.js';
import { doc, getDoc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const REF=doc(db,'configuracion','general');
const DEFAULTS={
  empresaNombre:'Chourrout Hnos. S.A.',
  empresaDireccion:'Ruta 205 km 181,5',
  empresaLocalidad:'Saladillo, Buenos Aires',
  empresaTelefono:'2345 498743',
  empresaCuit:'',
  empresaEmail:'',
  validezDias:7,
  ivaPorDefecto:'0',
  observacionesDefault:'Presupuesto válido por 7 días. Entrega sujeta a disponibilidad.'
};

const ids=['empresaNombre','empresaDireccion','empresaLocalidad','empresaTelefono','empresaCuit','empresaEmail','validezDias','ivaPorDefecto','observacionesDefault'];
const estado=document.getElementById('estadoGuardado');
const preview=document.getElementById('previewConfig');

function leerFormulario(){
  return {
    empresaNombre:document.getElementById('empresaNombre').value.trim(),
    empresaDireccion:document.getElementById('empresaDireccion').value.trim(),
    empresaLocalidad:document.getElementById('empresaLocalidad').value.trim(),
    empresaTelefono:document.getElementById('empresaTelefono').value.trim(),
    empresaCuit:document.getElementById('empresaCuit').value.trim(),
    empresaEmail:document.getElementById('empresaEmail').value.trim(),
    validezDias:Math.max(0,Math.round(Number(document.getElementById('validezDias').value)||0)),
    ivaPorDefecto:document.getElementById('ivaPorDefecto').value,
    observacionesDefault:document.getElementById('observacionesDefault').value.trim()
  };
}

function cargarFormulario(data){
  const cfg={...DEFAULTS,...(data||{})};
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value=cfg[id]??'';});
  actualizarPreview();
}

function actualizarPreview(){
  const c=leerFormulario();
  preview.innerHTML=`
    <strong>${escapeHtml(c.empresaNombre||'Chourrout Hnos. S.A.')}</strong>
    <div>${escapeHtml(c.empresaDireccion||'—')} · ${escapeHtml(c.empresaLocalidad||'—')}</div>
    <div>${c.empresaTelefono?`Tel. ${escapeHtml(c.empresaTelefono)}`:'Sin teléfono cargado'}</div>
    ${c.empresaCuit?`<div>CUIT ${escapeHtml(c.empresaCuit)}</div>`:''}
    ${c.empresaEmail?`<div>${escapeHtml(c.empresaEmail)}</div>`:''}
    <br>
    <small>Validez: ${c.validezDias} día${c.validezDias===1?'':'s'} · IVA inicial: ${textoIva(c.ivaPorDefecto)}</small>
    <div style="margin-top:10px"><small>Observación por defecto</small><div>${escapeHtml(c.observacionesDefault||'Sin observación por defecto')}</div></div>`;
}

function textoIva(v){return v==='21'?'21%':v==='10.5'?'10,5%':v==='individual'?'Según cada producto':'Sin IVA';}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

async function iniciar(){
  estado.textContent='Cargando configuración...';
  try{
    const snap=await getDoc(REF);
    if(snap.exists()){
      cargarFormulario(snap.data());
    }else{
      await setDoc(REF,{...DEFAULTS,actualizadoEn:serverTimestamp()});
      cargarFormulario(DEFAULTS);
    }
    estado.textContent='Configuración sincronizada con Firebase';
  }catch(error){
    console.error(error);
    cargarFormulario(DEFAULTS);
    estado.textContent='No se pudo cargar Firebase. Se muestran los valores iniciales.';
  }
}

async function guardar(){
  const boton=document.getElementById('guardarConfig');
  const datos=leerFormulario();
  if(!datos.empresaNombre){alert('Ingresá la razón social.');return;}
  boton.disabled=true;boton.textContent='Guardando...';estado.textContent='';
  try{
    await setDoc(REF,{...datos,actualizadoEn:serverTimestamp()},{merge:true});
    estado.textContent='✓ Cambios guardados';
    actualizarPreview();
  }catch(error){
    alert(`No se pudo guardar la configuración: ${error.message||error}`);
  }finally{
    boton.disabled=false;boton.textContent='Guardar configuración';
  }
}

document.getElementById('guardarConfig').addEventListener('click',guardar);
document.getElementById('restaurar').addEventListener('click',()=>{
  if(!confirm('¿Restaurar los valores iniciales? Después deberás tocar “Guardar configuración”.'))return;
  cargarFormulario(DEFAULTS);estado.textContent='Valores iniciales cargados. Falta guardar.';
});
ids.forEach(id=>document.getElementById(id)?.addEventListener('input',actualizarPreview));
document.getElementById('ivaPorDefecto')?.addEventListener('change',actualizarPreview);

iniciar();
