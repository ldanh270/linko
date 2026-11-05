import { expect, test, type Page, type Route } from "@playwright/test"
import type { AppointmentDto, CreateAppointmentRequest, CreateLocationRequest, CreatePollRequest, LocationShareDto, MessageDto, PollDto, ReminderDto } from "@linko/contracts"
import { FIXTURE_IDS, fixtureMessages, installMessengerFixtures } from "./fixtures/messenger"

/** Include a cold development compilation while keeping each interaction assertion bounded. */
test.setTimeout(60000)

async function utilitiesFixture(page: Page, options: { failFirstPoll?: boolean } = {}) {
  await installMessengerFixtures(page)
  const conversationId = FIXTURE_IDS.DIRECT
  const requests: { path: string; method: string; body: unknown }[] = []
  const messages: MessageDto[] = [...fixtureMessages()]
  const polls: PollDto[] = [], appointments: AppointmentDto[] = [], locations: LocationShareDto[] = []
  const oldMessage = { ...messages[0], id: "abababababababababababab", content: "Tin ghim cũ ngoài trang đang tải" }
  const reminders: ReminderDto[] = []
  let next = 1000
  let pollAttempts = 0
  const id = () => String(next++).padStart(24, "0")
  const fulfill = (route: Route, value: unknown) => route.fulfill({ json: { success: true, data: value, meta: null, error: null } })
  const addMessage = (kind: "poll" | "appointment" | "location", resourceId: string, clientMessageId: string, content: string) => {
    const message = { ...messages[0], id: id(), senderId: FIXTURE_IDS.SELF, kind, resourceId, clientMessageId, content, createdAt: new Date().toISOString() }
    messages.push(message)
    return message.id
  }
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname, method = route.request().method()
    const body: unknown = route.request().postData() ? route.request().postDataJSON() : null
    requests.push({ path, method, body })
    if (path === `/api/messages/${conversationId}`) return fulfill(route, { items: messages, nextCursor: null })
    if (path.endsWith("/pins")) return fulfill(route, [oldMessage])
    if (path.endsWith(`/messages/${oldMessage.id}/context`)) return fulfill(route, [oldMessage])
    if (path.endsWith("/polls")) {
      if (method === "POST" && options.failFirstPoll && pollAttempts++ === 0) return route.fulfill({ status: 500, json: { success: false, error: { code: "INTERNAL", message: "Internal server error" } } })
      if (method === "POST") { const input = body as CreatePollRequest; const pollId = id(); polls.push({ id: pollId, conversationId, messageId: addMessage("poll", pollId, input.clientMessageId, input.question), creatorId: FIXTURE_IDS.SELF, createdAt: new Date().toISOString(), revision: 1, question: input.question, mode: input.mode, options: input.options.map((text) => ({ id: id(), text, count: 0, voterIds: [] })), selectedOptionIds: [], voterCount: 0, closesAt: input.closesAt ?? null, status: "active", canClose: true }); return fulfill(route, polls.at(-1)) }
      return fulfill(route, polls)
    }
    if (path.endsWith("/vote")) { const poll = polls[0]; const selected = method === "DELETE" ? [] : (body as { optionIds: string[] }).optionIds; polls[0] = { ...poll, selectedOptionIds: selected, voterCount: selected.length ? 1 : 0, options: poll.options.map((option) => ({ ...option, count: selected.includes(option.id) ? 1 : 0, voterIds: selected.includes(option.id) ? [FIXTURE_IDS.SELF] : [] })) }; return fulfill(route, polls[0]) }
    if (path.endsWith("/close")) { polls[0] = { ...polls[0], status: "closed" }; return fulfill(route, polls[0]) }
    if (path.endsWith("/appointments")) {
      if (method === "POST") { const input = body as CreateAppointmentRequest; const appointmentId = id(); appointments.push({ id: appointmentId, conversationId, messageId: addMessage("appointment", appointmentId, input.clientMessageId, input.title), creatorId: FIXTURE_IDS.SELF, createdAt: new Date().toISOString(), revision: 1, title: input.title, description: input.description ?? "", startsAt: input.startsAt, endsAt: input.endsAt ?? null, timezone: input.timezone, place: input.place ?? "", status: "active", responses: [], myResponse: "going", reminderMinutes: 15, canManage: true }); return fulfill(route, appointments.at(-1)) }
      return fulfill(route, appointments)
    }
    if (path.endsWith("/rsvp")) { const input = body as { status: AppointmentDto["myResponse"]; reminderMinutes: number }; appointments[0] = { ...appointments[0], myResponse: input.status, reminderMinutes: input.reminderMinutes }; return fulfill(route, appointments[0]) }
    if (path.endsWith("/locations")) {
      if (method === "POST") { const input = body as CreateLocationRequest; const locationId = id(); locations.push({ id: locationId, conversationId, messageId: addMessage("location", locationId, input.clientMessageId, "Vị trí trực tiếp"), creatorId: FIXTURE_IDS.SELF, createdAt: new Date().toISOString(), revision: 1, expiresAt: new Date(Date.now() + input.durationMinutes * 60000).toISOString(), endedAt: null, status: "active", position: { latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy, updatedAt: new Date().toISOString() }, canStop: true, isStale: false }); return fulfill(route, locations.at(-1)) }
      return fulfill(route, locations)
    }
    if (path.endsWith("/stop")) { locations[0] = { ...locations[0], status: "ended", position: null, endedAt: new Date().toISOString() }; return fulfill(route, locations[0]) }
    if (path.endsWith("/fix")) return fulfill(route, locations[0])
    if (path.endsWith("/messages/abababababababababababab/reminders") && method === "POST") {
      const input = body as { dueAt: string; note: string }
      const reminder: ReminderDto = { id: id(), conversationId, messageId: oldMessage.id, title: "Tin ghim cũ ngoài trang đang tải", note: input.note, dueAt: input.dueAt, deliveredAt: null, readAt: null, status: "pending", appointmentId: null }
      reminders.push(reminder); return fulfill(route, reminder)
    }
    if (path === "/api/reminders/inbox") return fulfill(route, { items: reminders, nextCursor: null, unreadCount: reminders.filter((item) => item.deliveredAt && !item.readAt).length })
    if (path === "/api/reminders/") return fulfill(route, reminders)
    if (path.startsWith("/api/reminders/") && method === "PATCH") {
      const reminder = reminders.find((item) => path.endsWith(item.id))
      if (reminder) { Object.assign(reminder, body); return fulfill(route, reminder) }
    }
    return route.fallback()
  })
  return { requests }
}

