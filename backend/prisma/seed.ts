import { PrismaClient } from '../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import * as bcrypt from 'bcrypt';

// Configuración del Pool y Adaptador para Prisma 7
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});
const adapter = new PrismaPg(pool);

// Instanciamos el cliente usando el adaptador
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Localidades ──────────────────────────────────────────
  const huancayo = await prisma.locality.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Huancayo', department: 'Junín', country: 'Perú' },
  });

  // ── Categorías ───────────────────────────────────────────
  const catNames = [
    { name: 'Electricistas', slug: 'electricistas' },
    { name: 'Gasfiteros', slug: 'gasfiteros' },
    { name: 'Pintores', slug: 'pintores' },
    { name: 'Restaurantes', slug: 'restaurantes' },
    { name: 'Peluquerías', slug: 'peluquerias' },
    { name: 'Transporte', slug: 'transporte' },
  ];

  const cats = await Promise.all(
    catNames.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: {},
        create: { name: c.name, slug: c.slug },
      }),
    ),
  );
  // ── Administrador ───────────────────────────────────────────
  const adminEmail = 'admin@oficio.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        firstName: 'Administrador',
        lastName: 'Principal',
        role: 'ADMIN',
      },
    });
    console.log(`✅ Creado usuario administrador: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Usuario administrador ya existe: ${adminEmail}`);
  }
  // ── Datos de Proveedores ─────────────────────
  const proveedoresData = [
    {
      email: 'juan.elec@test.com',
      firstName: 'Juan',
      lastName: 'Pérez',
      businessName: 'Juan Electricista',
      phone: '+51987654321',
      whatsapp: '+51987654321',
      description: 'Electricista certificado con 10 años de experiencia.',
      categoryIndex: 0,
      availability: 'DISPONIBLE',
      isVerified: true,
      averageRating: 4.8,
      totalReviews: 23,
      latitude: -12.0664,
      longitude: -75.2049,
      address: 'Jr. Ancash 456, Huancayo',
      type: 'OFICIO',
    },
    {
      email: 'carlos.gas@test.com',
      firstName: 'Carlos',
      lastName: 'López',
      businessName: 'Carlos Gasfitero',
      phone: '+51998877665',
      description: 'Gasfitería en general: reparación de fugas y termas.',
      categoryIndex: 1,
      availability: 'OCUPADO',
      isVerified: true,
      averageRating: 4.2,
      totalReviews: 11,
      latitude: -12.0712,
      longitude: -75.2130,
      address: 'Av. Real 789, Huancayo',
      type: 'OFICIO',
    },
    {
      email: 'sabor@test.com',
      firstName: 'María',
      lastName: 'García',
      businessName: 'Restaurante El Sabor',
      phone: '+51912345678',
      description: 'Comida peruana tradicional. Especialidad en platos típicos.',
      categoryIndex: 3,
      availability: 'CON_DEMORA',
      isVerified: false,
      averageRating: 4.1,
      totalReviews: 57,
      latitude: -12.0598,
      longitude: -75.1978,
      address: 'Calle Real 123, Huancayo',
      type: 'NEGOCIO',
    },
  ];

  for (const data of proveedoresData) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'PROVEEDOR',
        },
      });

      const provider = await prisma.provider.create({
        data: {
          userId: user.id,
          businessName: data.businessName,
          phone: data.phone,
          whatsapp: (data as any).whatsapp ?? null,
          description: data.description,
          categoryId: cats[data.categoryIndex].id,
          localityId: huancayo.id,
          availability: data.availability as any,
          isVerified: data.isVerified,
          averageRating: data.averageRating,
          totalReviews: data.totalReviews,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          type: data.type as any,
          scheduleJson: {
            lun: '8:00-18:00',
            mar: '8:00-18:00',
            mie: '8:00-18:00',
            jue: '8:00-18:00',
            vie: '8:00-18:00',
            sab: '9:00-13:00',
            dom: 'Cerrado',
          },
        },
      });

      // Suscripción inicial
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2);
      await prisma.subscription.create({
        data: {
          providerId: provider.id,
          plan: 'GRATIS',
          status: 'GRACIA',
          endDate,
        },
      });

      console.log(`✅ Creado: ${data.businessName}`);
    }
  }

  console.log('🏁 Seed completado exitosamente');
}
// ── Reseñas de prueba ──────────────────────────────────────
async function seedReviews(prisma: PrismaClient) {
  const providers = await prisma.provider.findMany({ take: 3 });
  const users = await prisma.user.findMany({
    where: { role: 'USUARIO' },
    take: 2,
  });

  if (users.length === 0) {
    // Crear un usuario normal para las reseñas
    const user = await prisma.user.create({
      data: {
        email: 'cliente@test.com',
        passwordHash: await bcrypt.hash('123456', 10),
        firstName: 'Ana',
        lastName: 'Usuaria',
        role: 'USUARIO',
      },
    });
    users.push(user);
  }

  for (const provider of providers) {
    const existing = await prisma.review.findFirst({
      where: { providerId: provider.id },
    });
    if (!existing) {
      await prisma.review.create({
        data: {
          providerId: provider.id,
          userId: users[0].id,
          rating: 5,
          comment: 'Excelente servicio, muy puntual y profesional.',
          photoUrl: 'https://picsum.photos/400/300?random=1',
          isVisible: true,
        },
      });
      await seedReviews(prisma);
      console.log(`⭐ Reseña creada para: ${provider.businessName}`);
    }
  }
}
main()

  .catch((e) => {
    
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Cerramos también el pool de pg
  });