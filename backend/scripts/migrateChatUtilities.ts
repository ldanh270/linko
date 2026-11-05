import "dotenv/config"
import { pathToFileURL } from "node:url"
import mongoose from "mongoose"
import Poll from "../src/models/Poll"
import PollVote from "../src/models/PollVote"
import LocationShare from "../src/models/LocationShare"
import { Appointment } from "../src/models/Appointment"
import { AppointmentResponse } from "../src/models/AppointmentResponse"
import { ReminderJob } from "../src/models/ReminderJob"
import { ReminderDelivery } from "../src/models/ReminderDelivery"
import { configureDnsServers } from "../src/libs/database"

const models = [Poll, PollVote, LocationShare, Appointment, AppointmentResponse, ReminderJob, ReminderDelivery] as const
const flags = { APPLY: "--apply", BACKUP: "--backup-confirmed", REVIEW: "--dry-run-reviewed" } as const

/** Preview or add declared utility indexes without dropping existing indexes or rewriting chat data. */
async function main(): Promise<void> {
  const apply = process.argv.includes(flags.APPLY)
  if (apply && (!process.argv.includes(flags.BACKUP) || !process.argv.includes(flags.REVIEW))) {
    process.stderr.write("Apply requires --backup-confirmed and --dry-run-reviewed.\n")
    process.exitCode = 1
    return
  }
  try {
    const connectionString = process.env.MONGODB_CONNECTION_STRING
    if (!connectionString) throw new Error("Missing database configuration")
    configureDnsServers()
    await mongoose.connect(connectionString, { autoIndex: false, autoCreate: false })
    for (const model of models) {
      process.stdout.write(`${JSON.stringify({ mode: apply ? "apply" : "dry-run", collection: model.collection.name, indexes: model.schema.indexes() })}\n`)
      if (apply) await model.createIndexes()
    }
  } catch {
    process.stderr.write("Chat utility index migration failed; inspect database availability and existing duplicate keys before retrying.\n")
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main()
