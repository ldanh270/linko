/**
 * @file index.ts
 * @module @linko/contracts
 * @description Central export point for Linko's shared API contracts, data transfer objects (DTOs),
 * route definitions, error codes, and real-time event definitions.
 *
 * This package acts as the single source of truth between backend services and frontend applications.
 */

export * from "./constants";
export * from "./envelope";
export * from "./auth";
export * from "./groups";
export * from "./conversations";
export * from "./messages";
export * from "./pins";
export * from "./notifications";
export * from "./read-state";
export * from "./invitations";
export * from "./memberships";
export * from "./users";
export * from "./friends";
export * from "./realtime";
export * from "./chat-utilities";
