(function(){
  const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 769 142"><rect width="100%" height="100%" fill="white"/><text x="18" y="95" font-family="Arial,Helvetica,sans-serif" font-size="76" font-weight="900" fill="#ff0000">CH</text><text x="180" y="88" font-family="Arial,Helvetica,sans-serif" font-size="44" font-weight="700" fill="#111">Chourrout Hnos.</text></svg>`;

  window.CH_LOGO_SVG = FALLBACK_SVG;
  window.CH_LOGO_DATA = '';

  function blobADataUrl(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(reader.error||new Error('No se pudo leer el logo.'));
      reader.readAsDataURL(blob);
    });
  }

  function cargarImagen(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('No se pudo decodificar el logo.'));
      img.src=src;
    });
  }

  async function logoPadded(dataUrl){
    const img=await cargarImagen(dataUrl);
    const alto=300;
    const relacionCaja=5.4;
    const ancho=Math.round(alto*relacionCaja);
    const canvas=document.createElement('canvas');
    canvas.width=ancho;canvas.height=alto;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,ancho,alto);
    const escala=Math.min(ancho/img.naturalWidth,alto/img.naturalHeight);
    const w=img.naturalWidth*escala,h=img.naturalHeight*escala;
    ctx.drawImage(img,(ancho-w)/2,(alto-h)/2,w,h);
    return canvas.toDataURL('image/png');
  }

  async function cargarLogo(){
    try{
      const base=document.currentScript?.src || location.href;
      const url=new URL('../images/logo.png',base).href;
      const response=await fetch(url,{cache:'no-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const original=await blobADataUrl(await response.blob());
      const padded=await logoPadded(original);
      window.CH_LOGO_DATA=padded;
      window.CH_LOGO_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1620 300"><rect width="100%" height="100%" fill="white"/><image href="${padded}" x="0" y="0" width="1620" height="300" preserveAspectRatio="xMidYMid meet"/></svg>`;
      return padded;
    }catch(error){
      console.warn('No se pudo cargar images/logo.png; se usará el logo de respaldo.',error);
      return '';
    }
  }

  window.CH_LOGO_READY=cargarLogo();
})();