for (const width of [390, 1440]) {
  test(`chat utilities create, vote, schedule, share and stop at ${width}px`, async ({ page, context }) => {
    await context.grantPermissions(["geolocation"])
    await context.setGeolocation({ latitude: 10.776, longitude: 106.7, accuracy: 25 })
    const fixture = await utilitiesFixture(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/direct/${FIXTURE_IDS.DIRECT}`)
    await page.getByRole("button", { name: "Tin ghim cũ ngoài trang đang tải" }).click()
    await expect(page.locator('[data-message-id="abababababababababababab"]')).toContainText("Tin ghim cũ")
    await page.getByRole("button", { name: "Thêm hoạt động" }).click()
    await expect(page.getByRole("menuitem", { name: "Tạo bình chọn" })).toBeInViewport()
    await page.screenshot({ path: `test-results/utilities-menu-${width}.png` })
    await page.getByRole("menuitem", { name: "Tạo bình chọn" }).click()
    const pollDialog = page.getByRole("dialog", { name: "Tạo bình chọn", exact: true })
    await pollDialog.getByLabel("Câu hỏi", { exact: true }).fill("Cuối tuần đi đâu?")
    await pollDialog.getByLabel("Phương án 1", { exact: true }).fill("Đọc sách")
    await pollDialog.getByLabel("Phương án 2", { exact: true }).fill("Đi dạo")
    await pollDialog.getByRole("button", { name: "Đăng bình chọn" }).click()
    await expect(pollDialog).toHaveCount(0)
    const poll = page.getByRole("region", { name: "Bình chọn", exact: true })
    await expect(poll).toContainText("Cuối tuần đi đâu?")
    await poll.getByRole("radio").first().check()
    await poll.getByRole("button", { name: "Gửi lựa chọn" }).click()
    await expect(poll).toContainText("1 người bình chọn")
    await poll.screenshot({ path: `test-results/utilities-poll-${width}.png` })
    await page.getByRole("button", { name: "Thêm hoạt động" }).click()
    await page.getByRole("menuitem", { name: "Tạo lịch hẹn" }).click()
    const appointmentDialog = page.getByRole("dialog", { name: "Tạo lịch hẹn", exact: true })
    await appointmentDialog.getByLabel("Tiêu đề", { exact: true }).fill("Buổi đọc sách")
    await appointmentDialog.getByLabel("Bắt đầu", { exact: true }).fill("2028-01-06T19:30")
    await appointmentDialog.getByLabel("Múi giờ", { exact: true }).selectOption("Asia/Ho_Chi_Minh")
    await appointmentDialog.getByRole("button", { name: "Tạo lịch hẹn", exact: true }).click()
    await expect(appointmentDialog).toHaveCount(0)
    const appointment = page.getByRole("region", { name: "Lịch hẹn", exact: true })
    await expect(appointment).toContainText("Buổi đọc sách")
    await appointment.getByLabel("Phản hồi của bạn", { exact: true }).selectOption("maybe")
    await appointment.getByLabel("Nhắc riêng cho tôi", { exact: true }).selectOption("60")
    await appointment.getByRole("button", { name: "Lưu phản hồi" }).click()
    await appointment.screenshot({ path: `test-results/utilities-appointment-${width}.png` })
    expect(fixture.requests.find((request) => request.method === "POST" && request.path.endsWith("/appointments"))?.body).toMatchObject({ startsAt: "2028-01-06T12:30:00.000Z" })
    await page.getByRole("button", { name: "Thêm hoạt động" }).click()
    await page.getByRole("menuitem", { name: "Xem hoạt động" }).click()
    const overview = page.getByRole("dialog", { name: "Hoạt động trong cuộc trò chuyện", exact: true })
    await overview.getByRole("button", { name: "Sửa", exact: true }).click()
    await expect(page.getByRole("dialog", { name: "Sửa lịch hẹn", exact: true })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog", { name: "Sửa lịch hẹn", exact: true })).toHaveCount(0)
    await expect(overview).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(overview).toHaveCount(0)
    await page.getByRole("button", { name: "Thêm hoạt động" }).click()
    await page.getByRole("menuitem", { name: "Chia sẻ vị trí trực tiếp" }).click()
    const locationDialog = page.getByRole("dialog", { name: "Chia sẻ vị trí trực tiếp", exact: true })
    await expect(locationDialog.getByRole("button", { name: "Xác nhận và lấy vị trí" })).toBeDisabled()
    expect(fixture.requests.filter((request) => request.path.endsWith("/locations") && request.method === "POST")).toHaveLength(0)
    await locationDialog.getByRole("checkbox").check()
    await locationDialog.getByRole("button", { name: "Xác nhận và lấy vị trí" }).click()
    await expect(locationDialog).toHaveCount(0)
    const location = page.getByRole("region", { name: "Vị trí trực tiếp", exact: true })
    await expect(location).toContainText("Tạm ngừng cập nhật")
    await location.screenshot({ path: `test-results/utilities-location-${width}.png` })
    await location.getByRole("button", { name: "Dừng chia sẻ" }).click()
    await expect(location).toContainText("Đã kết thúc chia sẻ")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole("button", { name: "Nhắc lịch của tôi", exact: true }).filter({ visible: true }).click()
    await expect(page.getByRole("dialog", { name: "Nhắc lịch của tôi" })).toContainText("Chưa có lời nhắc")
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })
}

test("failed creation preserves the poll draft and retries the same command", async ({ page }) => {
  const fixture = await utilitiesFixture(page, { failFirstPoll: true })
  await page.goto(`/direct/${FIXTURE_IDS.DIRECT}`)
  await page.getByRole("button", { name: "Thêm hoạt động" }).click()
  await page.getByRole("menuitem", { name: "Tạo bình chọn" }).click()
  const dialog = page.getByRole("dialog", { name: "Tạo bình chọn", exact: true })
  await dialog.getByLabel("Câu hỏi", { exact: true }).fill("Bản nháp được giữ")
  await dialog.getByLabel("Phương án 1", { exact: true }).fill("Có")
  await dialog.getByLabel("Phương án 2", { exact: true }).fill("Không")
  await dialog.getByRole("button", { name: "Đăng bình chọn" }).click()
  await expect(dialog.getByRole("alert")).toContainText("Chưa tạo được")
  await expect(dialog.getByLabel("Câu hỏi", { exact: true })).toHaveValue("Bản nháp được giữ")
  await dialog.getByRole("button", { name: "Đăng bình chọn" }).click()
  await expect(dialog).toHaveCount(0)
  const commands = fixture.requests.filter((request) => request.method === "POST" && request.path.endsWith("/polls"))
  expect(commands).toHaveLength(2)
  expect((commands[0].body as CreatePollRequest).clientMessageId).toBe((commands[1].body as CreatePollRequest).clientMessageId)
})

test("a pending private reminder is editable without closing its inbox", async ({ page }) => {
  await utilitiesFixture(page)
  await page.goto(`/direct/${FIXTURE_IDS.DIRECT}`)
  await page.getByRole("button", { name: "Tin ghim cũ ngoài trang đang tải" }).click()
  const source = page.locator('[data-message-id="abababababababababababab"]')
  await source.getByRole("button", { name: "Tùy chọn tin nhắn" }).click()
  await page.getByRole("menuitem", { name: "Nhắc tôi", exact: true }).click()
  const form = page.getByRole("dialog", { name: "Nhắc riêng cho tôi", exact: true })
  await form.getByLabel("Nhắc lúc (giờ trên thiết bị)", { exact: true }).fill("2028-01-06T19:30")
  await form.getByLabel("Ghi chú riêng (tùy chọn)", { exact: true }).fill("Nhớ đọc tài liệu")
  await form.getByRole("button", { name: "Tạo lời nhắc" }).click()
  await expect(form).toHaveCount(0)
  await page.getByRole("button", { name: "Nhắc lịch của tôi", exact: true }).filter({ visible: true }).click()
  const inbox = page.getByRole("dialog", { name: "Nhắc lịch của tôi", exact: true })
  await inbox.getByRole("button", { name: "Sửa lời nhắc", exact: true }).click()
  const edit = page.getByRole("dialog", { name: "Sửa lời nhắc", exact: true })
  await expect(edit.getByLabel("Ghi chú riêng (tùy chọn)", { exact: true })).toHaveValue("Nhớ đọc tài liệu")
  await edit.getByLabel("Ghi chú riêng (tùy chọn)", { exact: true }).fill("Đọc chương 2")
  await edit.getByRole("button", { name: "Lưu lời nhắc" }).click()
  await expect(edit).toHaveCount(0)
  await expect(inbox).toBeVisible()
  await expect(inbox).toContainText("Đọc chương 2")
})
