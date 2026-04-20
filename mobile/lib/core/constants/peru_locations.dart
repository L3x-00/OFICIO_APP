/// Datos estáticos de la jerarquía administrativa del Perú.
/// Estructura: departamento → lista de provincias → lista de distritos.
class PeruLocations {
  PeruLocations._();

  /// Lista de todos los departamentos del Perú
  static const List<String> departments = [
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
    'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
    'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
    'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
    'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
  ];

  /// Provincias por departamento
  static const Map<String, List<String>> provinces = {
    'Amazonas':      ['Chachapoyas', 'Bagua', 'Bongará', 'Condorcanqui', 'Luya', 'Rodríguez de Mendoza', 'Utcubamba'],
    'Áncash':        ['Huaraz', 'Aija', 'Antonio Raimondi', 'Asunción', 'Bolognesi', 'Carhuaz', 'Carlos Fermín Fitzcarrald', 'Casma', 'Corongo', 'Huari', 'Huarmey', 'Huaylas', 'Mariscal Luzuriaga', 'Ocros', 'Pallasca', 'Pomabamba', 'Recuay', 'Santa', 'Sihuas', 'Yungay'],
    'Apurímac':      ['Abancay', 'Andahuaylas', 'Antabamba', 'Aymaraes', 'Chincheros', 'Cotabambas', 'Grau'],
    'Arequipa':      ['Arequipa', 'Camaná', 'Caravelí', 'Castilla', 'Caylloma', 'Condesuyos', 'Islay', 'La Unión'],
    'Ayacucho':      ['Huamanga', 'Cangallo', 'Huanca Sancos', 'Huanta', 'La Mar', 'Lucanas', 'Parinacochas', 'Paucar del Sara Sara', 'Sucre', 'Víctor Fajardo', 'Vilcas Huamán'],
    'Cajamarca':     ['Cajamarca', 'Cajabamba', 'Celendín', 'Chota', 'Contumazá', 'Cutervo', 'Hualgayoc', 'Jaén', 'San Ignacio', 'San Marcos', 'San Miguel', 'San Pablo', 'Santa Cruz'],
    'Callao':        ['Callao'],
    'Cusco':         ['Cusco', 'Acomayo', 'Anta', 'Calca', 'Canas', 'Canchis', 'Chumbivilcas', 'Espinar', 'La Convención', 'Paruro', 'Paucartambo', 'Quispicanchi', 'Urubamba'],
    'Huancavelica':  ['Huancavelica', 'Acobamba', 'Angaraes', 'Castrovirreyna', 'Churcampa', 'Huaytará', 'Tayacaja'],
    'Huánuco':       ['Huánuco', 'Ambo', 'Dos de Mayo', 'Huacaybamba', 'Huamalíes', 'Leoncio Prado', 'Marañón', 'Pachitea', 'Puerto Inca', 'Lauricocha', 'Yarowilca'],
    'Ica':           ['Ica', 'Chincha', 'Nazca', 'Palpa', 'Pisco'],
    'Junín':         ['Huancayo', 'Chanchamayo', 'Chupaca', 'Concepción', 'Jauja', 'Junín', 'Satipo', 'Tarma', 'Yauli'],
    'La Libertad':   ['Trujillo', 'Ascope', 'Bolívar', 'Chepén', 'Julcán', 'Otuzco', 'Pacasmayo', 'Pataz', 'Sánchez Carrión', 'Santiago de Chuco', 'Gran Chimú', 'Virú'],
    'Lambayeque':    ['Chiclayo', 'Ferreñafe', 'Lambayeque'],
    'Lima':          ['Lima', 'Barranca', 'Cajatambo', 'Canta', 'Cañete', 'Huaral', 'Huarochirí', 'Huaura', 'Oyón', 'Yauyos'],
    'Loreto':        ['Maynas', 'Alto Amazonas', 'Loreto', 'Mariscal Ramón Castilla', 'Requena', 'Ucayali', 'Datem del Marañón', 'Putumayo'],
    'Madre de Dios': ['Tambopata', 'Manu', 'Tahuamanu'],
    'Moquegua':      ['Mariscal Nieto', 'General Sánchez Cerro', 'Ilo'],
    'Pasco':         ['Pasco', 'Daniel Alcides Carrión', 'Oxapampa'],
    'Piura':         ['Piura', 'Ayabaca', 'Huancabamba', 'Morropón', 'Paita', 'Sechura', 'Sullana', 'Talara'],
    'Puno':          ['Puno', 'Azángaro', 'Carabaya', 'Chucuito', 'El Collao', 'Huancané', 'Lampa', 'Melgar', 'Moho', 'San Antonio de Putina', 'San Román', 'Sandia', 'Yunguyo'],
    'San Martín':    ['Moyobamba', 'Bellavista', 'El Dorado', 'Huallaga', 'Lamas', 'Mariscal Cáceres', 'Picota', 'Rioja', 'San Martín', 'Tocache'],
    'Tacna':         ['Tacna', 'Candarave', 'Jorge Basadre', 'Tarata'],
    'Tumbes':        ['Tumbes', 'Contralmirante Villar', 'Zarumilla'],
    'Ucayali':       ['Coronel Portillo', 'Atalaya', 'Padre Abad', 'Purús'],
  };

