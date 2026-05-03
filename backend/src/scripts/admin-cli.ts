import "dotenv/config"
import bcrypt from "bcrypt"
import { nanoid } from "nanoid"
import { AdminUserModel } from "../models/index.js"
import { getEnforcer, reloadEnforcerPolicy } from "../rbac/enforcer.js"

type ArgMap = Record<string, string | boolean>

const parseArgs = (argv: string[]) => {
  const out: ArgMap = {}
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]
    if (!raw.startsWith("--")) continue
    const key = raw.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith("--")) {
      out[key] = true
      continue
    }
    out[key] = next
    i++
  }
  return out
}

const getString = (args: ArgMap, key: string) => {
  const v = args[key]
  return typeof v === "string" ? v : ""
}

const getBool = (args: ArgMap, key: string) => {
  const v = args[key]
  if (v === true) return true
  if (typeof v === "string") return v === "true" || v === "1"
  return false
}

const main = async () => {
  const [command, ...rest] = process.argv.slice(2)
  const args = parseArgs(rest)

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log("Usage:")
    console.log("  npm -C backend run admin:cli -- <command> [--flags]")
    console.log("")
    console.log("Commands:")
    console.log("  list-users")
    console.log("  create-user --username <u> --password <p> [--email <e>] [--display-name <n>] [--avatar-url <u>] [--inactive]")
    console.log("  reset-user-password --username <u>|--id <id> --password <p>")
    console.log("  grant-super-admin --username <u>")
    process.exit(0)
  }

  if (command === "list-users") {
    const rows = await AdminUserModel.findAll({ order: [["created_at", "DESC"]] })
    const enforcer = await getEnforcer()
    for (const r of rows) {
      const data = r.toJSON() as any
      const username = String(data.username)
      const roles = await enforcer.getRolesForUser(username)
      console.log(`${String(data.id)}\t${username}\t${data.is_active ? "active" : "inactive"}\t${roles.join(",")}`)
    }
    process.exit(0)
  }

  if (command === "create-user") {
    const username = getString(args, "username").trim()
    const password = getString(args, "password")
    const email = getString(args, "email").trim() || null
    const displayName = getString(args, "display-name").trim() || null
    const avatarUrl = getString(args, "avatar-url").trim() || null
    const inactive = getBool(args, "inactive")

    if (!username || username.length < 2) throw new Error("INVALID_USERNAME")
    if (!password || password.length < 4) throw new Error("INVALID_PASSWORD")

    const existing = await AdminUserModel.findOne({ where: { username } as any })
    if (existing) throw new Error("USERNAME_EXISTS")

    const passwordHash = await bcrypt.hash(password, 10)
    const row = await AdminUserModel.create({
      id: nanoid(16),
      username,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
      password_hash: passwordHash,
      is_active: !inactive,
    } as any)

    console.log(`created user: ${String((row.toJSON() as any).id)} ${username}`)
    process.exit(0)
  }

  if (command === "reset-user-password") {
    const username = getString(args, "username").trim()
    const id = getString(args, "id").trim()
    const password = getString(args, "password")
    if ((!username && !id) || !password || password.length < 4) throw new Error("INVALID_ARGS")

    const user = await AdminUserModel.findOne({ where: (id ? { id } : { username }) as any })
    if (!user) throw new Error("USER_NOT_FOUND")

    const passwordHash = await bcrypt.hash(password, 10)
    await user.update({ password_hash: passwordHash } as any)
    console.log(`updated password: ${String((user.toJSON() as any).id)} ${String((user.toJSON() as any).username)}`)
    process.exit(0)
  }

  if (command === "grant-super-admin") {
    const username = getString(args, "username").trim()
    if (!username) throw new Error("INVALID_USERNAME")
    const user = await AdminUserModel.findOne({ where: { username } as any })
    if (!user) throw new Error("USER_NOT_FOUND")
    const enforcer = await getEnforcer()
    await enforcer.addRoleForUser(username, "role:super_admin")
    await enforcer.savePolicy()
    await reloadEnforcerPolicy()
    console.log(`granted role:super_admin -> ${username}`)
    process.exit(0)
  }

  throw new Error(`UNKNOWN_COMMAND:${command}`)
}

main().catch((err) => {
  console.error(String((err as any)?.message || err))
  process.exit(1)
})

