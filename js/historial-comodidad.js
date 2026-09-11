(function(){
  const tabla=document.getElementById('tablaPresupuestos');
  const desde=document.getElementById('filtroDesde');
  const hasta=document.getElementById('filtroHasta');
  const contador=document.getElementById('contadorPresupuestos');
  const limpiar=document.getElementById('mostrarTodos');
  if(!tabla||!desde||!hasta)return;

  function fechaIsoDesdeTexto(texto){
    const m=String(texto||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m?`${m[3]}-${m[2]}-${m[1]}`:'';
  }

  function aplicarFechas(){
    const d=desde.value||'';
    const h=hasta.value||'';
    let visibles=0;
    tabla.querySelectorAll('tr').forEach(tr=>{
      if(tr.querySelector('.empty-history'))return;
      const fecha=fechaIsoDesdeTexto(tr.cells?.[1]?.textContent||'');
      const ok=(!d||!fecha||fecha>=d)&&(!h||!fecha||fecha<=h);
      tr.style.display=ok?'':'none';
      if(ok)visibles++;
    });
    if(contador&&tabla.querySelectorAll('tr').length){
      const total=[...tabla.querySelectorAll('tr')].filter(tr=>!tr.querySelector('.empty-history')).length;
      if((d||h)&&total)contador.textContent=`Mostrando ${visibles} de ${total} presupuestos`;
    }
  }

  function mejorarAcciones(){
    tabla.querySelectorAll('[data-action="abrir"]').forEach(b=>{
      const definitivo=b.dataset.estado==='definitivo';
      b.textContent=definitivo?'Ver':'Continuar';
      if(!definitivo){b.style.background='#111';b.style.color='#fff';b.style.borderColor='#111';}
    });
    tabla.querySelectorAll('[data-action="eliminar-firestore"]').forEach(b=>{
      b.textContent='Eliminar';b.style.color='#b00020';b.style.borderColor='#e8c8ce';
    });
  }

  function refrescar(){mejorarAcciones();aplicarFechas();}
  desde.addEventListener('change',refrescar);
  hasta.addEventListener('change',refrescar);
  limpiar?.addEventListener('click',()=>{desde.value='';hasta.value='';setTimeout(refrescar,0);});
  new MutationObserver(()=>requestAnimationFrame(refrescar)).observe(tabla,{childList:true,subtree:true});
  setTimeout(refrescar,250);
})();