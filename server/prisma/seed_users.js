import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function seed() {
  console.log('Seeding verification users...');

  // 1. Admin
  const adminPassword = await bcrypt.hash('AdminSecure123!', SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@exam.edu' },
    update: { passwordHash: adminPassword, isActive: true },
    create: {
      name: 'System Administrator',
      email: 'admin@exam.edu',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('Admin:', admin.email);

  // 2. Faculty
  const facultyPassword = await bcrypt.hash('Faculty123!', SALT_ROUNDS);
  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@exam.edu' },
    update: { passwordHash: facultyPassword, isActive: true },
    create: {
      name: 'Dr. Sarah Jenkins',
      email: 'faculty@exam.edu',
      passwordHash: facultyPassword,
      role: 'FACULTY',
      isActive: true
    }
  });
  console.log('Faculty:', faculty.email);

  // 3. Student
  const studentPassword = await bcrypt.hash('Student123!', SALT_ROUNDS);
  const student = await prisma.user.upsert({
    where: { email: 'student@exam.edu' },
    update: { passwordHash: studentPassword, batch: 'CS-2026-A', isActive: true },
    create: {
      name: 'Alex Johnson',
      email: 'student@exam.edu',
      passwordHash: studentPassword,
      role: 'STUDENT',
      batch: 'CS-2026-A',
      isActive: true
    }
  });
  console.log('Student:', student.email, 'Batch:', student.batch);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
