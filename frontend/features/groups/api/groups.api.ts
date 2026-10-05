import {
    API_ROUTES,
    CONVERSATION_KIND,
    CONVERSATION_PARAMS,
    CONVERSATION_ROUTE_PATHS,
    GROUP_FIELDS,
    type CreateGroupRequest,
    type GroupDto,
    type InboxItemDto,
    type UpdateGroupRequest,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"
import { listInbox } from "@/features/inbox/api/inbox.api"

/** Group creation fields accepted by the browser adapter. */
export interface CreateGroupInput extends CreateGroupRequest {
    readonly avatar?: File
}

/** Group update fields accepted by the browser adapter. */
export interface UpdateGroupInput extends UpdateGroupRequest {
    readonly id: string
    readonly avatar?: File
}

const CONVERSATION_ENDPOINT = API_ROUTES.CONVERSATIONS

/** Find one accessible group through cursor pages without relying on its inbox position. */
export async function findGroupInInbox(conversationId: string): Promise<InboxItemDto | undefined> {
    let cursor: string | undefined
    do {
        const page = await listInbox({ kind: CONVERSATION_KIND.GROUP, ...(cursor ? { cursor } : {}) })
        const match = page.items.find((item) => item.id === conversationId)
        if (match) return match
        const nextCursor = page.nextCursor ?? undefined
        if (nextCursor === cursor) return undefined
        cursor = nextCursor
    } while (cursor)
    return undefined
}

/** Create a private group, using multipart transport only when an avatar is present. */
export function createGroup(input: CreateGroupInput): Promise<GroupDto> {
    return authenticatedApiClient.request({
        path: CONVERSATION_ENDPOINT,
        method: "POST",
        body: createGroupBody(input),
    })
}

/** Update group metadata or its public avatar and return the safe group DTO. */
export function updateGroup(input: UpdateGroupInput): Promise<GroupDto> {
    const path = CONVERSATION_ROUTE_PATHS.BY_ID.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        input.id,
    )
    const body = input.avatar
        ? createGroupFormData(input)
        : updateRequestBody(input)
    return authenticatedApiClient.request({
        path: `${CONVERSATION_ENDPOINT}${path}`,
        method: "PATCH",
        body,
    })
}

function createGroupBody(input: CreateGroupInput): CreateGroupRequest | FormData {
    if (input.avatar) return createGroupFormData(input)
    return {
        [GROUP_FIELDS.NAME]: input.name,
        ...(input.description !== undefined ? { [GROUP_FIELDS.DESCRIPTION]: input.description } : {}),
    }
}

function updateRequestBody(input: UpdateGroupInput): UpdateGroupRequest {
    return {
        ...(input.name !== undefined ? { [GROUP_FIELDS.NAME]: input.name } : {}),
        ...(input.description !== undefined ? { [GROUP_FIELDS.DESCRIPTION]: input.description } : {}),
    }
}

function createGroupFormData(input: CreateGroupInput | UpdateGroupInput): FormData {
    const formData = new FormData()
    if (input.name !== undefined) formData.append(GROUP_FIELDS.NAME, input.name)
    if (input.description !== undefined) formData.append(GROUP_FIELDS.DESCRIPTION, input.description)
    if (input.avatar) formData.append(GROUP_FIELDS.AVATAR, input.avatar)
    return formData
}
