(function(){
  const DRAFT_KEY='chourrout_presupuesto_actual';
  const EXTRA_DIBUJO_TIRETAS=77000;
  const EXTRA_CUADRADOS_TIRETAS=106000;

  function n(v){return Number(v)||0;}
  function entero(v){return Math.max(0,Math.round(n(v)));}
  function dinero(v){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0,maximumFractionDigits:2}).format(n(v));}
  function fechaAR(v){if(!v)return'';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:v;}
  function safeName(v){return String(v||'cliente').trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g,'_').replace(/^_+|_+$/g,'')||'cliente';}
  function leerDraft(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')||{};}catch(e){return{};}}
  function config(){const c=window.CH_CONFIG||{};return{empresaNombre:c.empresaNombre||'Chourrout Hnos. S.A.',empresaDireccion:c.empresaDireccion||'Ruta 205 km 181,5',empresaLocalidad:c.empresaLocalidad||'Saladillo, Buenos Aires',empresaTelefono:c.empresaTelefono||'2345 498743',empresaCuit:c.empresaCuit||'',empresaEmail:c.empresaEmail||'',validezDias:Math.max(0,Math.round(Number(c.validezDias)||0))};}
  function contacto(c){return[c.empresaDireccion,c.empresaLocalidad,c.empresaTelefono?`Tel. ${c.empresaTelefono}`:'',c.empresaCuit?`CUIT ${c.empresaCuit}`:'',c.empresaEmail].filter(Boolean).join(' · ');}
  function validez(c){return c.validezDias?`Validez: ${c.validezDias} día${c.validezDias===1?'':'s'}`:'';}
  function modoIva(){return String(document.getElementById('ivaGlobal')?.value??leerDraft().ivaGlobal??'0');}
  function ivaTexto(){const m=modoIva();return m==='21'?'IVA 21%':m==='10.5'?'IVA 10,5%':m==='individual'?'IVA SEGÚN PRODUCTO':'SIN IVA';}
  function tasaItem(i){const m=modoIva();return m==='individual'?n(i.ivaActual):n(m);}
  function calcItem(i){let neto=entero(i.cantidad)*n(i.precioActual??i.precio)*(1+n(i.extra));if(i.tiretas){neto+=entero(i.dibujos??i.cantidadDibujo)*EXTRA_DIBUJO_TIRETAS;neto+=entero(i.cuadrados??i.cantidadCuadrados)*EXTRA_CUADRADOS_TIRETAS;}return neto;}
  function detalle(i){const p=[i.producto,i.variante,i.medida].filter(Boolean);if(i.tranquera&&n(i.extra)>0){const mapa={0.2:'Con diagonal +20%',0.3:'Corral · 6 tablas 1x4 · alto 1,40 m +30%',0.5:'Corral · 5 tablas 1x6 · alto 1,40 m +50%',1.4:'Tranquera ciega +140%'};p.push(mapa[n(i.extra)]||`Adicional +${Math.round(n(i.extra)*100)}%`);}if(i.tiretas){const d=entero(i.dibujos),c=entero(i.cuadrados);if(d)p.push(`${d} dibujo${d===1?'':'s'} artístico${d===1?'':'s'} por hoja`);if(c)p.push(`${c} cuadrado${c===1?'':'s'}`);}return p.join(' · ');}
  function snapshot(){const d=leerDraft();return{...d,numero:document.getElementById('numeroPresupuesto')?.textContent.trim()||d.numero||'SN',clienteNombre:document.getElementById('clienteNombre')?.value.trim()||d.clienteNombre||'',clienteCuit:document.getElementById('clienteCuit')?.value.trim()||d.clienteCuit||'',clienteTelefono:document.getElementById('clienteTelefono')?.value.trim()||d.clienteTelefono||'',fecha:document.getElementById('fechaPresupuesto')?.value||d.fecha||'',observaciones:document.getElementById('observaciones')?.value.trim()||d.observaciones||'',items:Array.isArray(d.items)?d.items:[]};}
  function totales(items){let subtotal=0,iva21=0,iva105=0;items.forEach(i=>{const neto=calcItem(i),t=tasaItem(i);subtotal+=neto;if(t===21)iva21+=neto*.21;if(t===10.5)iva105+=neto*.105;});return{subtotal,iva21,iva105,total:subtotal+iva21+iva105};}

  async function esperarLogo(){try{if(window.CH_LOGO_READY)await window.CH_LOGO_READY;}catch(e){}return window.CH_LOGO_DATA||'';}
  function dimensionesLogo(dataUrl,maxW,maxH){return new Promise(resolve=>{if(!dataUrl){resolve({w:maxW,h:maxH});return;}const img=new Image();img.onload=()=>{const r=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight);resolve({w:img.naturalWidth*r,h:img.naturalHeight*r});};img.onerror=()=>resolve({w:maxW,h:maxH});img.src=dataUrl;});}

  async function generar(){
    const p=snapshot();
    if(!p.items.length){alert('Agregá al menos un producto antes de exportar el PDF.');return;}
    if(p.items.some(i=>i.pendiente||n(i.precioActual??i.precio)===999)&&!confirm('Hay productos con precio pendiente ($999). ¿Querés exportar el PDF igualmente?'))return;
    if(!window.jspdf?.jsPDF){alert('No se pudo cargar el generador de PDF. Recargá la página e intentá nuevamente.');return;}

    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    if(typeof doc.autoTable!=='function'){alert('No se pudo cargar el módulo de tablas del PDF. Recargá la página e intentá nuevamente.');return;}

    const c=config(),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=10;
    const red=[239,27,27],black=[18,18,18],gray=[105,105,105],light=[246,246,246];
    const logo=await esperarLogo();
    if(logo){try{const s=await dimensionesLogo(logo,84,20);doc.addImage(logo,'PNG',M,9,s.w,s.h);}catch(e){console.warn('No se pudo insertar el logo.',e);}}

    doc.setTextColor(...black);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('PRESUPUESTO',W-M,16,{align:'right'});
    doc.setTextColor(...gray);doc.setFontSize(9);doc.text(`Nº ${p.numero}`,W-M,22,{align:'right'});
    doc.setDrawColor(...red);doc.setLineWidth(1.1);doc.line(M,32,W-M,32);
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...black);doc.text(c.empresaNombre,M,37);
    doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.setTextColor(...gray);doc.text(doc.splitTextToSize(contacto(c),W-M*2-5),M,41);

    doc.setFillColor(...light);doc.roundedRect(M,47,W-M*2,17,2,2,'F');
    const info=[['CLIENTE',p.clienteNombre||'-'],['CUIT',p.clienteCuit||'-'],['TELÉFONO',p.clienteTelefono||'-'],['FECHA',fechaAR(p.fecha)||'-']],colW=(W-M*2)/4;
    info.forEach((it,idx)=>{const x=M+idx*colW+4;doc.setTextColor(...gray);doc.setFont('helvetica','bold');doc.setFontSize(6.8);doc.text(it[0],x,53);doc.setTextColor(...black);doc.setFontSize(9.2);doc.text(String(it[1]),x,59,{maxWidth:colW-8});});

    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Detalle',M,71);
    doc.setFillColor(...black);doc.roundedRect(W-M-38,66,38,7,3.5,3.5,'F');doc.setTextColor(255,255,255);doc.setFontSize(7.5);doc.text(ivaTexto(),W-M-19,70.7,{align:'center'});

    const filas=p.items.map(i=>{const neto=calcItem(i),t=tasaItem(i),v21=t===21?neto*.21:0,v105=t===10.5?neto*.105:0;return[entero(i.cantidad).toLocaleString('es-AR'),detalle(i),dinero(i.precioActual??i.precio),dinero(neto),v21?dinero(v21):'',v105?dinero(v105):'',dinero(neto+v21+v105)];});
    doc.autoTable({startY:75,head:[['Cantidad','Detalle','Unitario','Subtotal','21%','10,5%','Final']],body:filas,theme:'plain',margin:{left:M,right:M,bottom:35},styles:{font:'helvetica',fontSize:8.2,textColor:black,cellPadding:2.1,valign:'middle',lineColor:[225,225,225],lineWidth:{bottom:.15}},headStyles:{fillColor:black,textColor:[255,255,255],fontStyle:'bold',fontSize:7.4,cellPadding:2.3},alternateRowStyles:{fillColor:[249,249,249]},columnStyles:{0:{halign:'right',cellWidth:20},1:{cellWidth:'auto'},2:{halign:'right',cellWidth:30},3:{halign:'right',cellWidth:32},4:{halign:'right',cellWidth:25},5:{halign:'right',cellWidth:25},6:{halign:'right',cellWidth:34,fontStyle:'bold'}},didDrawPage(){doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...gray);doc.text(c.empresaNombre,M,H-7);doc.text([validez(c),`Página ${doc.internal.getNumberOfPages()}`].filter(Boolean).join(' · '),W-M,H-7,{align:'right'});}});

    const t=totales(p.items);let y=(doc.lastAutoTable?.finalY||75)+6;if(y>H-48){doc.addPage();y=18;}
    const boxW=74,boxH=t.iva21||t.iva105?28:21,x=W-M-boxW;doc.setFillColor(...black);doc.roundedRect(x,y,boxW,boxH,2.5,2.5,'F');doc.setFontSize(8);doc.setTextColor(220,220,220);doc.setFont('helvetica','normal');doc.text('Subtotal',x+5,y+7);doc.text(dinero(t.subtotal),x+boxW-5,y+7,{align:'right'});let yy=y+12;if(t.iva21){doc.text('IVA 21%',x+5,yy);doc.text(dinero(t.iva21),x+boxW-5,yy,{align:'right'});yy+=5;}if(t.iva105){doc.text('IVA 10,5%',x+5,yy);doc.text(dinero(t.iva105),x+boxW-5,yy,{align:'right'});yy+=5;}doc.setDrawColor(90,90,90);doc.line(x+5,yy,x+boxW-5,yy);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(255,255,255);doc.text('TOTAL',x+5,yy+7);doc.text(dinero(t.total),x+boxW-5,yy+7,{align:'right'});
    if(p.observaciones){doc.setTextColor(...black);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text('Observaciones',M,y+5);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...gray);doc.text(doc.splitTextToSize(p.observaciones,x-M-8),M,y+10);}
    doc.save(`Presupuesto_CH_${p.numero}_${safeName(p.clienteNombre)}.pdf`);
  }

  function conectar(){const btn=document.getElementById('generarPdf');if(!btn)return;const nuevo=btn.cloneNode(true);btn.replaceWith(nuevo);nuevo.addEventListener('click',e=>{e.preventDefault();generar().catch(err=>{console.error(err);alert(`No se pudo generar el PDF: ${err.message||err}`);});});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',conectar);else conectar();
})();