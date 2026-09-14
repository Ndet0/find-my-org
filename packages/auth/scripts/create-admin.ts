import { prisma } from '@opsflow/db'
import type { ActivityAction, ActivityEntityType } from '@opsflow/types/activity'
import { createUserSchema } from '@opsflow/types/user'
import { auth } from '../src/index'

/**
 * Creates the first administrator on a database that has none.
 *
 * Without this there is no way into a fresh production deployment: the HTTP
 * signup path is blocked (apps/api/src/app.ts), `POST /api/users` needs an
 * admin session, and `seed-users.ts` refuses to run in production because its
 * credentials are public. Run the `@opsflow/db` seed first — `users.role_id`
 * is NOT NULL, so the `admin` role row has to exist.
 *
 * Safe to leave in a release command: it does nothing when an administrator
 * already exists, so re-running a deployment does not fail on it.
 */

/** The same bounds and email normalisation `POST /api/users` validates against. */
const bootstrapSchema = createUserSchema.pick({ name: true, email: true, password: true })

const ACTION: ActivityAction = 'created'
const ENTITY_TYPE: ActivityEntityType = 'user'

async function main() {
  const parsed = bootstrapSchema.safeParse({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  })

  if (!parsed.success) {
    // Reported against the variable names rather than the schema's field
    // names, because those are what the operator can act on.
    const problems = parsed.error.issues
      .map((issue) => `  ADMIN_${String(issue.path[0]).toUpperCase()}: ${issue.message}`)
      .join('\n')

    throw new Error(`Invalid bootstrap configuration:\n${problems}`)
  }

  const { name, email, password } = parsed.data

  const [adminRole, existingAdmin, taken] = await Promise.all([
    prisma.role.findUnique({ where: { name: 'admin' }, select: { id: true } }),
    prisma.user.findFirst({ where: { role: { name: 'admin' } }, select: { email: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
  ])

  if (!adminRole) {
    throw new Error('Missing the "admin" role — run the @opsflow/db seed first')
  }

  if (existingAdmin) {
    console.log(`An administrator already exists (${existingAdmin.email}); nothing to do`)
    return
  }

  if (taken) {
    throw new Error(`${email} already has an account; promote it instead of bootstrapping`)
  }

  // Better Auth hashes the password and writes the matching `accounts` row.
  const created = await auth.api.signUpEmail({ body: { email, password, name } })

  // The signup committed; the profile is a second write. If it fails, remove
  // the half-made account — default employee role, no activity row — rather
  // than leave it to answer the next attempt with "that email already exists".
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: created.user.id },
        data: {
          roleId: adminRole.id,
          status: 'active',
          emailVerified: true,
          joinedAt: new Date(),
        },
        select: { id: true, name: true },
      })

      // Its own actor: there is no one else on the database yet, and the
      // trail should show where the first account came from.
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: ACTION,
          entityType: ENTITY_TYPE,
          entityId: user.id,
          description: `${user.name} was created as the first administrator`,
        },
      })
    })
  } catch (error) {
    await prisma.user.delete({ where: { id: created.user.id } }).catch((cleanupError: unknown) => {
      console.error(`Could not remove the half-created user ${created.user.id}`, cleanupError)
    })
    throw error
  }

  console.log(`Created ${email} as an administrator`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
