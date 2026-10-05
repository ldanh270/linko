import Conversation from "#/models/Conversation"
import FriendRequest from "#/models/FriendRequest"
import Friendship from "#/models/Friendship"
import Message from "#/models/Message"
import Session from "#/models/Session"
import User from "#/models/User"

/** MongoDB collections owned by the Linko application and local database commands. */
export const LINKO_COLLECTIONS = [
    User.collection.name,
    Session.collection.name,
    Friendship.collection.name,
    FriendRequest.collection.name,
    Conversation.collection.name,
    Message.collection.name,
] as const
