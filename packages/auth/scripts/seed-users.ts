import { prisma } from '@opsflow/db'
import { auth } from '../src/index'

/**
 * Bootstrap accounts for local development and the demo walkthrough.
 *
 * This lives in `packages/auth` rather than alongside the role and
 * department seed in `packages/db` because it needs Better Auth to hash
 * the passwords and write the matching `accounts` row. `packages/auth`
 * already depends on `packages/db`, so seeding users from there would
 * make the dependency circular.
 *
 * Run the `@opsflow/db` seed first — these users need their roles and
 * departments to exist.
 */

const DEV_PASSWORD = 'opsflow-dev-password'

const SEED_USERS = [
  {
    email: 'admin@opsflow.local',
    name: 'Ada Admin',
    role: 'admin',
    department: 'Management',
    position: 'Operations Director',
  },
  {
    email: 'manager@opsflow.local',
    name: 'Marco Manager',
    role: 'manager',
    department: 'Operations',
    position: 'Delivery Manager',
  },
  {
    email: 'employee@opsflow.local',
    name: 'Emma Employee',
    role: 'employee',
    department: 'Engineering',
    position: 'Software Engineer',
  },
]

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed users with known credentials in production')
  }

  const password = process.env.SEED_USER_PASSWORD ?? DEV_PASSWORD

  for (const seed of SEED_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: seed.email },
      select: { id: true },
    })

    if (existing) {
      console.log(`- ${seed.email} already exists, skipping`)
      continue
    }

    const [role, department] = await Promise.all([
      prisma.role.findUnique({ where: { name: seed.role }, select: { id: true } }),
      prisma.department.findUnique({ where: { name: seed.department }, select: { id: true } }),
    ])

    if (!role || !department) {
      throw new Error(
        `Missing role "${seed.role}" or department "${seed.department}" — run the @opsflow/db seed first`,
      )
    }

    // Signing up through Better Auth keeps password hashing and the
    // credential account row in its hands rather than reimplementing them.
    await auth.api.signUpEmail({
      body: { email: seed.email, password, name: seed.name },
    })

    // The create hook assigns the default employee role; these accounts are
    // provisioned by an operator, so their real role is applied afterwards.
    await prisma.user.update({
      where: { email: seed.email },
      data: {
        roleId: role.id,
        departmentId: department.id,
        position: seed.position,
        emailVerified: true,
        joinedAt: new Date(),
      },
    })

    console.log(`- created ${seed.email} (${seed.role})`)
  }

  console.log(`\nSeeded ${SEED_USERS.length} users. Password: ${password}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
