import { db } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

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

    const ultimos=[...presupuestos].sort((a,b)=>String(b.actualizadoEn||b.fecha||'').localeCompare(String(a.actualizadoEn||a.fecha||''))).slice(0,5);
    const tbody=document.getElementById('ultimosPresupuestos');
    if(!ultimos.length){
      tbody.innerHTML='<tr><td colspan="5" class="muted" style="padding:18px">Todavía no hay presupuestos guardados.</td></tr>';
    }else{
      tbody.innerHTML=ultimos.map(p=>`<tr>
        <td><strong>${html(p.numero||'—')}</strong></td>
        <td>${html(fechaAR(p.fecha||p.actualizadoEn))}</td>
        <td>${html(p.clienteNombre||'Sin cliente')}</td>
        <td><span class="badge ${p.estado==='definitivo'?'badge-ok':'badge-draft'}">${p.estado==='definitivo'?'Definitivo':'Borrador'}</span></td>
        <td class="money"><strong>${html(dinero(totalPresupuesto(p)))}</strong></td>
      </tr>`).join('');
    }
    estado.textContent='Datos sincronizados con Firebase';
  }catch(error){
    console.error(error);
    estado.textContent='No se pudieron cargar los datos del panel.';
  }
}

cargarDashboard();
