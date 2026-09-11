(function(){
  function n(v){ return Number(v)||0; }
  function money(v){ return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0,maximumFractionDigits:2}).format(n(v)); }
  function fechaAR(value){
    if(!value) return '';
    const [y,m,d]=String(value).split('-');
    if(!y||!m||!d) return value;
    return `${d}/${m}/${y}`;
  }
  function safeName(value){ return String(value||'cliente').trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g,'_').replace(/^_+|_+$/g,'') || 'cliente'; }

  function ivaItem(item){
    const modo=ivaGlobal.value;
    if(modo==='individual') return n(item.ivaActual);
    return n(modo);
  }

  function detallePdf(item){
    const partes=[item.producto,item.variante,item.medida].filter(Boolean);
    if(item.tranquera && n(item.extra)>0){
      const extra=extrasTranquera.find(e=>Number(e.factor)===Number(item.extra));
      if(extra) partes.push(extra.label);
    }
    if(item.tiretas){
      if(n(item.dibujos)>0) partes.push(`${n(item.dibujos)} dibujo${n(item.dibujos)===1?'':'s'} artístico${n(item.dibujos)===1?'':'s'} por hoja`);
      if(n(item.cuadrados)>0) partes.push(`${n(item.cuadrados)} cuadrado${n(item.cuadrados)===1?'':'s'}`);
    }
    return partes.join(' - ');
  }

  function calcularTotales(){
    let subtotal=0,iva21=0,iva105=0;
    items.forEach(item=>{
      const neto=calcItem(item);
      subtotal+=neto;
      const iva=ivaItem(item);
      if(iva===21) iva21+=neto*.21;
      if(iva===10.5) iva105+=neto*.105;
    });
    return {subtotal,iva21,iva105,total:subtotal+iva21+iva105};
  }

  function htmlEscape(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function imprimirComoPdf(){
    const numero=document.getElementById('numeroPresupuesto').textContent.trim();
    const cliente=document.getElementById('clienteNombre').value.trim();
    const cuit=document.getElementById('clienteCuit').value.trim();
    const telefono=document.getElementById('clienteTelefono').value.trim();
    const fecha=document.getElementById('fechaPresupuesto').value;
    const obs=document.getElementById('observaciones').value.trim();
    const totals=calcularTotales();

    const filas=items.map(item=>{
      const neto=calcItem(item);
      const iva=ivaItem(item);
      const v21=iva===21?neto*.21:0;
      const v105=iva===10.5?neto*.105:0;
      return `<tr>
        <td class="num">${htmlEscape(n(item.cantidad).toLocaleString('es-AR',{maximumFractionDigits:2}))}</td>
        <td>${htmlEscape(detallePdf(item))}</td>
        <td class="num">${htmlEscape(money(item.precioActual))}</td>
        <td class="num">${htmlEscape(money(neto))}</td>
        <td class="num">${v21?htmlEscape(money(v21)):''}</td>
        <td class="num">${v105?htmlEscape(money(v105)):''}</td>
        <td class="num">${htmlEscape(money(neto+v21+v105))}</td>
      </tr>`;
    }).join('');

    const modo=ivaGlobal.value;
    const ivaTexto=modo==='0'?'Sin IVA':modo==='21'?'IVA 21% aplicado a todos los productos':modo==='10.5'?'IVA 10,5% aplicado a todos los productos':'IVA según cada producto';

    const w=window.open('','_blank');
    if(!w){
      alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para este sitio y volvé a intentar.');
      return;
    }
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Presupuesto CH ${htmlEscape(numero)}</title><style>
      @page{size:A4 landscape;margin:12mm}
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:12px}
      .head{display:flex;align-items:flex-end;gap:16px;margin-bottom:18px}.ch{font-size:52px;font-weight:900;color:#f01616;line-height:.8;letter-spacing:-6px}.name{font-size:25px;font-weight:800}
      .contact{display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;font-weight:700;margin:6px 0 20px}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 30px;margin-bottom:10px}.meta strong{display:inline-block;min-width:78px}.title{font-size:20px;font-weight:800;font-style:italic;margin:8px 0}
      table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1.3px solid #111;padding:6px 7px;vertical-align:middle}th{font-weight:800;text-align:left}.num{text-align:right}.c1{width:8%}.c2{width:36%}.c3{width:12%}.c4{width:13%}.c5,.c6{width:10%}.c7{width:13%}
      tfoot td{font-weight:800}.total-final{color:#e31515;font-size:14px}.obs{margin-top:14px}.obs strong{display:block;margin-bottom:4px}.foot{margin-top:18px;display:flex;justify-content:space-between;font-size:10px;color:#555}
      @media print{button{display:none}}
    </style></head><body>
      <div class="head"><div class="ch">CH</div><div class="name">Chourrout Hnos. S.A.</div></div>
      <div class="contact"><div>Ruta 205 km 181,5</div><div>Tel. 2345 498743</div><div>7260 Saladillo Bs. As.</div></div>
      <div class="meta"><div><strong>Fecha:</strong> ${htmlEscape(fechaAR(fecha))}</div><div><strong>Presupuesto Nº:</strong> ${htmlEscape(numero)}</div><div><strong>Señor/es:</strong> ${htmlEscape(cliente||'-')}</div><div><strong>Teléfono:</strong> ${htmlEscape(telefono||'-')}</div><div><strong>CUIT:</strong> ${htmlEscape(cuit||'-')}</div></div>
      <div class="title">Presupuesto</div>
      <table><thead><tr><th class="c1">Cantidad</th><th class="c2">Detalle</th><th class="c3">Unitario</th><th class="c4">Sub. Total</th><th class="c5">21%</th><th class="c6">10,50%</th><th class="c7">Final c/IVA</th></tr></thead><tbody>${filas}</tbody><tfoot><tr><td></td><td>TOTALES</td><td></td><td class="num">${htmlEscape(money(totals.subtotal))}</td><td class="num">${totals.iva21?htmlEscape(money(totals.iva21)):''}</td><td class="num">${totals.iva105?htmlEscape(money(totals.iva105)):''}</td><td class="num total-final">${htmlEscape(money(totals.total))}</td></tr></tfoot></table>
      ${obs?`<div class="obs"><strong>Observaciones</strong>${htmlEscape(obs)}</div>`:''}
      <div class="foot"><div>Chourrout Hnos. S.A. · Ruta 205 km 181,5 · Saladillo, Buenos Aires</div><div>${htmlEscape(ivaTexto)}</div></div>
      <script>window.onload=function(){setTimeout(function(){window.print();},250)}<\/script>
    </body></html>`);
    w.document.close();
  }

  function generarPdfReal(){
    if(!Array.isArray(items) || !items.length){
      alert('Agregá al menos un producto antes de exportar el PDF.');
      return;
    }
    if(items.some(i=>i.pendiente||n(i.precioActual)===999)){
      if(!confirm('Hay productos con precio pendiente ($999). ¿Querés exportar el PDF igualmente?')) return;
    }
    if(!window.jspdf || !window.jspdf.jsPDF){
      imprimirComoPdf();
      return;
    }

    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    const pageW=doc.internal.pageSize.getWidth();
    const pageH=doc.internal.pageSize.getHeight();
    const margin=10;
    const red=[238,22,22];
    const black=[20,20,20];
    const gray=[90,90,90];

    doc.setTextColor(...red);
    doc.setFont('helvetica','bold');
    doc.setFontSize(30);
    doc.text('CH',margin,21);
    doc.setTextColor(...black);
    doc.setFontSize(18);
    doc.text('Chourrout Hnos. S.A.',31,20);

    doc.setFontSize(9.5);
    doc.setFont('helvetica','bold');
    doc.text('Ruta 205 km 181,5',58,31,{align:'center'});
    doc.text('Tel. 2345 498743',145,31,{align:'center'});
    doc.text('7260 Saladillo Bs. As.',pageW-52,31,{align:'center'});

    const numero=document.getElementById('numeroPresupuesto').textContent.trim();
    const cliente=document.getElementById('clienteNombre').value.trim();
    const cuit=document.getElementById('clienteCuit').value.trim();
    const telefono=document.getElementById('clienteTelefono').value.trim();
    const fecha=document.getElementById('fechaPresupuesto').value;
    const obs=document.getElementById('observaciones').value.trim();

    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    doc.text(`Fecha: ${fechaAR(fecha)}`,margin,43);
    doc.text(`Señor/es: ${cliente||'-'}`,margin,49);
    doc.text(`CUIT: ${cuit||'-'}`,margin,55);
    if(telefono) doc.text(`Teléfono: ${telefono}`,105,49);
    doc.setFont('helvetica','bold');
    doc.text(`Presupuesto Nº ${numero}`,pageW-margin,43,{align:'right'});

    const modo=ivaGlobal.value;
    const filas=items.map(item=>{
      const neto=calcItem(item);
      const iva=ivaItem(item);
      const v21=iva===21?neto*.21:0;
      const v105=iva===10.5?neto*.105:0;
      return [n(item.cantidad).toLocaleString('es-AR',{maximumFractionDigits:2}),detallePdf(item),money(item.precioActual),money(neto),v21?money(v21):'',v105?money(v105):'',money(neto+v21+v105)];
    });

    const totals=calcularTotales();
    filas.push(['','','','', '', '', '']);
    filas.push(['','TOTALES','',money(totals.subtotal),totals.iva21?money(totals.iva21):'',totals.iva105?money(totals.iva105):'',money(totals.total)]);

    if(typeof doc.autoTable!=='function'){
      imprimirComoPdf();
      return;
    }

    doc.autoTable({
      startY:62,
      head:[['Cantidad','Detalle','Unitario','Sub. Total','21%','10,50%','Final c/IVA']],
      body:filas,
      theme:'grid',
      margin:{left:margin,right:margin,bottom:24},
      styles:{font:'helvetica',fontSize:8.6,textColor:black,lineColor:[30,30,30],lineWidth:0.25,cellPadding:1.8,valign:'middle'},
      headStyles:{fillColor:[255,255,255],textColor:black,fontStyle:'bold',lineColor:[20,20,20],lineWidth:0.35},
      columnStyles:{0:{halign:'right',cellWidth:22},1:{cellWidth:'auto'},2:{halign:'right',cellWidth:31},3:{halign:'right',cellWidth:34},4:{halign:'right',cellWidth:29},5:{halign:'right',cellWidth:29},6:{halign:'right',cellWidth:36}},
      didParseCell(data){
        if(data.section==='body' && data.row.index===filas.length-1){
          data.cell.styles.fontStyle='bold';
          if(data.column.index===6) data.cell.styles.textColor=red;
        }
      },
      didDrawPage(){
        doc.setFont('helvetica','normal');
        doc.setFontSize(8);
        doc.setTextColor(...gray);
        doc.text('Chourrout Hnos. S.A. · Ruta 205 km 181,5 · Saladillo, Buenos Aires',margin,pageH-8);
        doc.text(`Página ${doc.internal.getNumberOfPages()}`,pageW-margin,pageH-8,{align:'right'});
      }
    });

    let y=(doc.lastAutoTable?.finalY||62)+7;
    if(obs){
      if(y>pageH-35){doc.addPage();y=18;}
      doc.setTextColor(...black);
      doc.setFont('helvetica','bold');
      doc.setFontSize(9.5);
      doc.text('Observaciones',margin,y);
      doc.setFont('helvetica','normal');
      doc.setFontSize(9);
      const lines=doc.splitTextToSize(obs,pageW-margin*2);
      doc.text(lines,margin,y+5);
    }

    const ivaTexto=modo==='0'?'Sin IVA':modo==='21'?'IVA 21% aplicado a todos los productos':modo==='10.5'?'IVA 10,5% aplicado a todos los productos':'IVA según cada producto';
    const footerY=pageH-15;
    doc.setFont('helvetica','italic');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(ivaTexto,pageW-margin,footerY,{align:'right'});

    const filename=`Presupuesto_CH_${numero}_${safeName(cliente)}.pdf`;
    doc.save(filename);
  }

  const btn=document.getElementById('generarPdf');
  if(btn){
    const nuevo=btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevo,btn);
    nuevo.addEventListener('click',generarPdfReal);
  }
})();
