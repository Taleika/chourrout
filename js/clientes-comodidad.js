(function(){
  const tabla=document.getElementById('tablaClientes');
  if(!tabla)return;
  const DRAFT_KEY='chourrout_presupuesto_actual';
  const CLIENTES_KEY='chourrout_clientes';

  function leer(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(e){return fallback;}}
  function hoy(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}

  function agregarBotones(){
    tabla.querySelectorAll('tr').forEach(tr=>{
      const actions=tr.querySelector('.actions');
      if(!actions||actions.querySelector('[data-action="nuevo-presupuesto-cliente"]'))return;
      const ref=actions.querySelector('[data-id]');if(!ref)return;
      const b=document.createElement('button');
      b.className='icon-btn';b.dataset.action='nuevo-presupuesto-cliente';b.dataset.id=ref.dataset.id;
      b.textContent='+ Presupuesto';
      b.style.background='#111';b.style.color='#fff';b.style.borderColor='#111';
      actions.insertBefore(b,actions.firstChild);
    });
  }

  tabla.addEventListener('click',e=>{
    const b=e.target.closest('[data-action="nuevo-presupuesto-cliente"]');if(!b)return;
    const clientes=leer(CLIENTES_KEY,[]);
    const c=Array.isArray(clientes)?clientes.find(x=>String(x.id)===String(b.dataset.id)):null;
    if(!c)return;
    const actual=leer(DRAFT_KEY,null);
    if(actual&&((actual.items||[]).length||actual.clienteNombre)&&actual.estado!=='definitivo'){
      if(!confirm(`Hay un presupuesto en curso${actual.numero?` Nº ${actual.numero}`:''}.\n\n¿Querés iniciar uno nuevo para ${c.nombre}? El presupuesto actual seguirá guardado en el historial.`))return;
    }
    const draft={numero:'',estado:'borrador',clienteId:c.id,clienteNombre:c.nombre||'',clienteCuit:c.cuit||'',clienteTelefono:c.telefono||'',fecha:hoy(),observaciones:'',ivaGlobal:'0',items:[],actualizadoEn:new Date().toISOString()};
    localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));
    location.href='../presupuestos/nuevo.html';
  });

  new MutationObserver(agregarBotones).observe(tabla,{childList:true,subtree:true});
  setTimeout(agregarBotones,200);
})();