import { prisma } from '../src/index'

/**
 * Baseline reference data. `users.role_id` is NOT NULL, so no user —
 * including the first admin — can be created until these rows exist.
 * Idempotent: safe to re-run against an existing database.
 */
const ROLES = [
  { name: 'admin', description: 'Full access to the organisation and system settings' },
  { name: 'manager', description: 'Manages clients, projects, tasks and team assignment' },
  { name: 'employee', description: 'Works on assigned projects and tasks' },
]

const DEPARTMENTS = [
  { name: 'Management', description: 'Organisational leadership' },
  { name: 'Engineering', description: 'Software design and delivery' },
  { name: 'Design', description: 'Product and visual design' },
  { name: 'Operations', description: 'Day-to-day operational delivery' },
  { name: 'Finance', description: 'Accounting and financial control' },
]

async function main() {
  for (const role of ROLES) {
    await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role })
  }

  for (const department of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name: department.name },
      update: {},
      create: department,
    })
  }

  console.log(`Seeded ${ROLES.length} roles and ${DEPARTMENTS.length} departments`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
