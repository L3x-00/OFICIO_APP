import { PrismaClient } from '../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import * as bcrypt from 'bcrypt';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'oficio_db',
  user: 'oficio_user',
  password: 'oficio_pass_2025',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── 1. LIMPIEZA TOTAL ────────────────────────────────────
  console.log('🗑️  Borrando datos existentes...');

  // 1.1. Tablas de Subastas y Ofertas (Hijos de ServiceRequest y Provider)
  await prisma.offer.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.userPenalty.deleteMany();

  // 1.2. Tablas de Soporte, Pagos y Analíticas
  await prisma.providerAnalytic.deleteMany();
  await prisma.adminNotification.deleteMany();
  await prisma.yapePayment.deleteMany(); // En tu esquema es YapePayment, no Payment
  await prisma.payment.deleteMany();     // También tienes una tabla Payment
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

  // 1.3. Tablas Principales (Padres)
  await prisma.provider.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany(); // Ahora sí, el User está libre de dependencias

  // 1.4. Estructura base
  await prisma.category.updateMany({ data: { parentId: null } });
  await prisma.category.deleteMany();
  await prisma.locality.deleteMany();

  console.log('✅ Base de datos limpia');

  // ── 2. LOCALIDADES ───────────────────────────────────────
  console.log('📍 Creando localidades...');
  const huancayo = await prisma.locality.create({
    data: { name: 'Huancayo', department: 'Junín', country: 'Perú' },
  });
  await prisma.locality.create({ data: { name: 'Lima', department: 'Lima', country: 'Perú' } });
  await prisma.locality.create({ data: { name: 'Cusco', department: 'Cusco', country: 'Perú' } });
  await prisma.locality.create({ data: { name: 'Arequipa', department: 'Arequipa', country: 'Perú' } });
  await prisma.locality.create({ data: { name: 'Trujillo', department: 'La Libertad', country: 'Perú' } });
  console.log('  ✓ 5 localidades creadas');

  // ── 3. CATEGORÍAS — OFICIO (profesionales independientes) ─
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
    // Hogar y Construcción
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
    // Tecnología
    { name: 'Técnico en PC / Laptop',    slug: 'tecnico-pc',           parent: 'of-tecnologia' },
    { name: 'Técnico Celular / Tablet',  slug: 'tecnico-celular',      parent: 'of-tecnologia' },
    { name: 'Técnico de Electrodomésticos', slug: 'tecnico-electro',   parent: 'of-tecnologia' },
    { name: 'Redes e Internet',          slug: 'redes-internet',       parent: 'of-tecnologia' },
    // Salud y Bienestar
    { name: 'Médico a Domicilio',        slug: 'medico-domicilio',     parent: 'of-salud' },
    { name: 'Enfermero/a',               slug: 'enfermero',            parent: 'of-salud' },
    { name: 'Fisioterapeuta',            slug: 'fisioterapeuta',       parent: 'of-salud' },
    { name: 'Nutricionista',             slug: 'nutricionista',        parent: 'of-salud' },
    { name: 'Psicólogo/a',               slug: 'psicologo',            parent: 'of-salud' },
    // Educación
    { name: 'Clases Particulares',       slug: 'clases-particulares',  parent: 'of-educacion' },
    { name: 'Idiomas',                   slug: 'idiomas',              parent: 'of-educacion' },
    { name: 'Música',                    slug: 'musica',               parent: 'of-educacion' },
    { name: 'Arte y Manualidades',       slug: 'arte-manualidades',    parent: 'of-educacion' },
    // Transporte y Mudanzas
    { name: 'Taxi / Remisse',            slug: 'taxi-remisse',         parent: 'of-transporte' },
    { name: 'Mudanzas',                  slug: 'mudanzas',             parent: 'of-transporte' },
    { name: 'Mensajería / Delivery',     slug: 'mensajeria',           parent: 'of-transporte' },
    { name: 'Carga y Flete',             slug: 'carga-flete',          parent: 'of-transporte' },
    // Servicios Personales
    { name: 'Peluquero/a a Domicilio',   slug: 'peluquero-domicilio',  parent: 'of-servicios' },
    { name: 'Manicurista a Domicilio',   slug: 'manicurista',          parent: 'of-servicios' },
    { name: 'Fotógrafo / Videógrafo',    slug: 'fotografo',            parent: 'of-servicios' },
    { name: 'Chef a Domicilio',          slug: 'chef-domicilio',       parent: 'of-servicios' },
    // Ingeniería y Diseño
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

  // ── 4. CATEGORÍAS — NEGOCIO (establecimientos comerciales) ─
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
    // Alimentación y Gastronomía
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
    // Tiendas y Retail
    { name: 'Bodegas y Minimarkets',           slug: 'bodegas',              parent: 'neg-retail' },
    { name: 'Ferreterías y Materiales',        slug: 'ferreterias',          parent: 'neg-retail' },
    { name: 'Farmacias y Boticas',             slug: 'farmacias',            parent: 'neg-retail' },
    { name: 'Librerías e Imprentas',           slug: 'librerias',            parent: 'neg-retail' },
    { name: 'Tiendas de Ropa y Calzado',       slug: 'ropa-calzado',         parent: 'neg-retail' },
    { name: 'Licorerías y Bodegas de Licor',  slug: 'licorerías',           parent: 'neg-retail' },
    { name: 'Joyerías y Bisutería',            slug: 'joyerias',             parent: 'neg-retail' },
    // Belleza y Estética
    { name: 'Peluquerías y Salones',           slug: 'peluquerias',          parent: 'neg-belleza' },
    { name: 'Barberías',                       slug: 'barberias',            parent: 'neg-belleza' },
    { name: 'Spa y Masajes',                   slug: 'spa-masajes',          parent: 'neg-belleza' },
    { name: 'Centros de Estética',             slug: 'centros-estetica',     parent: 'neg-belleza' },
    { name: 'Manicure y Pedicure',             slug: 'manicure-pedicure',    parent: 'neg-belleza' },
    // Tecnología y Electrónica
    { name: 'Tiendas de Celulares y Accesorios', slug: 'tienda-celulares',   parent: 'neg-tecnologia' },
    { name: 'Tiendas de Computadoras',         slug: 'tienda-computadoras',  parent: 'neg-tecnologia' },
    { name: 'Electrodomésticos y Menaje',      slug: 'electrodomesticos',    parent: 'neg-tecnologia' },
    // Salud y Farmacia
    { name: 'Clínicas y Consultorios',         slug: 'clinicas',             parent: 'neg-salud' },
    { name: 'Odontología y Dental',            slug: 'odontologia',          parent: 'neg-salud' },
    { name: 'Ópticas y Optometría',            slug: 'opticas',              parent: 'neg-salud' },
    { name: 'Laboratorios y Análisis',         slug: 'laboratorios',         parent: 'neg-salud' },
    { name: 'Veterinarias',                    slug: 'veterinarias',         parent: 'neg-salud' },
    // Educación y Cultura
    { name: 'Academias y Centros de Estudio',  slug: 'academias',            parent: 'neg-educacion' },
    { name: 'Centros de Idiomas',              slug: 'centros-idiomas',      parent: 'neg-educacion' },
    { name: 'Colegios y Institutos',           slug: 'colegios-institutos',  parent: 'neg-educacion' },
    // Servicios y Otros
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
