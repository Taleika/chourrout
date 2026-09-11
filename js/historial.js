const DRAFT_KEY='chourrout_presupuesto_actual';
const SAVED_KEY='chourrout_presupuestos_guardados';
const tabla=document.getElementById('tablaPresupuestos');
const buscar=document.getElementById('buscarPresupuesto');
const filtroEstado=document.getElementById('filtroEstado');
const EXTRA_DIBUJO_TIRETAS=77000;
const EXTRA_CUADRADOS_TIRETAS=106000;

function leer(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(e){return fallback;}}
function num(v){return Number(v)||0;}
function entero(v){return Math.max(0,Math.round(num(v)));}
function dinero(v){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0,maximumFractionDigits:2}).format(v||0);}
function fechaAR(value){if(!value)return '—';const [y,m,d]=String(value).split('-');return y&&m&&d?`${d}/${m}/${y}`:value;}
function safeName(value){return String(value||'cliente').trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g,'_').replace(/^_+|_+$/g,'')||'cliente';}
function htmlEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

function config(){
  const c=window.CH_CONFIG||{};
  return {
    empresaNombre:c.empresaNombre||'Chourrout Hnos. S.A.',
    empresaDireccion:c.empresaDireccion||'Ruta 205 km 181,5',
    empresaLocalidad:c.empresaLocalidad||'Saladillo, Buenos Aires',
    empresaTelefono:c.empresaTelefono||'2345 498743',
    empresaCuit:c.empresaCuit||'',
    empresaEmail:c.empresaEmail||'',
    validezDias:Math.max(0,Math.round(Number(c.validezDias)||0))
  };
}
function contactoEmpresa(c){return [c.empresaDireccion,c.empresaLocalidad,c.empresaTelefono?`Tel. ${c.empresaTelefono}`:'',c.empresaCuit?`CUIT ${c.empresaCuit}`:'',c.empresaEmail].filter(Boolean).join(' · ');}
function validezTexto(c){return c.validezDias?`Validez: ${c.validezDias} día${c.validezDias===1?'':'s'}`:'';}
function ivaTextoPresupuesto(p){const modo=String(p.ivaGlobal??'0');return modo==='21'?'IVA 21%':modo==='10.5'?'IVA 10,5%':modo==='individual'?'IVA SEGÚN PRODUCTO':'SIN IVA';}

function netoItem(i){
  let neto=entero(i.cantidad)*num(i.precioActual??i.precio)*(1+num(i.extra));
  if(i.tiretas){
    neto+=entero(i.dibujos??i.cantidadDibujo)*EXTRA_DIBUJO_TIRETAS;
    neto+=entero(i.cuadrados??i.cantidadCuadrados)*EXTRA_CUADRADOS_TIRETAS;
  }
  return neto;
}
function tasaItem(p,i){return (p.ivaGlobal??'0')==='individual'?num(i.ivaActual):num(p.ivaGlobal??0);}
function totalesPresupuesto(p){
  let subtotal=0,iva21=0,iva105=0;
  (p.items||[]).forEach(i=>{const neto=netoItem(i);subtotal+=neto;const tasa=tasaItem(p,i);if(tasa===21)iva21+=neto*.21;if(tasa===10.5)iva105+=neto*.105;});
  return {subtotal,iva21,iva105,total:subtotal+iva21+iva105};
}
function totalPresupuesto(p){return totalesPresupuesto(p).total;}
function detalleItem(i){
  const partes=[i.producto,i.variante,i.medida].filter(Boolean);
  if(i.tranquera&&num(i.extra)>0) partes.push(`Adicional +${Math.round(num(i.extra)*100)}%`);
  if(i.tiretas){
    const dibujos=entero(i.dibujos??i.cantidadDibujo),cuadrados=entero(i.cuadrados??i.cantidadCuadrados);
    if(dibujos)partes.push(`${dibujos} dibujo${dibujos===1?'':'s'} artístico${dibujos===1?'':'s'} por hoja`);
    if(cuadrados)partes.push(`${cuadrados} cuadrado${cuadrados===1?'':'s'}`);
  }
  return partes.join(' · ');
}

