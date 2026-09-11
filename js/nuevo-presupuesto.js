const catalogo = [
  {id:'P0002',categoria:'Postes de quebracho',producto:'Entero',variante:'Colorado',medida:'2,20 m',unidad:'unidad',precio:49900,iva:21,pendiente:false},
  {id:'P0003',categoria:'Postes de quebracho',producto:'Entero',variante:'Colorado',medida:'2,40 m',unidad:'unidad',precio:53900,iva:21,pendiente:false},
  {id:'P0044',categoria:'Varillas de curupay',producto:'Varilla de curupay',variante:'',medida:'1 1/2 x 2 x 1,20 m',unidad:'unidad',precio:2560,iva:21,pendiente:false},
  {id:'P0045',categoria:'Varillas de curupay',producto:'Varilla de curupay',variante:'',medida:'1 1/2 x 2 x 1,40 m',unidad:'unidad',precio:3170,iva:21,pendiente:false},
  {id:'P0049',categoria:'Tablas de curupay',producto:'Tabla de curupay',variante:'',medida:'1 x 4',unidad:'metro lineal',precio:7680,iva:10.5,pendiente:false},
  {id:'P0066',categoria:'Tranqueras',producto:'Tranquera',variante:'Curupay',medida:'4,00 m',unidad:'unidad',precio:373000,iva:21,pendiente:false,tranquera:true},
  {id:'P0067',categoria:'Tranqueras',producto:'Tranquera',variante:'Rostrata',medida:'4,00 m',unidad:'unidad',precio:260000,iva:21,pendiente:false,tranquera:true},
  {id:'P0118',categoria:'Alambres',producto:'Acindar 17/15',variante:'',medida:'',unidad:'rollo',precio:999,iva:21,pendiente:true},
  {id:'P0119',categoria:'Alambres',producto:'Alambre de manea',variante:'',medida:'',unidad:'kg',precio:999,iva:21,pendiente:true}
];

const extrasTranquera = [
  {label:'Sin adicional',factor:0},
  {label:'Con diagonal +20%',factor:.20},
  {label:'Corral · 6 tablas 1x4 · alto 1,40 m +30%',factor:.30},
  {label:'Corral · 5 tablas 1x6 · alto 1,40 m +50%',factor:.50},
  {label:'Tranquera ciega +140%',factor:1.40}
];

let items = [];
let itemSeq = 1;
const buscar = document.getElementById('buscarProducto');
const resultados = document.getElementById('resultadosProducto');
const contenedor = document.getElementById('itemsPresupuesto');
const ivaGlobal = document.getElementById('ivaGlobal');

function dinero(v){
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0,maximumFractionDigits:2}).format(v || 0);
}

function descripcion(p){
  return [p.producto,p.variante,p.medida].filter(Boolean).join(' · ');
}

function hoy(){
  const d = new Date();
  const local = new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  document.getElementById('fechaPresupuesto').value = local;
}

function buscarProductos(){
  const q = buscar.value.trim().toLowerCase();
  if(!q){resultados.classList.remove('open'); resultados.innerHTML=''; return;}
  const lista = catalogo.filter(p => `${p.categoria} ${p.producto} ${p.variante} ${p.medida}`.toLowerCase().includes(q)).slice(0,8);
  if(!lista.length){
    resultados.innerHTML='<div class="product-option"><div><strong>Sin resultados</strong><small>Probá otra búsqueda.</small></div></div>';
  } else {
    resultados.innerHTML = lista.map(p=>`
      <div class="product-option" data-id="${p.id}">
        <div><strong>${descripcion(p)}</strong><small>${p.categoria} · ${p.unidad}${p.pendiente?' · Precio pendiente':''}</small></div>
        <div class="product-option-price">${dinero(p.precio)}<small>IVA ${String(p.iva).replace('.',',')}%</small></div>
      </div>`).join('');
  }
  resultados.classList.add('open');
  resultados.querySelectorAll('[data-id]').forEach(el=>el.addEventListener('click',()=>agregar(el.dataset.id)));
}

function agregar(id){
  const p = catalogo.find(x=>x.id===id);
  if(!p) return;
  items.push({uid:itemSeq++,...p,cantidad:1,precioActual:p.precio,ivaActual:p.iva,extra:0});
  buscar.value=''; resultados.classList.remove('open');
  render();
}

function calcItem(i){
  const base = Number(i.precioActual)||0;
  return (Number(i.cantidad)||0) * base * (1 + Number(i.extra||0));
}

