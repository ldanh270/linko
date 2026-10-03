import type { EntityId } from "./envelope"

/** Safe account details returned by authenticated account endpoints. */
export interface UserDto {
    id: EntityId
    username: string
    displayName: string
    email: string
}

/** Access token returned in the JSON body while refresh credentials stay in an HttpOnly cookie. */
export interface AuthAccessTokenDto {
    accessToken: string
}

/** Validated account creation input shared by the API and frontend adapter. */
export interface SignupInput {
    username: string
    password: string
    email: string
    displayName: string
}

/** Validated password authentication input shared by the API and frontend adapter. */
export interface LoginInput {
    username: string
    password: string
}
