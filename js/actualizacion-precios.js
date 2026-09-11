(function(){
  if(!Array.isArray(window.CH_PRODUCTOS)) return;

  const cambios = {
    P0018:{categoria:'Postes de itin',producto:'Entero',variante:'',medida:'2,20 m',unidad:'unidad',precio:35880,iva:0,estado:'Activo',pendiente:false},
    P0019:{categoria:'Postes de itin',producto:'Entero',variante:'',medida:'2,40 m',unidad:'unidad',precio:39200,iva:0,estado:'Activo',pendiente:false},
    P0020:{categoria:'Postes de itin',producto:'Poste eléctrico',variante:'',medida:'1,60 m',unidad:'unidad',precio:11040,iva:0,estado:'Activo',pendiente:false},
    P0021:{categoria:'Postes de itin',producto:'Poste eléctrico',variante:'',medida:'1,80 m',unidad:'unidad',precio:13110,iva:0,estado:'Activo',pendiente:false},
    P0022:{categoria:'Postes de Palo Santo',producto:'Entero',variante:'',medida:'2,20 m',unidad:'unidad',precio:36260,iva:0,estado:'Activo',pendiente:false},
    P0023:{categoria:'Postes de Palo Santo',producto:'Entero',variante:'',medida:'2,40 m',unidad:'unidad',precio:42840,iva:0,estado:'Activo',pendiente:false},
    P0024:{categoria:'Postes de Palo Santo',producto:'Entero',variante:'',medida:'2,60 m',unidad:'unidad',precio:55720,iva:0,estado:'Activo',pendiente:false},
    P0025:{categoria:'Postes de Palo Santo',producto:'Entero',variante:'',medida:'3,00 m',unidad:'unidad',precio:66080,iva:0,estado:'Activo',pendiente:false},
    P0026:{categoria:'Postes de Palo Santo',producto:'Medio reforzado',variante:'',medida:'',unidad:'unidad',precio:35000,iva:0,estado:'Activo',pendiente:false}
  };

  window.CH_PRODUCTOS.forEach(p=>{
    if(cambios[p.id]) Object.assign(p,cambios[p.id]);
  });
})();