function render(){
  if(!items.length){
    contenedor.innerHTML='<div class="empty-state"><strong>Todavía no agregaste productos.</strong><span>Usá el buscador de arriba para comenzar.</span></div>';
  } else {
    contenedor.innerHTML = items.map(i=>`
      <div class="quote-item" data-uid="${i.uid}">
        <div class="quote-item-top">
          <div class="item-name"><strong>${descripcion(i)}</strong><span>${i.categoria} · ${i.unidad}</span></div>
          <div class="item-mini"><label>Cantidad</label><input class="control js-cantidad" type="number" min="0" step="0.01" value="${i.cantidad}"></div>
          <div class="item-mini"><label>Precio unitario</label><input class="control price-edit ${i.pendiente?'pending-price':''} js-precio" type="number" min="0" step="0.01" value="${i.precioActual}"></div>
          <div class="item-mini"><label>IVA</label><select class="control iva-inline js-iva"><option value="21" ${i.ivaActual===21?'selected':''}>21%</option><option value="10.5" ${i.ivaActual===10.5?'selected':''}>10,5%</option></select></div>
          <div class="item-total"><span>Total neto</span><strong>${dinero(calcItem(i))}</strong></div>
          <button class="remove-item js-remove" title="Quitar">×</button>
        </div>
        ${i.tranquera?`<div class="item-extra"><label>Adicional de tranquera</label><select class="control js-extra">${extrasTranquera.map(e=>`<option value="${e.factor}" ${i.extra===e.factor?'selected':''}>${e.label}</option>`).join('')}</select></div>`:''}
        ${i.pendiente?'<div class="pending-line">⚠ Este producto estaba sin precio en el Excel original. El valor $999 es provisorio: podés corregirlo directamente en este presupuesto.</div>':''}
      </div>`).join('');

    contenedor.querySelectorAll('.quote-item').forEach(el=>{
      const uid = Number(el.dataset.uid);
      const item = items.find(x=>x.uid===uid);
      el.querySelector('.js-cantidad').addEventListener('input',e=>{item.cantidad=Number(e.target.value); actualizarTotalesSinRender(); el.querySelector('.item-total strong').textContent=dinero(calcItem(item));});
      el.querySelector('.js-precio').addEventListener('input',e=>{item.precioActual=Number(e.target.value); item.pendiente=item.precioActual===999; actualizarTotalesSinRender(); el.querySelector('.item-total strong').textContent=dinero(calcItem(item));});
      el.querySelector('.js-iva').addEventListener('change',e=>{item.ivaActual=Number(e.target.value); actualizarTotalesSinRender();});
      const extra = el.querySelector('.js-extra');
      if(extra) extra.addEventListener('change',e=>{item.extra=Number(e.target.value); actualizarTotalesSinRender(); el.querySelector('.item-total strong').textContent=dinero(calcItem(item));});
      el.querySelector('.js-remove').addEventListener('click',()=>{items=items.filter(x=>x.uid!==uid); render();});
    });
  }
  actualizarTotalesSinRender();
}

function actualizarTotalesSinRender(){
  let subtotal=0, iva21=0, iva105=0;
  const modo=ivaGlobal.value;
  items.forEach(i=>{
    const neto=calcItem(i); subtotal+=neto;
    const iva = modo==='individual' ? Number(i.ivaActual) : Number(modo);
    if(iva===21) iva21 += neto*.21;
    if(iva===10.5) iva105 += neto*.105;
  });
  document.getElementById('subtotal').textContent=dinero(subtotal);
  document.getElementById('iva21').textContent=dinero(iva21);
  document.getElementById('iva105').textContent=dinero(iva105);
  document.getElementById('total').textContent=dinero(subtotal+iva21+iva105);
  document.getElementById('cantidadItems').textContent=`${items.length} ítem${items.length===1?'':'s'}`;
  document.getElementById('warningPendientes').hidden=!items.some(i=>i.pendiente || Number(i.precioActual)===999);
}

buscar.addEventListener('input',buscarProductos);
document.addEventListener('click',e=>{if(!e.target.closest('.product-picker')) resultados.classList.remove('open');});
ivaGlobal.addEventListener('change',actualizarTotalesSinRender);

document.getElementById('guardarBorrador').addEventListener('click',()=>alert('En el siguiente paso conectaremos este botón con Firebase para guardar el presupuesto.'));
document.getElementById('generarPdf').addEventListener('click',()=>{
  if(!items.length){alert('Agregá al menos un producto antes de generar el PDF.');return;}
  if(items.some(i=>i.pendiente || Number(i.precioActual)===999) && !confirm('Hay productos con precio pendiente. ¿Querés continuar igualmente?')) return;
  alert('La composición del presupuesto ya está funcionando. El próximo paso será generar el PDF real con el logo y los datos de Chourrout.');
});

hoy();
render();
