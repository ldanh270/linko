import { UTILITY_ROUTES } from "@linko/contracts"
import express, { type Router } from "express"
import validate from "../../middlewares/validate.middleware"
import type { UtilityRuntime } from "../utility/utility.types"
import { PollController } from "./poll.controller"
import { MongoosePollRepository } from "./poll.repository"
import { pollCreateSchema, pollListSchema, pollResourceSchema, pollVoteSchema } from "./poll.schema"
import { PollService } from "./poll.service"

/** Compose the poll feature behind the shared authenticated conversation boundary. */
export function createPollFeature(runtime: UtilityRuntime): { readonly router: Router } {
    const controller = new PollController(new PollService({ runtime, repository: new MongoosePollRepository() }))
    const router = express.Router()
    router.get(UTILITY_ROUTES.POLLS, validate(pollListSchema), controller.list)
    router.post(UTILITY_ROUTES.POLLS, validate(pollCreateSchema), controller.create)
    router.get(UTILITY_ROUTES.POLL, validate(pollResourceSchema), controller.get)
    router.put(UTILITY_ROUTES.VOTE, validate(pollVoteSchema), controller.vote)
    router.delete(UTILITY_ROUTES.VOTE, validate(pollResourceSchema), controller.withdraw)
    router.post(UTILITY_ROUTES.CLOSE_POLL, validate(pollResourceSchema), controller.close)
    return { router }
}
