import { MEMBERSHIP_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { MembershipController } from "./membership.controller"
import { changeRoleSchema, conversationParamsSchema, memberParamsSchema, removeMemberSchema, transferOwnerSchema } from "./membership.schema"

/** Register authenticated group member listing and management endpoints. */
export function createMembershipRouter(controller: MembershipController): Router {
    const router = express.Router()
    router.get(MEMBERSHIP_ROUTE_PATHS.PARTICIPANTS, validate(conversationParamsSchema), controller.list)
    router.patch(MEMBERSHIP_ROUTE_PATHS.MEMBER, validate(changeRoleSchema), controller.changeRole)
    router.delete(MEMBERSHIP_ROUTE_PATHS.MEMBER, validate(removeMemberSchema), controller.remove)
    router.post(MEMBERSHIP_ROUTE_PATHS.TRANSFER_OWNER, validate(transferOwnerSchema), controller.transferOwner)
    return router
}
