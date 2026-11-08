import { prisma } from '@opsflow/db'
import type { ActivityAction, ActivityEntityType } from '@opsflow/types/activity'
import { createUserSchema } from '@opsflow/types/user'
import { hashPassword } from 'better-auth/crypto'

/**
 * Sets a new password for one account, for the person who has forgotten
 * theirs.
 *
 * There is no forgotten-password flow and no admin set-password action, so
 * this is the only way back in. The hash comes from Better Auth's own
 * function, so sign-in verifies it exactly as it verifies a password set
 * through signup or change-password.
 *
 * Side effects, on purpose:
 * - Every session of the person is deleted: whoever holds an old cookie is
 *   signed out, as on a status change (apps/api/src/services/user.service.ts).
 * - The messaging key backup is discarded. It is wrapped with the old
 *   password (docs/technical_architecture.md §26.2) and can never be opened
 *   again; left in place it would strand the person on the messaging gate,
 *   because the public key may not be replaced through the API. Removing it
 *   lets the next sign-in register a fresh key. Existing direct-message
 *   history with the person becomes unreadable, for both sides.
 *
 * Not refused in production: production is where it is needed.
 */

/** The same bounds and email normalisation `POST /api/users` validates against. */
const resetSchema = createUserSchema.pick({ email: true, password: true })

const ACTION: ActivityAction = 'updated'
const ENTITY_TYPE: ActivityEntityType = 'user'

async function main() {
  const parsed = resetSchema.safeParse({
    email: process.env.RESET_EMAIL,
    password: process.env.RESET_PASSWORD,
  })

  if (!parsed.success) {
    // Reported against the variable names rather than the schema's field
    // names, because those are what the operator can act on.
    const problems = parsed.error.issues
      .map((issue) => `  RESET_${String(issue.path[0]).toUpperCase()}: ${issue.message}`)
      .join('\n')

    throw new Error(`Invalid reset configuration:\n${problems}`)
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  })

  if (!user) {
    throw new Error(`No account has the email ${email}`)
  }

  const hash = await hashPassword(password)

  const droppedKey = await prisma.$transaction(async (tx) => {
    const { count } = await tx.account.updateMany({
      where: { userId: user.id, providerId: 'credential' },
      data: { password: hash },
    })

    if (count === 0) {
      throw new Error(`${email} has no password credential to replace`)
    }

    await tx.session.deleteMany({ where: { userId: user.id } })

    const { count: keys } = await tx.dmKey.deleteMany({ where: { userId: user.id } })

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: ACTION,
        entityType: ENTITY_TYPE,
        entityId: user.id,
        description: `${user.name}'s password was reset by an operator`,
      },
    })

    return keys > 0
  })

  console.log(`Reset the password for ${email}; every session was signed out`)

  if (droppedKey) {
    console.warn(
      'Their messaging key backup was discarded: it was wrapped with the old password. ' +
        'A fresh key is registered at their next sign-in, and earlier direct messages with them can no longer be read.',
    )
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
