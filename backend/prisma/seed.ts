import { PrismaClient } from '../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import * as bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── 1. LIMPIEZA TOTAL ────────────────────────────────────
  console.log('🗑️  Borrando datos existentes...');

  await prisma.offer.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.userPenalty.deleteMany();
  await prisma.providerAnalytic.deleteMany();
  await prisma.adminNotification.deleteMany();
  await prisma.yapePayment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.planRequest.deleteMany();
  await prisma.reviewReply.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.verificationDoc.deleteMany();
  await prisma.providerImage.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.providerReport.deleteMany();
  await prisma.platformIssue.deleteMany();
  await prisma.trustValidationRequest.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.updateMany({ data: { parentId: null } });
  await prisma.category.deleteMany();
  await prisma.locality.deleteMany();

  console.log('✅ Base de datos limpia');

  // ── 2. LOCALIDADES (catálogo completo, CON tildes) ────────
  console.log('📍 Creando localidades...');

  const localitiesData = [
    // ── Junín ──────────────────────────────
    { department: 'Junín', province: 'Huancayo', district: 'Huancayo' },
    { department: 'Junín', province: 'Huancayo', district: 'El Tambo' },
    { department: 'Junín', province: 'Huancayo', district: 'Chilca' },
    { department: 'Junín', province: 'Huancayo', district: 'Pilcomayo' },
    { department: 'Junín', province: 'Huancayo', district: 'Sapallanga' },
    { department: 'Junín', province: 'Jauja', district: 'Jauja' },
    { department: 'Junín', province: 'Concepción', district: 'Concepción' },
    { department: 'Junín', province: 'Concepción', district: 'Matahuasi' },
    { department: 'Junín', province: 'Concepción', district: 'Santa Rosa de Ocopa' },
    { department: 'Junín', province: 'Chupaca', district: 'Chupaca' },
    { department: 'Junín', province: 'Chupaca', district: 'Yanacancha' },
    { department: 'Junín', province: 'Tarma', district: 'Tarma' },
    { department: 'Junín', province: 'Chanchamayo', district: 'La Merced' },
    { department: 'Junín', province: 'Chanchamayo', district: 'Pichanaqui' },
    { department: 'Junín', province: 'Satipo', district: 'Satipo' },
    { department: 'Junín', province: 'Satipo', district: 'Mazamari' },
    { department: 'Junín', province: 'Satipo', district: 'Pangoa' },
    { department: 'Junín', province: 'Yauli', district: 'La Oroya' },

    // ── Lima ───────────────────────────────
    { department: 'Lima', province: 'Lima', district: 'Lima' },
    { department: 'Lima', province: 'Lima', district: 'Miraflores' },
    { department: 'Lima', province: 'Lima', district: 'San Isidro' },
    { department: 'Lima', province: 'Lima', district: 'Barranco' },
    // El distrito de Surco lleva su nombre oficial completo: Nominatim lo
    // devuelve así y peru_locations.dart lo registra como 'Santiago de Surco'.
    { department: 'Lima', province: 'Lima', district: 'Santiago de Surco' },
    { department: 'Lima', province: 'Lima', district: 'La Molina' },
    { department: 'Lima', province: 'Lima', district: 'San Borja' },
    { department: 'Lima', province: 'Lima', district: 'Jesús María' },
    { department: 'Lima', province: 'Lima', district: 'Lince' },
    { department: 'Lima', province: 'Lima', district: 'Magdalena del Mar' },
    { department: 'Lima', province: 'Lima', district: 'Pueblo Libre' },
    { department: 'Lima', province: 'Lima', district: 'San Miguel' },
    { department: 'Lima', province: 'Lima', district: 'Breña' },
    { department: 'Lima', province: 'Lima', district: 'La Victoria' },
    { department: 'Lima', province: 'Lima', district: 'Rímac' },
    { department: 'Lima', province: 'Lima', district: 'San Juan de Lurigancho' },
    { department: 'Lima', province: 'Lima', district: 'San Martín de Porres' },
    { department: 'Lima', province: 'Lima', district: 'Comas' },
    { department: 'Lima', province: 'Lima', district: 'Los Olivos' },
    { department: 'Lima', province: 'Cañete', district: 'San Vicente de Cañete' },
    { department: 'Lima', province: 'Huaral', district: 'Huaral' },
    { department: 'Lima', province: 'Huaral', district: 'Chancay' },
    { department: 'Lima', province: 'Huaura', district: 'Huacho' },
    { department: 'Lima', province: 'Barranca', district: 'Barranca' },

    // ── Callao (región constitucional autónoma, no parte de Lima) ─
    { department: 'Callao', province: 'Callao', district: 'Callao' },
    { department: 'Callao', province: 'Callao', district: 'Bellavista' },
    { department: 'Callao', province: 'Callao', district: 'La Perla' },
    { department: 'Callao', province: 'Callao', district: 'La Punta' },
    { department: 'Callao', province: 'Callao', district: 'Carmen de la Legua Reynoso' },
    { department: 'Callao', province: 'Callao', district: 'Ventanilla' },
    { department: 'Callao', province: 'Callao', district: 'Mi Perú' },

    // ── Ayacucho (incluye Huanta) ─────────────────────────────
    { department: 'Ayacucho', province: 'Huamanga', district: 'Ayacucho' },
    { department: 'Ayacucho', province: 'Huamanga', district: 'San Juan Bautista' },
    { department: 'Ayacucho', province: 'Huamanga', district: 'Carmen Alto' },
    { department: 'Ayacucho', province: 'Huamanga', district: 'Jesús Nazareno' },
    { department: 'Ayacucho', province: 'Huanta', district: 'Huanta' },
    { department: 'Ayacucho', province: 'Huanta', district: 'Luricocha' },
    { department: 'Ayacucho', province: 'Huanta', district: 'Sivia' },

    // ── Cusco ───────────────────────────────
    { department: 'Cusco', province: 'Cusco', district: 'Cusco' },
    { department: 'Cusco', province: 'Cusco', district: 'San Jerónimo' },
    { department: 'Cusco', province: 'Cusco', district: 'San Sebastián' },
    { department: 'Cusco', province: 'Cusco', district: 'Wanchaq' },
    { department: 'Cusco', province: 'Cusco', district: 'Santiago' },
    { department: 'Cusco', province: 'Urubamba', district: 'Urubamba' },
    { department: 'Cusco', province: 'Urubamba', district: 'Machu Picchu' },
    { department: 'Cusco', province: 'Urubamba', district: 'Ollantaytambo' },
    { department: 'Cusco', province: 'Calca', district: 'Calca' },
    { department: 'Cusco', province: 'Calca', district: 'Pisac' },
    { department: 'Cusco', province: 'Anta', district: 'Anta' },
    { department: 'Cusco', province: 'Canchis', district: 'Sicuani' },

    // ── Arequipa ────────────────────────────
    { department: 'Arequipa', province: 'Arequipa', district: 'Arequipa' },
    { department: 'Arequipa', province: 'Arequipa', district: 'Yanahuara' },
    { department: 'Arequipa', province: 'Arequipa', district: 'Cayma' },
    { department: 'Arequipa', province: 'Arequipa', district: 'Cerro Colorado' },
    // El distrito popularmente "Hunter" es oficialmente Jacobo Hunter;
    // Nominatim y peru_locations.dart usan el nombre completo.
    { department: 'Arequipa', province: 'Arequipa', district: 'Jacobo Hunter' },
    { department: 'Arequipa', province: 'Arequipa', district: 'Mariano Melgar' },
    { department: 'Arequipa', province: 'Arequipa', district: 'Paucarpata' },
    { department: 'Arequipa', province: 'Arequipa', district: 'Socabaya' },
    { department: 'Arequipa', province: 'Arequipa', district: 'José Luis Bustamante y Rivero' },
    { department: 'Arequipa', province: 'Arequipa', district: 'Alto Selva Alegre' },

    // ── La Libertad ─────────────────────────
    { department: 'La Libertad', province: 'Trujillo', district: 'Trujillo' },
    { department: 'La Libertad', province: 'Trujillo', district: 'El Porvenir' },
    { department: 'La Libertad', province: 'Trujillo', district: 'Huanchaco' },
    { department: 'La Libertad', province: 'Trujillo', district: 'La Esperanza' },
    { department: 'La Libertad', province: 'Trujillo', district: 'Víctor Larco Herrera' },
    { department: 'La Libertad', province: 'Pacasmayo', district: 'Pacasmayo' },
    { department: 'La Libertad', province: 'Sánchez Carrión', district: 'Huamachuco' },
  ];

  for (const l of localitiesData) {
    const name = l.district || l.province || l.department;
    await prisma.locality.create({
      data: {
        name,
        department: l.department,
        province: l.province || null,
        district: l.district || null,
        country: 'Perú',
      },
    });
  }

  console.log(`  ✓ ${localitiesData.length} localidades creadas`);

  // ── 3. CATEGORÍAS — OFICIO ────────────────────────────────
  console.log('🔨 Creando categorías OFICIO...');

  const oficioParents: Record<string, number> = {};
  const oficioParentDefs = [
    { name: 'Hogar y Construcción',   slug: 'of-hogar' },
    { name: 'Tecnología',             slug: 'of-tecnologia' },
    { name: 'Salud y Bienestar',      slug: 'of-salud' },
    { name: 'Educación',              slug: 'of-educacion' },
    { name: 'Transporte y Mudanzas',  slug: 'of-transporte' },
    { name: 'Servicios Personales',   slug: 'of-servicios' },
    { name: 'Ingeniería y Diseño',    slug: 'of-ingenieria' },
  ];

  for (const p of oficioParentDefs) {
    const c = await prisma.category.create({ data: { name: p.name, slug: p.slug, forType: 'OFICIO' } });
    oficioParents[p.slug] = c.id;
  }

  const oficioSubs = [
    { name: 'Electricista',              slug: 'electricista',         parent: 'of-hogar' },
    { name: 'Gasfitero / Plomero',       slug: 'gasfitero',            parent: 'of-hogar' },
    { name: 'Pintor',                    slug: 'pintor',               parent: 'of-hogar' },
    { name: 'Carpintero',                slug: 'carpintero',           parent: 'of-hogar' },
    { name: 'Albañil / Construcción',    slug: 'albanil',              parent: 'of-hogar' },
    { name: 'Jardinero',                 slug: 'jardinero',            parent: 'of-hogar' },
    { name: 'Limpieza del Hogar',        slug: 'limpieza-hogar',       parent: 'of-hogar' },
    { name: 'Cerrajero',                 slug: 'cerrajero',            parent: 'of-hogar' },
    { name: 'Techista / Impermeabilización', slug: 'techista',         parent: 'of-hogar' },
    { name: 'Instalador de Pisos',       slug: 'instalador-pisos',     parent: 'of-hogar' },
    { name: 'Técnico en PC / Laptop',    slug: 'tecnico-pc',           parent: 'of-tecnologia' },
    { name: 'Técnico Celular / Tablet',  slug: 'tecnico-celular',      parent: 'of-tecnologia' },
    { name: 'Técnico de Electrodomésticos', slug: 'tecnico-electro',   parent: 'of-tecnologia' },
    { name: 'Redes e Internet',          slug: 'redes-internet',       parent: 'of-tecnologia' },
    { name: 'Médico a Domicilio',        slug: 'medico-domicilio',     parent: 'of-salud' },
    { name: 'Enfermero/a',               slug: 'enfermero',            parent: 'of-salud' },
    { name: 'Fisioterapeuta',            slug: 'fisioterapeuta',       parent: 'of-salud' },
    { name: 'Nutricionista',             slug: 'nutricionista',        parent: 'of-salud' },
    { name: 'Psicólogo/a',               slug: 'psicologo',            parent: 'of-salud' },
    { name: 'Clases Particulares',       slug: 'clases-particulares',  parent: 'of-educacion' },
    { name: 'Idiomas',                   slug: 'idiomas',              parent: 'of-educacion' },
    { name: 'Música',                    slug: 'musica',               parent: 'of-educacion' },
    { name: 'Arte y Manualidades',       slug: 'arte-manualidades',    parent: 'of-educacion' },
    { name: 'Taxi / Remisse',            slug: 'taxi-remisse',         parent: 'of-transporte' },
    { name: 'Mudanzas',                  slug: 'mudanzas',             parent: 'of-transporte' },
    { name: 'Mensajería / Delivery',     slug: 'mensajeria',           parent: 'of-transporte' },
    { name: 'Carga y Flete',             slug: 'carga-flete',          parent: 'of-transporte' },
    { name: 'Peluquero/a a Domicilio',   slug: 'peluquero-domicilio',  parent: 'of-servicios' },
    { name: 'Manicurista a Domicilio',   slug: 'manicurista',          parent: 'of-servicios' },
    { name: 'Fotógrafo / Videógrafo',    slug: 'fotografo',            parent: 'of-servicios' },
    { name: 'Chef a Domicilio',          slug: 'chef-domicilio',       parent: 'of-servicios' },
    { name: 'Ing. Civil / Arquitecto',   slug: 'ing-civil',            parent: 'of-ingenieria' },
    { name: 'Ing. de Sistemas / Software', slug: 'ing-sistemas',       parent: 'of-ingenieria' },
    { name: 'Diseñador Gráfico',         slug: 'disenador-grafico',    parent: 'of-ingenieria' },
    { name: 'Ing. Eléctrica / Mecánica', slug: 'ing-electrica',        parent: 'of-ingenieria' },
  ];

  for (const s of oficioSubs) {
    await prisma.category.create({
      data: { name: s.name, slug: s.slug, parentId: oficioParents[s.parent], forType: 'OFICIO' },
    });
  }

  console.log(`  ✓ ${oficioParentDefs.length} categorías padre OFICIO`);
  console.log(`  ✓ ${oficioSubs.length} subcategorías OFICIO`);

  // ── 4. CATEGORÍAS — NEGOCIO ───────────────────────────────
  console.log('🏪 Creando categorías NEGOCIO...');

  const negocioParents: Record<string, number> = {};
  const negocioParentDefs = [
    { name: 'Alimentación y Gastronomía',      slug: 'neg-alimentacion' },
    { name: 'Tiendas y Retail',                slug: 'neg-retail' },
    { name: 'Belleza y Estética',              slug: 'neg-belleza' },
    { name: 'Tecnología y Electrónica',        slug: 'neg-tecnologia' },
    { name: 'Salud y Farmacia',                slug: 'neg-salud' },
    { name: 'Educación y Cultura',             slug: 'neg-educacion' },
    { name: 'Servicios y Otros',               slug: 'neg-servicios' },
  ];

  for (const p of negocioParentDefs) {
    const c = await prisma.category.create({ data: { name: p.name, slug: p.slug, forType: 'NEGOCIO' } });
    negocioParents[p.slug] = c.id;
  }

  const negocioSubs = [
    { name: 'Restaurantes y Picanterías',      slug: 'restaurantes',         parent: 'neg-alimentacion' },
    { name: 'Pollerías y Parrillas',           slug: 'pollerias',            parent: 'neg-alimentacion' },
    { name: 'Cevicherías y Mariscos',          slug: 'cevicherias',          parent: 'neg-alimentacion' },
    { name: 'Chifas y Comida Oriental',        slug: 'chifas',               parent: 'neg-alimentacion' },
    { name: 'Pizzerías y Pastas',              slug: 'pizzerias',            parent: 'neg-alimentacion' },
    { name: 'Hamburgueserías y Fast Food',     slug: 'fast-food',            parent: 'neg-alimentacion' },
    { name: 'Panaderías y Pastelerías',        slug: 'panaderias',           parent: 'neg-alimentacion' },
    { name: 'Cafeterías y Juguerías',          slug: 'cafeterias',           parent: 'neg-alimentacion' },
    { name: 'Heladerías y Postres',            slug: 'heladerias',           parent: 'neg-alimentacion' },
    { name: 'Comida Vegetariana y Vegana',     slug: 'vegetariana',          parent: 'neg-alimentacion' },
    { name: 'Bodegas y Minimarkets',           slug: 'bodegas',              parent: 'neg-retail' },
    { name: 'Ferreterías y Materiales',        slug: 'ferreterias',          parent: 'neg-retail' },
    { name: 'Farmacias y Boticas',             slug: 'farmacias',            parent: 'neg-retail' },
    { name: 'Librerías e Imprentas',           slug: 'librerias',            parent: 'neg-retail' },
    { name: 'Tiendas de Ropa y Calzado',       slug: 'ropa-calzado',         parent: 'neg-retail' },
    { name: 'Licorerías y Bodegas de Licor',  slug: 'licorerías',           parent: 'neg-retail' },
    { name: 'Joyerías y Bisutería',            slug: 'joyerias',             parent: 'neg-retail' },
    { name: 'Peluquerías y Salones',           slug: 'peluquerias',          parent: 'neg-belleza' },
    { name: 'Barberías',                       slug: 'barberias',            parent: 'neg-belleza' },
    { name: 'Spa y Masajes',                   slug: 'spa-masajes',          parent: 'neg-belleza' },
    { name: 'Centros de Estética',             slug: 'centros-estetica',     parent: 'neg-belleza' },
    { name: 'Manicure y Pedicure',             slug: 'manicure-pedicure',    parent: 'neg-belleza' },
    { name: 'Tiendas de Celulares y Accesorios', slug: 'tienda-celulares',   parent: 'neg-tecnologia' },
    { name: 'Tiendas de Computadoras',         slug: 'tienda-computadoras',  parent: 'neg-tecnologia' },
    { name: 'Electrodomésticos y Menaje',      slug: 'electrodomesticos',    parent: 'neg-tecnologia' },
    { name: 'Clínicas y Consultorios',         slug: 'clinicas',             parent: 'neg-salud' },
    { name: 'Odontología y Dental',            slug: 'odontologia',          parent: 'neg-salud' },
    { name: 'Ópticas y Optometría',            slug: 'opticas',              parent: 'neg-salud' },
    { name: 'Laboratorios y Análisis',         slug: 'laboratorios',         parent: 'neg-salud' },
    { name: 'Veterinarias',                    slug: 'veterinarias',         parent: 'neg-salud' },
    { name: 'Academias y Centros de Estudio',  slug: 'academias',            parent: 'neg-educacion' },
    { name: 'Centros de Idiomas',              slug: 'centros-idiomas',      parent: 'neg-educacion' },
    { name: 'Colegios y Institutos',           slug: 'colegios-institutos',  parent: 'neg-educacion' },
    { name: 'Lavanderías',                     slug: 'lavanderias',          parent: 'neg-servicios' },
    { name: 'Hoteles y Hospedajes',            slug: 'hospedajes',           parent: 'neg-servicios' },
    { name: 'Talleres de Reparación',          slug: 'talleres-reparacion',  parent: 'neg-servicios' },
    { name: 'Venta de Gas y Combustible',      slug: 'venta-gas',            parent: 'neg-servicios' },
    { name: 'Agencias de Viaje',               slug: 'agencias-viaje',       parent: 'neg-servicios' },
  ];

  for (const s of negocioSubs) {
    await prisma.category.create({
      data: { name: s.name, slug: s.slug, parentId: negocioParents[s.parent], forType: 'NEGOCIO' },
    });
  }

  console.log(`  ✓ ${negocioParentDefs.length} categorías padre NEGOCIO`);
  console.log(`  ✓ ${negocioSubs.length} subcategorías NEGOCIO`);

  // ── 5. ADMINISTRADOR ─────────────────────────────────────
  console.log('👤 Creando administrador...');
  const adminPasswordHash = await bcrypt.hash('Admin2025.', 10);
  await prisma.user.create({
    data: {
      email: 'admin@oficio.com',
      passwordHash: adminPasswordHash,
      firstName: 'Administrador',
      lastName: 'Principal',
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });

  console.log('  ✓ Admin creado');
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  CREDENCIALES DE ACCESO ADMIN');
  console.log('  Correo:  admin@oficio.com');
  console.log('  Clave:   Admin2025.');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('🏁 Seed completado — base de datos lista');
}

main()
  .catch((e) => { console.error('❌ Error en el seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });