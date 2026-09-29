import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'System Administrator';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be defined.');
  }

  console.log('🌱 Starting database seed for ADMIN user...');
  console.log(`👤 Admin Name:  ${name}`);
  console.log(`📧 Admin Email: ${email}`);

  // Hash the admin password with BCrypt cost factor 12
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Upsert the Admin user in PostgreSQL
  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: 'ADMIN',
      isActive: true
    },
    create: {
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  console.log('\n✅ Admin user successfully seeded!');
  console.log(JSON.stringify(adminUser, null, 2));
}

seedAdmin()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
