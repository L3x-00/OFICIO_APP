import { PrismaClient } from '../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import * as bcrypt from 'bcrypt';

// Configuración del Pool y Adaptador para Prisma 7
const pool = new Pool({ 
  host: 'localhost',
  port: 5432,
  database: 'oficio_db',
  user: 'oficio_user',
  password: 'oficio_pass_2025',
});
const adapter = new PrismaPg(pool);

// Instanciamos el cliente usando el adaptador
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed limpio...');

  // ── 1. LIMPIEZA TOTAL (orden respetando foreign keys) ──────
  console.log('🗑️  Borrando datos existentes...');

  // Tablas sin dependencias
  await prisma.providerAnalytic.deleteMany();
  await prisma.adminNotification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.verificationDoc.deleteMany();
  await prisma.providerImage.deleteMany();
  await prisma.subscription.deleteMany();

  // Providers (depende de users, categories, localities)
  await prisma.provider.deleteMany();

  // Users (depende de sí mismo por relaciones)
  await prisma.otpCode.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Categorías: primero quitar parentId de hijos, luego borrar todo
  await prisma.category.updateMany({ data: { parentId: null } });
  await prisma.category.deleteMany();

  // Localidades (sin dependencias)
  await prisma.locality.deleteMany();

  console.log('✅ Base de datos limpia');

  // ── 2. LOCALIDADES ──────────────────────────────────────────
  console.log('📍 Creando localidades...');

  const huancayo = await prisma.locality.create({
    data: { name: 'Huancayo', department: 'Junín', country: 'Perú' },
  });

  await prisma.locality.create({
    data: { name: 'Lima', department: 'Lima', country: 'Perú' },
  });

  await prisma.locality.create({
    data: { name: 'Cusco', department: 'Cusco', country: 'Perú' },
  });

  console.log(`  ✓ 3 localidades creadas`);

  // ── 3. CATEGORÍAS JERÁRQUICAS ──────────────────────────────
  console.log('📂 Creando categorías...');

  const parentDefs = [
    { name: 'Hogar y Construcción', slug: 'hogar' },
    { name: 'Gastronomía',          slug: 'gastronomia' },
    { name: 'Belleza y Estética',   slug: 'belleza' },
    { name: 'Transporte',           slug: 'transporte-general' },
    { name: 'Tecnología',           slug: 'tecnologia' },
    { name: 'Salud y Bienestar',    slug: 'salud' },
    { name: 'Educación',            slug: 'educacion' },
    { name: 'Ingeniería',           slug: 'ingenieria' },
  ];

  const parents: Record<string, number> = {};
  for (const p of parentDefs) {
    const created = await prisma.category.create({
      data: { name: p.name, slug: p.slug },
    });
    parents[p.slug] = created.id;
  }

  const subDefs = [
    // Hogar y Construcción
    { name: 'Electricistas',       slug: 'electricistas',   parent: 'hogar' },
    { name: 'Gasfiteros',          slug: 'gasfiteros',      parent: 'hogar' },
    { name: 'Pintores',            slug: 'pintores',        parent: 'hogar' },
    { name: 'Carpintería',         slug: 'carpinteria',     parent: 'hogar' },
    { name: 'Albañilería',         slug: 'albanileria',     parent: 'hogar' },
    { name: 'Jardinería',          slug: 'jardineria',      parent: 'hogar' },
    { name: 'Limpieza del Hogar',  slug: 'limpieza',        parent: 'hogar' },
    // Gastronomía
    { name: 'Restaurantes',        slug: 'restaurantes',    parent: 'gastronomia' },
    { name: 'Cafeterías',          slug: 'cafeterias',      parent: 'gastronomia' },
    { name: 'Pastelería',          slug: 'pasteleria',      parent: 'gastronomia' },
    // Belleza y Estética
    { name: 'Peluquerías',         slug: 'peluquerias',     parent: 'belleza' },
    { name: 'Barbería',            slug: 'barberia',        parent: 'belleza' },
    { name: 'Spa y Masajes',       slug: 'spa',             parent: 'belleza' },
    { name: 'Manicure / Pedicure', slug: 'manicure',        parent: 'belleza' },
    // Transporte
    { name: 'Transporte',          slug: 'transporte',      parent: 'transporte-general' },
    { name: 'Taxi y Remisse',      slug: 'taxi',            parent: 'transporte-general' },
    { name: 'Mudanzas',            slug: 'mudanzas',        parent: 'transporte-general' },
    // Tecnología
    { name: 'Técnico en PC',       slug: 'tecnico-pc',      parent: 'tecnologia' },
    { name: 'Técnico Celular',     slug: 'tecnico-celular', parent: 'tecnologia' },
    { name: 'Redes e Internet',    slug: 'redes',           parent: 'tecnologia' },
    // Salud y Bienestar
    { name: 'Médico a Domicilio',  slug: 'medico',          parent: 'salud' },
    { name: 'Enfermería',          slug: 'enfermeria',      parent: 'salud' },
    { name: 'Fisioterapia',        slug: 'fisioterapia',    parent: 'salud' },
    { name: 'Nutricionista',       slug: 'nutricionista',   parent: 'salud' },
    // Educación
    { name: 'Clases Particulares', slug: 'clases',          parent: 'educacion' },
    { name: 'Idiomas',             slug: 'idiomas',         parent: 'educacion' },
    { name: 'Música',              slug: 'musica',          parent: 'educacion' },
    // Ingeniería
    { name: 'Ing. Civil',          slug: 'ing-civil',       parent: 'ingenieria' },
    { name: 'Ing. de Sistemas',    slug: 'ing-sistemas',    parent: 'ingenieria' },
    { name: 'Ing. Eléctrica',      slug: 'ing-electrica',   parent: 'ingenieria' },
    { name: 'Ing. de Minas',       slug: 'ing-minas',       parent: 'ingenieria' },
  ];

  for (const s of subDefs) {
    await prisma.category.create({
      data: { name: s.name, slug: s.slug, parentId: parents[s.parent] },
    });
  }

  console.log(`  ✓ ${parentDefs.length} categorías padre`);
  console.log(`  ✓ ${subDefs.length} subcategorías`);

  // ── 4. ADMINISTRADOR (únicamente 1) ────────────────────────
  console.log('👤 Creando administrador...');

  const adminEmail = 'admin@oficio.com';
  const adminPasswordHash = await bcrypt.hash('Admin2025.', 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      firstName: 'Administrador',
      lastName: 'Principal',
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });

  console.log(`  ✓ Admin creado`);
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  CREDENCIALES DE ACCESO ADMIN');
  console.log('  Correo:  admin@oficio.com');
  console.log('  Clave:   Admin2025.');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('🏁 Seed completado — base de datos limpia y lista');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });