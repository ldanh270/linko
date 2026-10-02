import "dotenv/config"

import User from "#/models/User"
import Friendship from "#/models/Friendship"
import FriendRequest from "#/models/FriendRequest"
import Conversation from "#/models/Conversation"
import Message from "#/models/Message"

import bcrypt from "bcrypt"
import mongoose, { Types } from "mongoose"
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"

const DEMO_PASSWORD = "LinkoDemo123!"
const BCRYPT_ROUNDS = 10

const id = (value: string) => new Types.ObjectId(value)

const ids = {
    users: {
        an: id("000000000000000000000001"),
        binh: id("000000000000000000000002"),
        chi: id("000000000000000000000003"),
        duong: id("000000000000000000000004"),
    },
    friendships: {
        anBinh: id("000000000000000000000011"),
        binhChi: id("000000000000000000000012"),
        chiDuong: id("000000000000000000000013"),
    },
    friendRequest: id("000000000000000000000021"),
    conversations: {
        direct: id("000000000000000000000031"),
        group: id("000000000000000000000032"),
    },
    messages: {
        direct1: id("000000000000000000000041"),
        direct2: id("000000000000000000000042"),
        direct3: id("000000000000000000000043"),
        group1: id("000000000000000000000044"),
        group2: id("000000000000000000000045"),
        group3: id("000000000000000000000046"),
        group4: id("000000000000000000000047"),
    },
}

type InsertOnlyDocument = { _id: Types.ObjectId }

const insertOnlyOperations = <T extends InsertOnlyDocument>(documents: T[]) =>
    documents.map((document) => ({
        updateOne: {
            filter: { _id: document._id },
            update: { $setOnInsert: document },
            upsert: true,
        },
    }))

const sortIds = (first: Types.ObjectId, second: Types.ObjectId) =>
    first.toString() < second.toString() ? [first, second] : [second, first]

const participant = (userId: Types.ObjectId, role: "DIRECT" | "OWNER" | "MEMBER", at: Date) => ({
    userId,
    role,
    isArchived: false,
    mutedUntil: null,
    clearedHistoryAt: at,
    joinedAt: at,
})

const confirmDatabaseName = async (databaseName: string): Promise<boolean> => {
    const rl = createInterface({ input: stdin, output: stdout })
    const abort = new AbortController()
    const onEnd = () => abort.abort()

    stdin.once("end", onEnd)

    if (stdin.readableEnded) abort.abort()

    try {
        const answer = await rl.question(
            `Type database name "${databaseName}" to seed demo data: `,
            { signal: abort.signal },
        )

        return answer.trim() === databaseName
    } catch (error) {
        if (abort.signal.aborted) return false
        throw error
    } finally {
        stdin.off("end", onEnd)
        rl.close()
    }
}

const seedDemoData = async (): Promise<{
    users: number
    friendships: number
    friendRequests: number
    conversations: number
    messages: number
}> => {
    const now = new Date()
    const createdAt = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60 * 1000)
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS)

    const users = [
        {
            _id: ids.users.an,
            username: "demo_an",
            hashedPassword: passwordHash,
            displayName: "An Nguyễn",
            email: "demo.an@example.test",
            bio: "Thích cà phê và những chuyến đi ngắn.",
            lastActive: now,
            createdAt: createdAt(60 * 24 * 7),
            updatedAt: now,
        },
        {
            _id: ids.users.binh,
            username: "demo_binh",
            hashedPassword: passwordHash,
            displayName: "Bình Trần",
            email: "demo.binh@example.test",
            bio: "Đang nghe nhạc và tìm quán ăn ngon.",
            lastActive: createdAt(4),
            createdAt: createdAt(60 * 24 * 6),
            updatedAt: now,
        },
        {
            _id: ids.users.chi,
            username: "demo_chi",
            hashedPassword: passwordHash,
            displayName: "Chi Lê",
            email: "demo.chi@example.test",
            bio: "Chụp ảnh, đọc sách, uống trà.",
            lastActive: createdAt(12),
            createdAt: createdAt(60 * 24 * 5),
            updatedAt: now,
        },
        {
            _id: ids.users.duong,
            username: "demo_duong",
            hashedPassword: passwordHash,
            displayName: "Dương Phạm",
            email: "demo.duong@example.test",
            bio: "Mới tham gia Linko, xin chào mọi người!",
            lastActive: createdAt(45),
            createdAt: createdAt(60 * 24 * 4),
            updatedAt: now,
        },
    ]

    const [an, binh, chi, duong] = [
        ids.users.an,
        ids.users.binh,
        ids.users.chi,
        ids.users.duong,
    ]

    const [anBinh, binhChi, chiDuong] = [
        sortIds(an, binh),
        sortIds(binh, chi),
        sortIds(chi, duong),
    ]

    const friendships = [
        {
            _id: ids.friendships.anBinh,
            userA: anBinh[0],
            userB: anBinh[1],
        },
        {
            _id: ids.friendships.binhChi,
            userA: binhChi[0],
            userB: binhChi[1],
        },
        {
            _id: ids.friendships.chiDuong,
            userA: chiDuong[0],
            userB: chiDuong[1],
        },
    ].map((friendship) => ({ ...friendship, createdAt: createdAt(60 * 24 * 3), updatedAt: now }))

    const friendRequests = [
        {
            _id: ids.friendRequest,
            from: duong,
            to: an,
            message: "Chào An, mình mới dùng Linko. Kết bạn nhé!",
            createdAt: createdAt(25),
            updatedAt: now,
        },
    ]

    const messages = [
        {
            _id: ids.messages.direct1,
            conversationId: ids.conversations.direct,
            senderId: an,
            content: "Cuối tuần này mọi người đi cà phê nhé?",
            createdAt: createdAt(90),
            updatedAt: createdAt(90),
        },
        {
            _id: ids.messages.direct2,
            conversationId: ids.conversations.direct,
            senderId: binh,
            content: "Được đó, mình biết một quán mới ở gần hồ.",
            createdAt: createdAt(80),
            updatedAt: createdAt(80),
        },
        {
            _id: ids.messages.direct3,
            conversationId: ids.conversations.direct,
            senderId: an,
            content: "Gửi địa chỉ cho mình nhé!",
            createdAt: createdAt(72),
            updatedAt: createdAt(72),
        },
        {
            _id: ids.messages.group1,
            conversationId: ids.conversations.group,
            senderId: chi,
            content: "Mình tạo nhóm để lên lịch cho chuyến đi nha.",
            createdAt: createdAt(55),
            updatedAt: createdAt(55),
        },
        {
            _id: ids.messages.group2,
            conversationId: ids.conversations.group,
            senderId: an,
            content: "Hay đó! Mình rảnh sáng thứ bảy.",
            createdAt: createdAt(48),
            updatedAt: createdAt(48),
        },
        {
            _id: ids.messages.group3,
            conversationId: ids.conversations.group,
            senderId: binh,
            content: "Mình cũng đi được. Để mình xem đường nhé.",
            createdAt: createdAt(36),
            updatedAt: createdAt(36),
        },
        {
            _id: ids.messages.group4,
            conversationId: ids.conversations.group,
            senderId: chi,
            content: "Chốt thứ bảy, mình gửi lịch trình sau!",
            createdAt: createdAt(30),
            updatedAt: createdAt(30),
        },
    ]

    const directParticipants = [
        participant(an, "DIRECT", createdAt(95)),
        participant(binh, "DIRECT", createdAt(95)),
    ].sort((first, second) => first.userId.toString().localeCompare(second.userId.toString()))

    const groupParticipants = [
        participant(an, "OWNER", createdAt(60)),
        participant(binh, "MEMBER", createdAt(60)),
        participant(chi, "MEMBER", createdAt(60)),
    ].sort((first, second) => first.userId.toString().localeCompare(second.userId.toString()))

    const conversations = [
        {
            _id: ids.conversations.direct,
            conversationType: "DIRECT" as const,
            participants: directParticipants,
            lastMessage: {
                messageId: ids.messages.direct3,
                senderId: an,
                content: "Gửi địa chỉ cho mình nhé!",
                createdAt: createdAt(72),
            },
            unreadCount: { [an.toString()]: 0, [binh.toString()]: 0 },
            seenBy: [an, binh],
            createdAt: createdAt(95),
            updatedAt: createdAt(72),
        },
        {
            _id: ids.conversations.group,
            conversationType: "GROUP" as const,
            group: {
                name: "Kế hoạch cuối tuần",
                ownerId: an,
                description: "Cùng lên lịch cho một buổi đi chơi thật vui.",
            },
            participants: groupParticipants,
            lastMessage: {
                messageId: ids.messages.group4,
                senderId: chi,
                content: "Chốt thứ bảy, mình gửi lịch trình sau!",
                createdAt: createdAt(30),
            },
            unreadCount: { [an.toString()]: 0, [binh.toString()]: 1, [chi.toString()]: 0 },
            seenBy: [an, chi],
            createdAt: createdAt(60),
            updatedAt: createdAt(30),
        },
    ]

    const writeOptions = { timestamps: false }
    const userResult = await User.bulkWrite(insertOnlyOperations(users), writeOptions)
    const friendshipResult = await Friendship.bulkWrite(
        insertOnlyOperations(friendships),
        writeOptions,
    )
    const friendRequestResult = await FriendRequest.bulkWrite(
        insertOnlyOperations(friendRequests),
        writeOptions,
    )
    const messageResult = await Message.bulkWrite(insertOnlyOperations(messages), writeOptions)
    const conversationResult = await Conversation.bulkWrite(
        insertOnlyOperations(conversations),
        writeOptions,
    )

    return {
        users: userResult.upsertedCount,
        friendships: friendshipResult.upsertedCount,
        friendRequests: friendRequestResult.upsertedCount,
        conversations: conversationResult.upsertedCount,
        messages: messageResult.upsertedCount,
    }
}

const main = async () => {
    if (process.env.NODE_ENV === "production") {
        throw new Error("The demo seeder cannot run when NODE_ENV=production.")
    }

    const connectionString = process.env.MONGODB_CONNECTION_STRING
    if (!connectionString?.trim()) {
        throw new Error("Missing MONGODB_CONNECTION_STRING in the backend .env file.")
    }

    try {
        // Prevent Mongoose from creating collections or indexes before confirmation.
        await mongoose.connect(connectionString, { autoCreate: false, autoIndex: false })

        const databaseName = mongoose.connection.name
        if (!databaseName) throw new Error("Could not determine the connected database name.")

        console.log(`Connected to database: ${databaseName}`)

        if (!(await confirmDatabaseName(databaseName))) {
            console.log("Seed cancelled. No records were changed.")
            return
        }

        const counts = await seedDemoData()
        console.log("Demo data ready:", counts)
        console.log(`Initial login for new demo accounts: ${DEMO_PASSWORD}`)
    } finally {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
    }
}

void main().catch((error: unknown) => {
    console.error("Demo seeder failed:", error)
    process.exitCode = 1
})