  /// Distritos por provincia (se incluyen los más importantes / mercado objetivo)
  static const Map<String, List<String>> districts = {
    // ── JUNÍN / HUANCAYO (mercado principal) ──────────────────
    'Huancayo': [
      'Huancayo', 'El Tambo', 'Chilca', 'Huancán', 'Viques',
      'Pilcomayo', 'Sapallanga', 'Chupaca', 'Cajas', 'Chongos Alto',
      'Cullhuas', 'Huacrapuquio', 'Ingenio', 'Palian', 'Pucará',
      'Quilcas', 'San Agustín de Cajas', 'San Jerónimo de Tunán',
      'Saño', 'Sicaya', 'Santo Domingo de Acobamba',
    ],
    'Chanchamayo': ['La Merced', 'San Ramón', 'Vitoc', 'Perené', 'Pichanaqui', 'San Luis de Shuaro'],
    'Jauja':    ['Jauja', 'Apata', 'Ataura', 'Canchayllo', 'Huertas', 'Julcán', 'Molinos', 'Monobamba', 'Muqui', 'Muquiyauyo', 'Paca', 'Paccha', 'Pancan', 'Parco', 'Pomacancha', 'Ricran', 'San Lorenzo', 'San Pedro de Chunan', 'Sausa', 'Sincos', 'Tunan Marca', 'Yauli', 'Yauyos'],
    'Concepción': ['Concepción', 'Ace', 'Andamarca', 'Chambará', 'Cochas', 'Comas', 'Героine Mariano Nakagawa', 'Manzanares', 'Mariscal Castilla', 'Matahuasi', 'Mito', 'Nueve de Julio', 'Orcotuna', 'San José de Quero', 'Santa Rosa de Ocopa'],
    'Satipo':   ['Satipo', 'Coviriali', 'Llaylla', 'Mazamari', 'Pampa Hermosa', 'Pangoa', 'Río Negro', 'Río Tambo', 'Vizcatán del Ene'],
    'Tarma':    ['Tarma', 'Acobamba', 'Huaricolca', 'Huasahuasi', 'La Unión', 'Palca', 'Palcamayo', 'San Pedro de Cajas', 'Tapo'],
    'Chupaca':  ['Chupaca', 'Ahuac', 'Chongos Bajo', 'Huachac', 'Huamancaca Chico', 'San Juan de Iscos', 'San Juan de Jarpa', 'Tres de Diciembre', 'Yanacancha'],
    'Junín':    ['Junín', 'Carhuamayo', 'Ondores', 'Ulcumayo'],
    'Yauli':    ['La Oroya', 'Chacapalpa', 'Huay-Huay', 'Marcapomacocha', 'Morococha', 'Paccha', 'Santa Bárbara de Carhuacayán', 'Santa Rosa de Sacco', 'Suitucancha', 'Yauli'],

    // ── LIMA ───────────────────────────────────────────────────
    'Lima': [
      'Lima', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo',
      'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia',
      'Jesús María', 'La Molina', 'La Victoria', 'Lince', 'Los Olivos',
      'Lurigancho', 'Lurín', 'Magdalena del Mar', 'Miraflores',
      'Pachacámac', 'Pucusana', 'Pueblo Libre', 'Puente Piedra',
      'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo',
      'San Borja', 'San Isidro', 'San Juan de Lurigancho',
      'San Juan de Miraflores', 'San Luis', 'San Martín de Porres',
      'San Miguel', 'Santa Anita', 'Santa María del Mar', 'Santa Rosa',
      'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo',
    ],

    // ── CALLAO ─────────────────────────────────────────────────
    'Callao': ['Callao', 'Bellavista', 'Carmen de la Legua Reynoso', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla'],

    // ── AREQUIPA ───────────────────────────────────────────────
    'Arequipa': [
      'Arequipa', 'Alto Selva Alegre', 'Cayma', 'Cerro Colorado', 'Characato',
      'Chiguata', 'Jacobo Hunter', 'José Luis Bustamante y Rivero', 'La Joya',
      'Mariano Melgar', 'Miraflores', 'Mollebaya', 'Paucarpata', 'Pocsi',
      'Polobaya', 'Quequeña', 'Sabandia', 'Sachaca', 'San Juan de Siguas',
      'San Juan de Tarucani', 'Santa Isabel de Siguas', 'Santa Rita de Siguas',
      'Socabaya', 'Tiabaya', 'Uchumayo', 'Vitor', 'Yanahuara', 'Yarabamba', 'Yura',
    ],

    // ── CUSCO ──────────────────────────────────────────────────
    'Cusco': ['Cusco', 'Ccorca', 'Poroy', 'San Jerónimo', 'San Sebastián', 'Santiago', 'Saylla', 'Wanchaq'],

    // ── TRUJILLO ───────────────────────────────────────────────
    'Trujillo': ['Trujillo', 'El Porvenir', 'Florencia de Mora', 'Huanchaco', 'La Esperanza', 'Laredo', 'Moche', 'Poroto', 'Salaverry', 'Simbal', 'Victor Larco Herrera'],

    // ── CHICLAYO ───────────────────────────────────────────────
    'Chiclayo': ['Chiclayo', 'Chongoyape', 'Eten', 'Eten Puerto', 'José Leonardo Ortiz', 'La Victoria', 'Lagunas', 'Monsefú', 'Nueva Arica', 'Oyotún', 'Picsi', 'Pimentel', 'Reque', 'Saña', 'Cayaltí', 'Tumán'],

    // ── PIURA ──────────────────────────────────────────────────
    'Piura': ['Piura', 'Castilla', 'Catacaos', 'Cura Mori', 'El Tallán', 'La Arena', 'La Unión', 'Las Lomas', 'Tambogrande', 'Veintiseis de Octubre'],

    // ── PUNO ───────────────────────────────────────────────────
    'Puno': ['Puno', 'Acora', 'Amantaní', 'Atuncolla', 'Capachica', 'Chucuito', 'Coata', 'Huata', 'Mañazo', 'Paucarcolla', 'Pichacani', 'Platería', 'San Antonio', 'Tiquillaca', 'Vilque'],

    // ── HUANCAVELICA ──────────────────────────────────────────
    'Huancavelica': ['Huancavelica', 'Acobambilla', 'Acoria', 'Conayca', 'Cuenca', 'Huachocolpa', 'Huayllahuara', 'Izcuchaca', 'Laria', 'Manta', 'Mariscal Cáceres', 'Moya', 'Nuevo Occoro', 'Palca', 'Pilchaca', 'Vilca', 'Yauli', 'Ascensión'],

    // ── TACNA ─────────────────────────────────────────────────
    'Tacna': ['Tacna', 'Alto de la Alianza', 'Calana', 'Ciudad Nueva', 'Inclán', 'Palca', 'Pocollay', 'Sama', 'Coronel Gregorio Albarracín Lanchipa', 'La Yarada-Los Palos'],

    // ── AYACUCHO ──────────────────────────────────────────────
    'Huamanga': ['Ayacucho', 'Acocro', 'Acos Vinchos', 'Carmen Alto', 'Chiara', 'Ocros', 'Pacaycasa', 'Quinua', 'San José de Ticllas', 'San Juan Bautista', 'Santiago de Pischa', 'Socos', 'Tambillo', 'Vinchos', 'Jesús Nazareno', 'Andrés Avelino Cáceres Dorregaray'],
  };

  /// Devuelve las provincias de un departamento dado (vacío si no existe)
  static List<String> provincesOf(String department) =>
      provinces[department] ?? [];

  /// Devuelve los distritos de una provincia dada (vacío si no existe)
  static List<String> districtsOf(String province) =>
      districts[province] ?? [];

  /// Verifica si un departamento tiene provincias con distritos cargados
  static bool hasDistricts(String province) =>
      districts.containsKey(province);
}
