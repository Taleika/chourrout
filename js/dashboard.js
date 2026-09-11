import { db } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const DRAFT_KEY='chourrout_presupuesto_actual';

function dinero(v){
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(v)||0);
}
function fechaAR(value){
  if(!value)return '—';
  const d=new Date(value);
  if(!Number.isNaN(d.getTime())) return d.toLocaleDateString('es-AR');
  const [y,m,dd]=String(value).split('-');
  return y&&m&&dd?`${dd}/${m}/${y}`:String(value);
}
function num(v){return Number(v)||0;}
function netoItem(i){
  let neto=num(i.cantidad)*num(i.precioActual??i.precio)*(1+num(i.extra));
  if(i.tiretas){
    neto+=num(i.dibujos??i.cantidadDibujo)*77000;
    neto+=num(i.cuadrados??i.cantidadCuadrados)*106000;
  }
  return neto;
}
function totalPresupuesto(p){
  let total=0;
  (p.items||[]).forEach(i=>{
    const neto=netoItem(i);
    const tasa=(p.ivaGlobal??'0')==='individual'?num(i.ivaActual):num(p.ivaGlobal??0);
    total+=neto+(tasa===21?neto*.21:tasa===10.5?neto*.105:0);
  });
  return total;
}
function html(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function fechaOrden(p){return String(p.actualizadoEn||p.fecha||'');}

function prepararContinuarUltimo(borradores){
  const btn=document.getElementById('continuarUltimo');
  const texto=document.getElementById('ultimoBorradorTexto');
  if(!btn||!texto)return;
  const ultimo=[...borradores].sort((a,b)=>fechaOrden(b).localeCompare(fechaOrden(a)))[0];
  if(!ultimo){btn.hidden=true;texto.hidden=true;return;}
  btn.hidden=false;
  texto.hidden=false;
  const cliente=ultimo.clienteNombre||'Sin cliente';
  texto.textContent=`Último en curso: Nº ${ultimo.numero||'—'} · ${cliente} · ${dinero(totalPresupuesto(ultimo))}`;
  btn.textContent=`↩ Continuar Nº ${ultimo.numero||'—'}`;
  btn.onclick=()=>{
    localStorage.setItem(DRAFT_KEY,JSON.stringify(ultimo));
    location.href='presupuestos/nuevo.html';
  };
}

async function cargarDashboard(){
  const estado=document.getElementById('dashboardEstado');
  try{
    const [prodSnap,cliSnap,presSnap]=await Promise.all([
      getDocs(collection(db,'productos')),
      getDocs(collection(db,'clientes')),
      getDocs(collection(db,'presupuestos'))
    ]);

    const productos=prodSnap.docs.map(d=>({id:d.id,...d.data()}));
    const clientes=cliSnap.docs.map(d=>({id:d.id,...d.data()}));
    const presupuestos=presSnap.docs.map(d=>({id:d.id,...d.data()}));
    const definitivos=presupuestos.filter(p=>p.estado==='definitivo');
    const borradores=presupuestos.filter(p=>p.estado!=='definitivo');
    const pendientes=productos.filter(p=>p.pendiente||Number(p.precio)===999).length;
    const totalDefinitivos=definitivos.reduce((a,p)=>a+totalPresupuesto(p),0);

    document.getElementById('dashProductos').textContent=productos.length;
    document.getElementById('dashPendientes').textContent=pendientes;
    document.getElementById('dashClientes').textContent=clientes.length;
    document.getElementById('dashDefinitivos').textContent=definitivos.length;
    document.getElementById('dashBorradores').textContent=borradores.length;
    document.getElementById('dashTotal').textContent=dinero(totalDefinitivos);

    prepararContinuarUltimo(borradores);

    const ultimos=[...presupuestos].sort((a,b)=>fechaOrden(b).localeCompare(fechaOrden(a))).slice(0,5);
    const tbody=document.getElementById('ultimosPresupuestos');
    if(!ultimos.length){
      tbody.innerHTML='<tr><td colspan="6" class="muted" style="padding:18px">Todavía no hay presupuestos guardados.</td></tr>';
    }else{
      tbody.innerHTML=ultimos.map(p=>`<tr>
        <td><strong>${html(p.numero||'—')}</strong></td>
        <td>${html(fechaAR(p.fecha||p.actualizadoEn))}</td>
        <td>${html(p.clienteNombre||'Sin cliente')}</td>
        <td><span class="badge ${p.estado==='definitivo'?'badge-ok':'badge-draft'}">${p.estado==='definitivo'?'Definitivo':'Borrador'}</span></td>
        <td class="money"><strong>${html(dinero(totalPresupuesto(p)))}</strong></td>
        <td>${p.estado==='definitivo'
          ? `<a class="budget-open" href="presupuestos/historial.html?q=${encodeURIComponent(p.numero||'')}">Ver</a>`
          : `<button class="budget-open js-continuar" data-numero="${html(p.numero||'')}" type="button" style="border:0;background:none;cursor:pointer;padding:0">Continuar</button>`}
        </td>
      </tr>`).join('');
      tbody.querySelectorAll('.js-continuar').forEach(btn=>btn.addEventListener('click',()=>{
        const p=borradores.find(x=>String(x.numero)===String(btn.dataset.numero));
        if(!p)return;
        localStorage.setItem(DRAFT_KEY,JSON.stringify(p));
        location.href='presupuestos/nuevo.html';
      }));
    }
    estado.textContent='Datos sincronizados con Firebase';
  }catch(error){
    console.error(error);
    estado.textContent='No se pudieron cargar los datos del panel.';
  }
}

cargarDashboard();
