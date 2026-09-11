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

  function generarPdfReal(){
    if(!Array.isArray(items) || !items.length){
      alert('Agregá al menos un producto antes de exportar el PDF.');
      return;
    }
    if(items.some(i=>i.pendiente||n(i.precioActual)===999)){
      if(!confirm('Hay productos con precio pendiente ($999). ¿Querés exportar el PDF igualmente?')) return;
    }
    if(!window.jspdf || !window.jspdf.jsPDF){
      alert('No se pudo cargar el generador de PDF. Revisá la conexión a internet y volvé a intentar.');
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

    // Marca inspirada en el presupuesto original.
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
      return [
        n(item.cantidad).toLocaleString('es-AR',{maximumFractionDigits:2}),
        detallePdf(item),
        money(item.precioActual),
        money(neto),
        v21?money(v21):'',
        v105?money(v105):'',
        money(neto+v21+v105)
      ];
    });

    const totals=calcularTotales();
    filas.push(['','','','', '', '', '']);
    filas.push([
      '',
      'TOTALES',
      '',
      money(totals.subtotal),
      totals.iva21?money(totals.iva21):'',
      totals.iva105?money(totals.iva105):'',
      money(totals.total)
    ]);

    doc.autoTable({
      startY:62,
      head:[['Cantidad','Detalle','Unitario','Sub. Total','21%','10,50%','Final c/IVA']],
      body:filas,
      theme:'grid',
      margin:{left:margin,right:margin,bottom:24},
      styles:{font:'helvetica',fontSize:8.6,textColor:black,lineColor:[30,30,30],lineWidth:0.25,cellPadding:1.8,valign:'middle'},
      headStyles:{fillColor:[255,255,255],textColor:black,fontStyle:'bold',lineColor:[20,20,20],lineWidth:0.35},
      columnStyles:{
        0:{halign:'right',cellWidth:22},
        1:{cellWidth:'auto'},
        2:{halign:'right',cellWidth:31},
        3:{halign:'right',cellWidth:34},
        4:{halign:'right',cellWidth:29},
        5:{halign:'right',cellWidth:29},
        6:{halign:'right',cellWidth:36}
      },
      didParseCell(data){
        if(data.section==='body' && data.row.index===filas.length-1){
          data.cell.styles.fontStyle='bold';
          if(data.column.index===6) data.cell.styles.textColor=red;
        }
      },
      didDrawPage(data){
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

    // Aclaración breve del modo de IVA aplicado.
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
    // Reemplaza el handler anterior sin tocar la lógica del resto del presupuesto.
    const nuevo=btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevo,btn);
    nuevo.addEventListener('click',generarPdfReal);
  }
})();