function obtener(){
  let lista=leer(SAVED_KEY,[]);if(!Array.isArray(lista))lista=[];
  const draft=leer(DRAFT_KEY,null);
  if(draft&&draft.estado!=='definitivo'&&((draft.items||[]).length||draft.clienteNombre)){
    lista=[draft,...lista.filter(p=>!(String(p.numero)===String(draft.numero)&&p.estado==='borrador'))];
  }
  return lista.sort((a,b)=>String(b.actualizadoEn||b.fecha||'').localeCompare(String(a.actualizadoEn||a.fecha||'')));
}
function actualizarStats(){
  const lista=obtener();
  document.getElementById('statTotal').textContent=lista.length;
  document.getElementById('statDefinitivos').textContent=lista.filter(p=>p.estado==='definitivo').length;
  document.getElementById('statBorradores').textContent=lista.filter(p=>p.estado!=='definitivo').length;
}
function render(lista){
  tabla.innerHTML='';
  if(!lista.length) tabla.innerHTML='<tr><td colspan="7"><div class="empty-history">Todavía no hay presupuestos que coincidan con la búsqueda.</div></td></tr>';
  lista.forEach(p=>{
    const tr=document.createElement('tr');
    const estado=p.estado==='definitivo'?'Guardado definitivo':'Borrador';
    const fechaAct=p.actualizadoEn?new Date(p.actualizadoEn).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
    tr.innerHTML=`
      <td><strong>${htmlEscape(p.numero||'—')}</strong></td>
      <td class="history-date">${htmlEscape(fechaAR(p.fecha))}${fechaAct?`<small>Actualizado ${htmlEscape(fechaAct)}</small>`:''}</td>
      <td class="history-client"><strong>${htmlEscape(p.clienteNombre||'Sin cliente')}</strong><small>${htmlEscape([p.clienteCuit,p.clienteTelefono].filter(Boolean).join(' · '))}</small></td>
      <td><span class="badge ${p.estado==='definitivo'?'badge-ok':'badge-draft'}">${estado}</span></td>
      <td>${(p.items||[]).length}</td>
      <td class="money"><strong>${dinero(totalPresupuesto(p))}</strong></td>
      <td><div class="actions">
        <button class="icon-btn" data-action="abrir" data-numero="${htmlEscape(p.numero||'')}" data-estado="${htmlEscape(p.estado||'borrador')}">Abrir</button>
        <button class="icon-btn" data-action="duplicar" data-numero="${htmlEscape(p.numero||'')}" data-estado="${htmlEscape(p.estado||'borrador')}">Duplicar</button>
        <button class="icon-btn pdf-btn" data-action="pdf" data-numero="${htmlEscape(p.numero||'')}" data-estado="${htmlEscape(p.estado||'borrador')}" title="Exportar PDF"><span class="action-icon">↓</span>PDF</button>
      </div></td>`;
    tabla.appendChild(tr);
  });
  document.getElementById('contadorPresupuestos').textContent=`${lista.length} presupuesto${lista.length===1?'':'s'}`;
}
function buscarLista(){const q=buscar.value.toLowerCase().trim();const e=filtroEstado.value;return obtener().filter(p=>{const t=`${p.numero||''} ${p.clienteNombre||''} ${p.clienteCuit||''}`.toLowerCase();return(!q||t.includes(q))&&(!e||p.estado===e);});}
function filtrar(){render(buscarLista());}
function encontrar(numero,estado){return obtener().find(p=>String(p.numero)===String(numero)&&p.estado===estado);}

function abrirPresupuesto(numero,estado){const p=encontrar(numero,estado);if(!p)return;localStorage.setItem(DRAFT_KEY,JSON.stringify(p));location.href='nuevo.html';}
function duplicarPresupuesto(numero,estado){const p=encontrar(numero,estado);if(!p)return;const copia=JSON.parse(JSON.stringify(p));copia.numero='';copia.estado='borrador';copia.origenPresupuesto=p.numero;copia.actualizadoEn=new Date().toISOString();localStorage.setItem(DRAFT_KEY,JSON.stringify(copia));location.href='nuevo.html';}

