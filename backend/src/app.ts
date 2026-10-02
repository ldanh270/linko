import { API_ROUTES, ERROR_CODES } from "@linko/contracts"
import cookieParser from "cookie-parser"
import cors from "cors"
import express, { type Express, type Router } from "express"

import type { AuthRuntimeConfig } from "./configs/auth.config"
import { ConversationController } from "./modules/conversation/conversation.controller"
import { ConversationLifecycleController } from "./modules/conversation/conversationLifecycle.controller"
import { MongooseConversationLifecycleRepository } from "./modules/conversation/conversationLifecycle.repository"
import { ConversationLifecycleService } from "./modules/conversation/conversationLifecycle.service"
import { MembershipController } from "./modules/membership/membership.controller"
import { MongooseMembershipRepository } from "./modules/membership/membership.repository"
import { createMembershipRouter } from "./modules/membership/membership.route"
import { MembershipService } from "./modules/membership/membership.service"
import { createConversationLifecycleRouter, createConversationRouter } from "./modules/conversation/conversation.route"
import { MongooseConversationRepository } from "./modules/conversation/conversation.repository"
import { R2GroupAvatarStorage } from "./modules/conversation/group-avatar.storage"
import { ConversationService } from "./modules/conversation/conversation.service"
import { LoggerGroupAvatarCleanupFailureRecorder } from "./modules/conversation/group-avatar-cleanup.recorder"
import { MongooseAuthRepository } from "./modules/auth/auth.repository"
import { LoggerProfileImageCleanupFailureRecorder } from "./modules/user/profile.cleanup-recorder"
import { ProfileController } from "./modules/user/profile.controller"
import { MongooseProfileRepository } from "./modules/user/profile.repository"
import { createProfileRouter } from "./modules/user/profile.route"
import { R2ProfileImageStorage } from "./modules/user/profile.image-storage"
import { ProfileService } from "./modules/user/profile.service"
import { InvitationController } from "./modules/invitation/invitation.controller"
import { MongooseInvitationRepository } from "./modules/invitation/invitation.repository"
import {
    createInvitationAcceptRouter,
    createInvitationPreviewRouter,
    createInvitationRouter,
} from "./modules/invitation/invitation.route"
import { InvitationService } from "./modules/invitation/invitation.service"
import { AuthTokenService, BcryptPasswordHasher } from "./modules/auth/auth.security"
import { AuthService } from "./modules/auth/auth.service"
import { AuthController } from "./modules/auth/auth.controller"
import { createAuthRouter } from "./modules/auth/auth.route"
import { createAuthenticate } from "./middlewares/route.middleware"
import { withTransaction } from "./shared/persistence/withTransaction"
import { BusinessException } from "./shared/errors/BusinessException"
import type { ServerLogger } from "./shared/logger/logger"
import { createGlobalErrorHandler } from "./shared/middlewares/globalErrorHandler"
import { withRequestContext } from "./shared/middlewares/requestContext"

/** Collaborators and route groups wired by the composition root. */
export interface AppDependencies {
    publicRoutes: Router
    privateRoutes: Router
    logger: ServerLogger
    authConfig: AuthRuntimeConfig
}

/** Compose the Express middleware boundary and existing route groups once. */
export function createApp(dependencies: AppDependencies): Express {
    const authService = new AuthService({
        repository: new MongooseAuthRepository(),
        passwordHasher: new BcryptPasswordHasher(),
        tokenProvider: new AuthTokenService(dependencies.authConfig.accessTokenSecret),
        transactionRunner: { run: withTransaction },
        clock: { now: () => new Date() },
    })
    const conversationRepository = new MongooseConversationRepository()
    const conversationService = new ConversationService({
        repository: conversationRepository,
        transactionRunner: { run: withTransaction },
        avatarStorage: new R2GroupAvatarStorage(),
        avatarCleanupFailureRecorder: new LoggerGroupAvatarCleanupFailureRecorder(dependencies.logger),
    })
    const membershipService = new MembershipService({
        repository: new MongooseMembershipRepository(),
        transactionRunner: { run: withTransaction },
        clock: { now: () => new Date() },
    })
    const invitationRepository = new MongooseInvitationRepository()
    const invitationService = new InvitationService({
        repository: invitationRepository,
        transactionRunner: { run: withTransaction },
        clientOrigin: dependencies.authConfig.clientOrigin,
        membershipService,
        groupReader: conversationRepository,
        clock: { now: () => new Date() },
    })
    const conversationLifecycleService = new ConversationLifecycleService({
        repository: new MongooseConversationLifecycleRepository(),
        groupReader: conversationRepository,
        invitationRevoker: invitationRepository,
        transactionRunner: { run: withTransaction },
        clock: { now: () => new Date() },
    })
    const authController = new AuthController(authService, dependencies.authConfig.refreshCookie)
    const profileService = new ProfileService({
        repository: new MongooseProfileRepository(),
        imageStorage: new R2ProfileImageStorage(),
        cleanupFailureRecorder: new LoggerProfileImageCleanupFailureRecorder(dependencies.logger),
    })
    const profileController = new ProfileController(profileService)
    const membershipController = new MembershipController(membershipService)
    const conversationController = new ConversationController(conversationService)
    const conversationLifecycleController = new ConversationLifecycleController(conversationLifecycleService)
    const invitationController = new InvitationController(invitationService)
    const app = express()
    app.use(withRequestContext)
    app.use(cors({ origin: dependencies.authConfig.clientOrigin, credentials: true }))
    app.use(express.json())
    app.use(cookieParser())
    app.use(dependencies.publicRoutes)
    app.use(API_ROUTES.AUTH, createAuthRouter(authController))
    app.use(API_ROUTES.INVITATIONS, createInvitationPreviewRouter(invitationController))
    app.use(createAuthenticate(dependencies.authConfig.accessTokenSecret))
    app.use(API_ROUTES.INVITATIONS, createInvitationAcceptRouter(invitationController))
    app.use(API_ROUTES.CONVERSATIONS, createConversationLifecycleRouter(conversationLifecycleController))
    app.use(dependencies.privateRoutes)
    app.use(API_ROUTES.USERS, createProfileRouter(profileController))
    app.use(API_ROUTES.CONVERSATIONS, createMembershipRouter(membershipController))
    app.use(API_ROUTES.CONVERSATIONS, createConversationRouter(conversationController))
    app.use(API_ROUTES.CONVERSATIONS, createInvitationRouter(invitationController))
    app.use(() => {
        throw new BusinessException(ERROR_CODES.NOT_FOUND, 404, "Route not found")
    })
    app.use(createGlobalErrorHandler(dependencies.logger))
    return app
}
