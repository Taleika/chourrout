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

  async function cargarLogo(){
    try{
      const base=document.currentScript?.src || location.href;
      const url=new URL('../images/logo.png',base).href;
      const response=await fetch(url,{cache:'no-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const dataUrl=await blobADataUrl(await response.blob());
      window.CH_LOGO_DATA=dataUrl;
      window.CH_LOGO_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 898 242"><rect width="100%" height="100%" fill="white"/><image href="${dataUrl}" x="0" y="0" width="898" height="242" preserveAspectRatio="xMidYMid meet"/></svg>`;
      return dataUrl;
    }catch(error){
      console.warn('No se pudo cargar images/logo.png; se usará el logo de respaldo.',error);
      return '';
    }
  }

  window.CH_LOGO_READY=cargarLogo();
})();