function imprimirPresupuesto(p){
  const c=config(),totals=totalesPresupuesto(p);
  const filas=(p.items||[]).map(i=>{const neto=netoItem(i);const tasa=tasaItem(p,i);const v21=tasa===21?neto*.21:0;const v105=tasa===10.5?neto*.105:0;return `<tr><td class="num">${htmlEscape(entero(i.cantidad).toLocaleString('es-AR'))}</td><td>${htmlEscape(detalleItem(i))}</td><td class="num">${htmlEscape(dinero(i.precioActual??i.precio))}</td><td class="num">${htmlEscape(dinero(neto))}</td><td class="num">${v21?htmlEscape(dinero(v21)):''}</td><td class="num">${v105?htmlEscape(dinero(v105)):''}</td><td class="num">${htmlEscape(dinero(neto+v21+v105))}</td></tr>`;}).join('');
  const w=window.open('','_blank');if(!w){alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes y volvé a intentar.');return;}
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Presupuesto CH ${htmlEscape(p.numero)}</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:11px}.logo{max-width:205px;width:auto;height:auto;display:block}.brandline{height:4px;background:#f01616;margin:12px 0 10px}.company{color:#555;font-size:9px;line-height:1.45;margin-bottom:14px}.top{display:flex;justify-content:space-between;align-items:flex-start}.title{text-align:right}.title h1{margin:0;font-size:25px}.title strong{color:#f01616;font-size:17px}.client{background:#f3f3f3;border-left:5px solid #f01616;padding:11px 14px;margin:16px 0}.client-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:14px}.client span{display:block;color:#777;font-size:9px;text-transform:uppercase;font-weight:bold;margin-bottom:3px}.client strong{font-size:11px}table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#111;color:white;text-transform:uppercase;font-size:9px}th,td{border-bottom:1px solid #ddd;padding:7px}.num{text-align:right}tbody tr:nth-child(even){background:#fafafa}.totals{margin-left:auto;margin-top:15px;width:360px}.totals div{display:flex;justify-content:space-between;padding:6px 10px}.final{background:#111;color:#fff;font-size:17px;font-weight:bold}.final b{color:#fff}.obs{margin-top:18px;border-top:1px solid #ddd;padding-top:10px}.foot{margin-top:20px;border-top:3px solid #f01616;padding-top:8px;display:flex;justify-content:space-between;color:#555;font-size:9px}</style></head><body><div class="top"><img class="logo" src="${window.CH_LOGO_DATA||''}"><div class="title"><h1>PRESUPUESTO</h1><strong>Nº ${htmlEscape(p.numero||'—')}</strong></div></div><div class="brandline"></div><div class="company"><strong>${htmlEscape(c.empresaNombre)}</strong><br>${htmlEscape(contactoEmpresa(c))}</div><div class="client"><div class="client-grid"><div><span>Cliente</span><strong>${htmlEscape(p.clienteNombre||'Sin cliente')}</strong></div><div><span>CUIT</span><strong>${htmlEscape(p.clienteCuit||'—')}</strong></div><div><span>Teléfono</span><strong>${htmlEscape(p.clienteTelefono||'—')}</strong></div><div><span>Fecha</span><strong>${htmlEscape(fechaAR(p.fecha))}</strong></div></div></div><table><thead><tr><th>Cantidad</th><th style="width:38%">Detalle</th><th>Unitario</th><th>Sub. Total</th><th>21%</th><th>10,50%</th><th>Final c/IVA</th></tr></thead><tbody>${filas}</tbody></table><div class="totals"><div><span>Subtotal</span><strong>${htmlEscape(dinero(totals.subtotal))}</strong></div>${totals.iva21?`<div><span>IVA 21%</span><strong>${htmlEscape(dinero(totals.iva21))}</strong></div>`:''}${totals.iva105?`<div><span>IVA 10,5%</span><strong>${htmlEscape(dinero(totals.iva105))}</strong></div>`:''}<div class="final"><span>TOTAL</span><b>${htmlEscape(dinero(totals.total))}</b></div></div>${p.observaciones?`<div class="obs"><strong>Observaciones</strong><br>${htmlEscape(p.observaciones)}</div>`:''}<div class="foot"><span>${htmlEscape(c.empresaNombre)}</span><span>${htmlEscape([validezTexto(c),ivaTextoPresupuesto(p)].filter(Boolean).join(' · '))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();
}

function exportarPdf(numero,estado){
  const p=encontrar(numero,estado);if(!p)return;
  if((p.items||[]).some(i=>i.pendiente||num(i.precioActual??i.precio)===999)&&!confirm('Este presupuesto contiene productos con precio pendiente ($999). ¿Querés exportarlo igualmente?'))return;
  if(!window.jspdf||!window.jspdf.jsPDF){imprimirPresupuesto(p);return;}
  const c=config(),{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});if(typeof doc.autoTable!=='function'){imprimirPresupuesto(p);return;}
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=12,red=[240,22,22],black=[18,18,18],light=[246,246,246],gray=[105,105,105];
  if(window.CH_LOGO_DATA){
    try{
      const props=doc.getImageProperties(window.CH_LOGO_DATA);
      const logoH=18;
      const logoW=logoH*(props.width/props.height);
      doc.addImage(window.CH_LOGO_DATA,'PNG',M,9,logoW,logoH);
    }catch(e){}
  }
  doc.setFillColor(...red);doc.rect(M,29,W-M*2,1.6,'F');
  doc.setTextColor(...black);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('PRESUPUESTO',W-M,15,{align:'right'});doc.setTextColor(...red);doc.setFontSize(12);doc.text(`Nº ${p.numero||'—'}`,W-M,22,{align:'right'});
  doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...black);doc.text(c.empresaNombre,M,35);
  doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...gray);doc.text(doc.splitTextToSize(contactoEmpresa(c),W-M*2-4),M,39);
  doc.setFillColor(...light);doc.roundedRect(M,45,W-M*2,20,2,2,'F');
  const meta=[['CLIENTE',p.clienteNombre||'Sin cliente'],['CUIT',p.clienteCuit||'—'],['TELÉFONO',p.clienteTelefono||'—'],['FECHA',fechaAR(p.fecha)]];const colW=(W-M*2)/4;meta.forEach((m,idx)=>{const x=M+5+idx*colW;doc.setFontSize(6.5);doc.setTextColor(...gray);doc.setFont('helvetica','bold');doc.text(m[0],x,52);doc.setFontSize(9);doc.setTextColor(...black);doc.text(String(m[1]),x,59,{maxWidth:colW-10});});
  const filas=(p.items||[]).map(i=>{const neto=netoItem(i),tasa=tasaItem(p,i),v21=tasa===21?neto*.21:0,v105=tasa===10.5?neto*.105:0;return [entero(i.cantidad).toLocaleString('es-AR'),detalleItem(i),dinero(i.precioActual??i.precio),dinero(neto),v21?dinero(v21):'',v105?dinero(v105):'',dinero(neto+v21+v105)];});
  doc.autoTable({startY:70,head:[['Cantidad','Detalle','Unitario','Sub. Total','21%','10,50%','Final c/IVA']],body:filas,theme:'plain',margin:{left:M,right:M,bottom:32},styles:{font:'helvetica',fontSize:8.2,textColor:black,cellPadding:2.4,lineColor:[222,222,222],lineWidth:{bottom:.25}},headStyles:{fillColor:black,textColor:[255,255,255],fontStyle:'bold',fontSize:7.6,cellPadding:3},alternateRowStyles:{fillColor:[250,250,250]},columnStyles:{0:{halign:'right',cellWidth:21},1:{cellWidth:'auto'},2:{halign:'right',cellWidth:31},3:{halign:'right',cellWidth:34},4:{halign:'right',cellWidth:28},5:{halign:'right',cellWidth:28},6:{halign:'right',cellWidth:37}},didDrawPage(){doc.setFillColor(...red);doc.rect(M,H-15,W-M*2,1,'F');doc.setTextColor(...gray);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text(c.empresaNombre,M,H-9);doc.text([validezTexto(c),`Página ${doc.internal.getNumberOfPages()}`].filter(Boolean).join(' · '),W-M,H-9,{align:'right'});}});
  const totals=totalesPresupuesto(p);let y=(doc.lastAutoTable?.finalY||70)+7;if(y>H-47){doc.addPage();y=20;}
  const boxW=82,x=W-M-boxW;doc.setFontSize(8.5);doc.setTextColor(...black);doc.setFont('helvetica','normal');doc.text('Subtotal',x,y+5);doc.text(dinero(totals.subtotal),W-M,y+5,{align:'right'});let yy=y+11;if(totals.iva21){doc.text('IVA 21%',x,yy);doc.text(dinero(totals.iva21),W-M,yy,{align:'right'});yy+=6;}if(totals.iva105){doc.text('IVA 10,5%',x,yy);doc.text(dinero(totals.iva105),W-M,yy,{align:'right'});yy+=6;}doc.setFillColor(...black);doc.roundedRect(x,yy-4,boxW,13,1.5,1.5,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('TOTAL',x+5,yy+4);doc.setFontSize(14);doc.text(dinero(totals.total),W-M-4,yy+4,{align:'right'});
  if(p.observaciones){doc.setTextColor(...black);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('OBSERVACIONES',M,y+5);doc.setFont('helvetica','normal');doc.setTextColor(...gray);doc.text(doc.splitTextToSize(p.observaciones,150),M,y+11);}
  doc.save(`Presupuesto_CH_${p.numero||'SN'}_${safeName(p.clienteNombre)}.pdf`);
}

tabla.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const {action,numero,estado}=b.dataset;if(action==='abrir')abrirPresupuesto(numero,estado);if(action==='duplicar')duplicarPresupuesto(numero,estado);if(action==='pdf')exportarPdf(numero,estado);});
buscar.addEventListener('input',filtrar);filtroEstado.addEventListener('change',filtrar);document.getElementById('mostrarTodos').addEventListener('click',()=>{buscar.value='';filtroEstado.value='';render(obtener());});
actualizarStats();render(obtener());