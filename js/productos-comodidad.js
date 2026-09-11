(function(){
  const tabla=document.getElementById('tablaProductos');
  const estado=document.getElementById('filtroEstadoProducto');
  const precio=document.getElementById('filtroPrecioProducto');
  const contador=document.getElementById('contadorFilas');
  const mostrarTodos=document.getElementById('mostrarTodos');
  if(!tabla||!estado||!precio)return;

  function textoEstado(tr){
    const badges=[...tr.querySelectorAll('.badge')];
    const b=badges.find(x=>['activo','inactivo'].includes((x.textContent||'').trim().toLowerCase()));
    return (b?.textContent||'').trim().toLowerCase();
  }
  function textoPrecio(tr){
    return (tr.querySelector('td.money')?.textContent||'').toLowerCase();
  }
  function aplicar(){
    let visibles=0,total=0;
    tabla.querySelectorAll('tr').forEach(tr=>{
      if(!tr.querySelector('[data-id]'))return;
      total++;
      const estadoTexto=textoEstado(tr);
      const precioTexto=textoPrecio(tr);
      const esPendiente=precioTexto.includes('pendiente')||precioTexto.includes('$ 999')||precioTexto.includes('$999');
      const okEstado=!estado.value||estadoTexto===estado.value.toLowerCase();
      const okPrecio=!precio.value||(precio.value==='pendiente'?esPendiente:!esPendiente);
      const ok=okEstado&&okPrecio;
      tr.style.display=ok?'':'none';
      if(ok)visibles++;
    });
    if(contador&&(estado.value||precio.value)&&total)contador.textContent=`Mostrando ${visibles} de ${total} productos · Firebase`;
  }

  estado.addEventListener('change',aplicar);
  precio.addEventListener('change',aplicar);
  mostrarTodos?.addEventListener('click',()=>{estado.value='';precio.value='';setTimeout(aplicar,0);});
  new MutationObserver(()=>requestAnimationFrame(aplicar)).observe(tabla,{childList:true,subtree:true});
  setTimeout(aplicar,250);
})();