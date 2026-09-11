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
    P0026:{categoria:'Postes de Palo Santo',producto:'Medio reforzado',variante:'',medida:'',unidad:'unidad',precio:35000,iva:0,estado:'Activo',pendiente:false},

    P0028:{categoria:'Mangas para vacunos',producto:'Manga para vacunos',variante:'Por metro',medida:'',unidad:'metro lineal',precio:938600,iva:0,estado:'Activo',pendiente:false},
    P0029:{categoria:'Mangas para vacunos',producto:'Puertas corredizas completas',variante:'',medida:'',unidad:'unidad',precio:982500,iva:0,estado:'Activo',pendiente:false},
    P0030:{categoria:'Mangas para vacunos',producto:'Puerta corrediza',variante:'',medida:'',unidad:'unidad',precio:893000,iva:0,estado:'Activo',pendiente:false},
    P0031:{categoria:'Mangas para vacunos',producto:'Puerta lavaje',variante:'',medida:'',unidad:'unidad',precio:241100,iva:0,estado:'Activo',pendiente:false},
    P0032:{categoria:'Mangas para vacunos',producto:'Puerta lateral',variante:'',medida:'',unidad:'unidad',precio:376740,iva:0,estado:'Activo',pendiente:false},
    P0033:{categoria:'Mangas para vacunos',producto:'Puerta lado andén',variante:'',medida:'',unidad:'unidad',precio:415000,iva:0,estado:'Activo',pendiente:false},
    P0034:{categoria:'Mangas para vacunos',producto:'Andén frente',variante:'',medida:'',unidad:'unidad',precio:415000,iva:0,estado:'Activo',pendiente:false},
    P0035:{categoria:'Mangas para vacunos',producto:'Cepo de hacienda',variante:'',medida:'',unidad:'unidad',precio:1965000,iva:0,estado:'Activo',pendiente:false},
    P0036:{categoria:'Mangas para vacunos',producto:'Piso de manga',variante:'1 pulgada',medida:'por metro',unidad:'metro lineal',precio:110000,iva:0,estado:'Activo',pendiente:false},
    P0037:{categoria:'Mangas para vacunos',producto:'Piso de cargador',variante:'1 1/2 pulgadas',medida:'por metro',unidad:'metro lineal',precio:151900,iva:0,estado:'Activo',pendiente:false},

    P0038:{categoria:'Cargadores para vacunos',producto:'Cargador',variante:'',medida:'3,50 m de piso',unidad:'unidad',precio:2160000,iva:0,estado:'Activo',pendiente:false},
    P0039:{categoria:'Cargadores para vacunos',producto:'Cargador',variante:'3 patas',medida:'4,00 m de piso',unidad:'unidad',precio:2272000,iva:0,estado:'Activo',pendiente:false},
    P0040:{categoria:'Cargadores para vacunos',producto:'Cargador',variante:'4 patas',medida:'4,00 m de piso',unidad:'unidad',precio:2563000,iva:0,estado:'Activo',pendiente:false},
    P0041:{categoria:'Cargadores para vacunos',producto:'Cargador',variante:'Con descanso',medida:'5,00 m',unidad:'unidad',precio:3022300,iva:0,estado:'Activo',pendiente:false},
    P0042:{categoria:'Mangas para cerdo',producto:'Manga para cerdo',variante:'Por metro',medida:'',unidad:'metro lineal',precio:268440,iva:0,estado:'Activo',pendiente:false}
  };

  window.CH_PRODUCTOS.forEach(p=>{
    if(cambios[p.id]) Object.assign(p,cambios[p.id]);
  });

  // Para esta categoría sólo existen las combinaciones con precio explícito en la lista.
  window.CH_PRODUCTOS = window.CH_PRODUCTOS.filter(p=>p.categoria!=='Tranqueras de tiretas de curupay');

  const nuevos = [
    {id:'P0077',categoria:'Tranqueras de tiretas de curupay',producto:'Tranquera de tiretas de curupay',variante:'3 cruces',medida:'4,00 m',unidad:'unidad',precio:1100000,iva:0,estado:'Activo',pendiente:false,observaciones:'Producto normalizado desde lista provista.',origen:'Actualización manual',tranquera:false,tiretas:true},
    {id:'P0078',categoria:'Tranqueras de tiretas de curupay',producto:'Tranquera de tiretas de curupay',variante:'3 cruces',medida:'3,50 m',unidad:'unidad',precio:1055000,iva:0,estado:'Activo',pendiente:false,observaciones:'Producto normalizado desde lista provista.',origen:'Actualización manual',tranquera:false,tiretas:true},
    {id:'P0079',categoria:'Tranqueras de tiretas de curupay',producto:'Tranquera de tiretas de curupay',variante:'2 cruces',medida:'4,00 m',unidad:'unidad',precio:828000,iva:0,estado:'Activo',pendiente:false,observaciones:'Producto normalizado desde lista provista.',origen:'Actualización manual',tranquera:false,tiretas:true},
    {id:'P0080',categoria:'Tranqueras de tiretas de curupay',producto:'Tranquera de tiretas de curupay',variante:'2 cruces',medida:'3,50 m',unidad:'unidad',precio:806200,iva:0,estado:'Activo',pendiente:false,observaciones:'Producto normalizado desde lista provista.',origen:'Actualización manual',tranquera:false,tiretas:true},
    {id:'P0081',categoria:'Tranqueras de tiretas de curupay',producto:'Tranquera de tiretas de curupay',variante:'2 cruces',medida:'3,00 m',unidad:'unidad',precio:790000,iva:0,estado:'Activo',pendiente:false,observaciones:'Producto normalizado desde lista provista.',origen:'Actualización manual',tranquera:false,tiretas:true},
    {id:'P0082',categoria:'Tranqueras de tiretas de curupay',producto:'Tranquera de tiretas de curupay',variante:'2 cruces',medida:'2,50 m',unidad:'unidad',precio:754000,iva:0,estado:'Activo',pendiente:false,observaciones:'Producto normalizado desde lista provista.',origen:'Actualización manual',tranquera:false,tiretas:true},
    {id:'P0083',categoria:'Tranqueras de tiretas de curupay',producto:'Tranquera de tiretas de curupay',variante:'2 cruces',medida:'2,00 m',unidad:'unidad',precio:719000,iva:0,estado:'Activo',pendiente:false,observaciones:'Producto normalizado desde lista provista.',origen:'Actualización manual',tranquera:false,tiretas:true},
    {id:'P0084',categoria:'Tranqueras de tiretas de curupay',producto:'Tranquera de tiretas de curupay',variante:'1 cruz',medida:'1,50 m',unidad:'unidad',precio:404800,iva:0,estado:'Activo',pendiente:false,observaciones:'Producto normalizado desde lista provista.',origen:'Actualización manual',tranquera:false,tiretas:true},
    {id:'P0085',categoria:'Tranqueras de tiretas de curupay',producto:'Tranquera de tiretas de curupay',variante:'1 cruz',medida:'1,00 m',unidad:'unidad',precio:336900,iva:0,estado:'Activo',pendiente:false,observaciones:'Producto normalizado desde lista provista.',origen:'Actualización manual',tranquera:false,tiretas:true},

    {id:'P0129',categoria:'Mangas para cerdo',producto:'Puerta corrediza',variante:'',medida:'',unidad:'unidad',precio:268440,iva:0,estado:'Activo',pendiente:false,observaciones:'Precio actualizado desde lista provista.',origen:'Actualización manual',tranquera:false},
    {id:'P0130',categoria:'Mangas para cerdo',producto:'Cepo',variante:'',medida:'',unidad:'unidad',precio:318000,iva:0,estado:'Activo',pendiente:false,observaciones:'Precio actualizado desde lista provista.',origen:'Actualización manual',tranquera:false},
    {id:'P0131',categoria:'Postes de eucaliptus',producto:'Poste de eucaliptus',variante:'',medida:'7,00 m',unidad:'unidad',precio:59000,iva:0,estado:'Activo',pendiente:false,observaciones:'Precio actualizado desde lista provista.',origen:'Actualización manual',tranquera:false}
  ];

  nuevos.forEach(n=>{
    if(!window.CH_PRODUCTOS.some(p=>p.id===n.id)) window.CH_PRODUCTOS.push(n);
  });
})();
