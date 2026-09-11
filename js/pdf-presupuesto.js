(function(){
  function n(v){ return Number(v)||0; }
  function money(v){ return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0,maximumFractionDigits:2}).format(n(v)); }
  function fechaAR(value){ if(!value)return''; const [y,m,d]=String(value).split('-'); return y&&m&&d?`${d}/${m}/${y}`:value; }
  function safeName(value){ return String(value||'cliente').trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g,'_').replace(/^_+|_+$/g,'')||'cliente'; }
  function htmlEscape(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

  function ivaItem(item){ const modo=ivaGlobal.value; return modo==='individual'?n(item.ivaActual):n(modo); }
  function detallePdf(item){
    const partes=[item.producto,item.variante,item.medida].filter(Boolean);
    if(item.tranquera&&n(item.extra)>0){ const extra=extrasTranquera.find(e=>Number(e.factor)===Number(item.extra)); if(extra)partes.push(extra.label); }
    if(item.tiretas){
      if(n(item.dibujos)>0)partes.push(`${n(item.dibujos)} dibujo${n(item.dibujos)===1?'':'s'} artístico${n(item.dibujos)===1?'':'s'} por hoja`);
      if(n(item.cuadrados)>0)partes.push(`${n(item.cuadrados)} cuadrado${n(item.cuadrados)===1?'':'s'}`);
    }
    return partes.join(' · ');
  }
  function calcularTotales(){
    let subtotal=0,iva21=0,iva105=0;
    items.forEach(item=>{ const neto=calcItem(item); subtotal+=neto; const iva=ivaItem(item); if(iva===21)iva21+=neto*.21; if(iva===10.5)iva105+=neto*.105; });
    return {subtotal,iva21,iva105,total:subtotal+iva21+iva105};
  }
  function ivaTexto(){ const modo=ivaGlobal.value; return modo==='0'?'SIN IVA':modo==='21'?'IVA 21%':modo==='10.5'?'IVA 10,5%':'IVA SEGÚN PRODUCTO'; }

  function svgToPngDataUrl(svg,width=1400){
    return new Promise((resolve,reject)=>{
      if(!svg){reject(new Error('Sin logo'));return;}
      const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
      const url=URL.createObjectURL(blob); const img=new Image();
      img.onload=()=>{ const ratio=img.height/img.width; const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=Math.round(width*ratio); const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/png')); };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No se pudo renderizar logo'));};
      img.src=url;
    });
  }

  function imprimirComoPdf(){
    const numero=document.getElementById('numeroPresupuesto').textContent.trim();
    const cliente=document.getElementById('clienteNombre').value.trim();
    const cuit=document.getElementById('clienteCuit').value.trim();
    const telefono=document.getElementById('clienteTelefono').value.trim();
    const fecha=document.getElementById('fechaPresupuesto').value;
    const obs=document.getElementById('observaciones').value.trim();
    const totals=calcularTotales();
    const filas=items.map(item=>{ const neto=calcItem(item),iva=ivaItem(item),v21=iva===21?neto*.21:0,v105=iva===10.5?neto*.105:0; return `<tr><td class="num">${htmlEscape(n(item.cantidad).toLocaleString('es-AR',{maximumFractionDigits:2}))}</td><td>${htmlEscape(detallePdf(item))}</td><td class="num">${htmlEscape(money(item.precioActual))}</td><td class="num">${htmlEscape(money(neto))}</td><td class="num">${v21?htmlEscape(money(v21)):''}</td><td class="num">${v105?htmlEscape(money(v105)):''}</td><td class="num final">${htmlEscape(money(neto+v21+v105))}</td></tr>`; }).join('');
    const logo=window.CH_LOGO_SVG||'<div style="font-size:34px;font-weight:900;color:red">CH <span style="color:#111">Chourrout Hnos. S.A.</span></div>';
    const w=window.open('','_blank'); if(!w){alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes y volvé a intentar.');return;}
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Presupuesto CH ${htmlEscape(numero)}</title><style>
      @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:11px;background:#fff}.top{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #ef1b1b;padding-bottom:10px}.logo{width:285px}.logo svg{width:100%;height:auto;display:block}.tag{text-align:right}.tag .t{font-size:24px;font-weight:900}.tag .n{font-size:12px;color:#666;margin-top:3px}.contact{display:flex;gap:28px;color:#555;font-size:10px;margin:8px 0 14px}.meta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;background:#f5f5f5;border-radius:8px;padding:10px 12px;margin-bottom:12px}.meta b{display:block;font-size:8px;text-transform:uppercase;color:#777;margin-bottom:2px}.meta span{font-size:11px;font-weight:700}.titlebar{display:flex;justify-content:space-between;align-items:center;margin:8px 0}.titlebar h2{margin:0;font-size:17px}.pill{background:#111;color:#fff;border-radius:999px;padding:5px 10px;font-weight:700;font-size:9px}table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;border:1px solid #ddd;border-radius:7px;overflow:hidden}th{background:#111;color:#fff;text-transform:uppercase;font-size:8px;letter-spacing:.3px;padding:7px 6px;text-align:left}td{padding:7px 6px;border-bottom:1px solid #e5e5e5;vertical-align:middle}tbody tr:nth-child(even){background:#fafafa}.num{text-align:right}.final{font-weight:700}.c1{width:8%}.c2{width:35%}.c3{width:12%}.c4{width:13%}.c5,.c6{width:10%}.c7{width:12%}.summary{display:flex;justify-content:flex-end;margin-top:12px}.sumcard{width:350px;background:#111;color:#fff;border-radius:9px;padding:12px 14px}.sumrow{display:flex;justify-content:space-between;padding:3px 0}.sumrow.total{border-top:1px solid #555;margin-top:5px;padding-top:8px;font-size:17px;font-weight:900}.sumrow.total strong{color:#ff2a2a}.obs{margin-top:12px;background:#f7f7f7;border-left:4px solid #ef1b1b;padding:9px 11px}.obs b{display:block;margin-bottom:3px}.foot{position:fixed;left:10mm;right:10mm;bottom:4mm;display:flex;justify-content:space-between;color:#777;font-size:8px}
    </style></head><body><div class="top"><div class="logo">${logo}</div><div class="tag"><div class="t">PRESUPUESTO</div><div class="n">Nº ${htmlEscape(numero)}</div></div></div><div class="contact"><span>Ruta 205 km 181,5 · Saladillo, Bs. As.</span><span>Tel. 2345 498743</span></div><div class="meta"><div><b>Cliente</b><span>${htmlEscape(cliente||'-')}</span></div><div><b>CUIT</b><span>${htmlEscape(cuit||'-')}</span></div><div><b>Teléfono</b><span>${htmlEscape(telefono||'-')}</span></div><div><b>Fecha</b><span>${htmlEscape(fechaAR(fecha))}</span></div></div><div class="titlebar"><h2>Detalle</h2><div class="pill">${htmlEscape(ivaTexto())}</div></div><table><thead><tr><th class="c1">Cantidad</th><th class="c2">Detalle</th><th class="c3">Unitario</th><th class="c4">Subtotal</th><th class="c5">21%</th><th class="c6">10,5%</th><th class="c7">Final</th></tr></thead><tbody>${filas}</tbody></table><div class="summary"><div class="sumcard"><div class="sumrow"><span>Subtotal</span><strong>${htmlEscape(money(totals.subtotal))}</strong></div>${totals.iva21?`<div class="sumrow"><span>IVA 21%</span><strong>${htmlEscape(money(totals.iva21))}</strong></div>`:''}${totals.iva105?`<div class="sumrow"><span>IVA 10,5%</span><strong>${htmlEscape(money(totals.iva105))}</strong></div>`:''}<div class="sumrow total"><span>TOTAL</span><strong>${htmlEscape(money(totals.total))}</strong></div></div></div>${obs?`<div class="obs"><b>Observaciones</b>${htmlEscape(obs)}</div>`:''}<div class="foot"><span>Chourrout Hnos. S.A. · Artículos rurales</span><span>${htmlEscape(ivaTexto())}</span></div><script>window.onload=function(){setTimeout(function(){window.print();},250)}<\/script></body></html>`);
    w.document.close();
  }

  async function generarPdfReal(){
    if(!Array.isArray(items)||!items.length){alert('Agregá al menos un producto antes de exportar el PDF.');return;}
    if(items.some(i=>i.pendiente||n(i.precioActual)===999)&&!confirm('Hay productos con precio pendiente ($999). ¿Querés exportar el PDF igualmente?'))return;
    if(!window.jspdf||!window.jspdf.jsPDF){imprimirComoPdf();return;}
    const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}); if(typeof doc.autoTable!=='function'){imprimirComoPdf();return;}
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),margin=10; const red=[239,27,27],black=[18,18,18],gray=[105,105,105],light=[246,246,246];
    try{ const logoPng=await svgToPngDataUrl(window.CH_LOGO_SVG,1600); doc.addImage(logoPng,'PNG',margin,9,92,17); }catch(e){ doc.setTextColor(...red);doc.setFont('helvetica','bold');doc.setFontSize(28);doc.text('CH',margin,21);doc.setTextColor(...black);doc.setFontSize(17);doc.text('Chourrout Hnos. S.A.',31,20); }
    doc.setDrawColor(...red);doc.setLineWidth(1.1);doc.line(margin,31,pageW-margin,31);
    const numero=document.getElementById('numeroPresupuesto').textContent.trim(),cliente=document.getElementById('clienteNombre').value.trim(),cuit=document.getElementById('clienteCuit').value.trim(),telefono=document.getElementById('clienteTelefono').value.trim(),fecha=document.getElementById('fechaPresupuesto').value,obs=document.getElementById('observaciones').value.trim();
    doc.setTextColor(...black);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('PRESUPUESTO',pageW-margin,16,{align:'right'});doc.setTextColor(...gray);doc.setFontSize(9);doc.text(`Nº ${numero}`,pageW-margin,22,{align:'right'});
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text('Ruta 205 km 181,5 · Saladillo, Bs. As.',margin,36);doc.text('Tel. 2345 498743',pageW-margin,36,{align:'right'});
    doc.setFillColor(...light);doc.roundedRect(margin,40,pageW-margin*2,17,2,2,'F');
    const info=[['CLIENTE',cliente||'-'],['CUIT',cuit||'-'],['TELÉFONO',telefono||'-'],['FECHA',fechaAR(fecha)||'-']]; const colW=(pageW-margin*2)/4;
    info.forEach((it,idx)=>{const x=margin+idx*colW+4;doc.setTextColor(...gray);doc.setFont('helvetica','bold');doc.setFontSize(6.8);doc.text(it[0],x,46);doc.setTextColor(...black);doc.setFontSize(9.2);doc.text(String(it[1]),x,52);});
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Detalle',margin,64);doc.setFillColor(...black);doc.roundedRect(pageW-margin-34,59,34,7,3.5,3.5,'F');doc.setTextColor(255,255,255);doc.setFontSize(7.5);doc.text(ivaTexto(),pageW-margin-17,63.7,{align:'center'});
    const filas=items.map(item=>{const neto=calcItem(item),iva=ivaItem(item),v21=iva===21?neto*.21:0,v105=iva===10.5?neto*.105:0;return[n(item.cantidad).toLocaleString('es-AR',{maximumFractionDigits:2}),detallePdf(item),money(item.precioActual),money(neto),v21?money(v21):'',v105?money(v105):'',money(neto+v21+v105)];});
    doc.autoTable({startY:68,head:[['Cantidad','Detalle','Unitario','Subtotal','21%','10,5%','Final']],body:filas,theme:'plain',margin:{left:margin,right:margin,bottom:35},styles:{font:'helvetica',fontSize:8.2,textColor:black,cellPadding:2.1,valign:'middle',lineColor:[225,225,225],lineWidth:{bottom:.15}},headStyles:{fillColor:black,textColor:[255,255,255],fontStyle:'bold',fontSize:7.4,cellPadding:2.3},alternateRowStyles:{fillColor:[249,249,249]},columnStyles:{0:{halign:'right',cellWidth:20},1:{cellWidth:'auto'},2:{halign:'right',cellWidth:30},3:{halign:'right',cellWidth:32},4:{halign:'right',cellWidth:25},5:{halign:'right',cellWidth:25},6:{halign:'right',cellWidth:34,fontStyle:'bold'}},didDrawPage(){doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...gray);doc.text('Chourrout Hnos. S.A. · Artículos rurales',margin,pageH-7);doc.text(`Página ${doc.internal.getNumberOfPages()}`,pageW-margin,pageH-7,{align:'right'});}});
    const totals=calcularTotales(); let y=(doc.lastAutoTable?.finalY||68)+6; if(y>pageH-48){doc.addPage();y=18;}
    const boxW=74,boxH=totals.iva21||totals.iva105?28:21,boxX=pageW-margin-boxW;doc.setFillColor(...black);doc.roundedRect(boxX,y,boxW,boxH,2.5,2.5,'F');doc.setFontSize(8);doc.setTextColor(220,220,220);doc.setFont('helvetica','normal');doc.text('Subtotal',boxX+5,y+7);doc.text(money(totals.subtotal),boxX+boxW-5,y+7,{align:'right'});let yy=y+12;if(totals.iva21){doc.text('IVA 21%',boxX+5,yy);doc.text(money(totals.iva21),boxX+boxW-5,yy,{align:'right'});yy+=5;}if(totals.iva105){doc.text('IVA 10,5%',boxX+5,yy);doc.text(money(totals.iva105),boxX+boxW-5,yy,{align:'right'});yy+=5;}doc.setDrawColor(90,90,90);doc.line(boxX+5,yy,boxX+boxW-5,yy);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(...red);doc.text('TOTAL',boxX+5,yy+7);doc.text(money(totals.total),boxX+boxW-5,yy+7,{align:'right'});
    if(obs){doc.setTextColor(...black);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text('Observaciones',margin,y+5);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...gray);doc.text(doc.splitTextToSize(obs,boxX-margin-8),margin,y+10);}
    doc.save(`Presupuesto_CH_${numero}_${safeName(cliente)}.pdf`);
  }
  const btn=document.getElementById('generarPdf'); if(btn){const nuevo=btn.cloneNode(true);btn.parentNode.replaceChild(nuevo,btn);nuevo.addEventListener('click',generarPdfReal);}
})();