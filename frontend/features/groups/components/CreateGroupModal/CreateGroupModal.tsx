"use client"

import { Modal } from "@/shared/components/Modal/Modal"
import { Input } from "@/shared/components/Input"
import { Button } from "@/shared/components/Button"
import { Avatar } from "@/shared/components/Avatar"
import { Badge } from "@/shared/components/Badge"
import { SearchInput } from "@/shared/components/SearchInput"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useCreateGroupModal, type UseCreateGroupModalOptions } from "./useCreateGroupModal"

export interface CreateGroupModalProps {
  readonly isOpen?: boolean
  readonly onClose: () => void
}

/**
 * Render modal popup dialog for creating a group with name, optional avatar/description,
 * and direct friend checklist selection. UI only.
 */
export function CreateGroupModal({ isOpen = true, onClose }: CreateGroupModalProps) {
  const {
    name,
    setName,
    description,
    setDescription,
    avatarPreview,
    handleAvatarChange,
    removeAvatar,
    searchQuery,
    setSearchQuery,
    friendsQuery,
    friends,
    filteredFriends,
    selectedFriends,
    selectedFriendIds,
    toggleFriend,
    isSubmitting,
    error,
    handleSubmit,
    handleClose,
  } = useCreateGroupModal({ isOpen, onClose })

  if (!isOpen) return null

  return (
    <Modal title="Tạo nhóm mới" onClose={handleClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Avatar & Name Header */}
        <div className="flex items-center gap-4">
          {/* Avatar Picker */}
          <div className="relative group shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--surface-subtle)] border-2 border-dashed border-[var(--border)] flex items-center justify-center">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Xem trước ảnh nhóm"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon name={ICON_NAMES.GROUP} className="w-7 h-7 text-[var(--text-secondary)]" />
              )}
            </div>
            <label
              htmlFor="group-avatar-upload"
              className="absolute inset-0 rounded-full bg-black/45 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
              title="Chọn ảnh đại diện nhóm"
            >
              <Icon name={ICON_NAMES.EDIT} className="w-4 h-4" />
            </label>
            <input
              id="group-avatar-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarChange(e.target.files?.[0])}
              className="sr-only"
            />
            {avatarPreview && (
              <button
                type="button"
                onClick={removeAvatar}
                className="absolute -top-1 -right-1 bg-[var(--danger)] text-white rounded-full p-0.5 shadow-sm text-xs hover:opacity-90 cursor-pointer"
                title="Xóa ảnh"
              >
                <Icon name={ICON_NAMES.CLOSE} className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Group Name Field */}
          <div className="flex-1 min-w-0">
            <Input
              id="group-name"
              label="Tên nhóm"
              placeholder="Nhập tên nhóm..."
              required
              minLength={1}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        {/* Optional Description */}
        <div>
          <label
            htmlFor="group-description"
            className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
          >
            Mô tả nhóm <span className="text-[var(--text-muted)]">(không bắt buộc)</span>
          </label>
          <textarea
            id="group-description"
            placeholder="Mô tả mục đích nhóm, quy tắc thảo luận..."
            maxLength={500}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--input-surface)] p-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] transition-colors resize-none"
          />
        </div>

        {/* Friend Selection Section ("cho chọn bạn đồ vô cho dễ") */}
        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Thêm bạn bè vào nhóm
            </span>
            <Badge
              variant={selectedFriendIds.size > 0 ? "brand" : "neutral"}
              shape="pill"
              size="sm"
            >
              {selectedFriendIds.size} đã chọn
            </Badge>
          </div>

          {/* Selected Friends Chips */}
          {selectedFriends.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 mb-3 bg-[var(--surface-subtle)] rounded-lg max-h-24 overflow-y-auto">
              {selectedFriends.map((friend) => (
                <span
                  key={friend.id}
                  className="inline-flex items-center gap-1.5 bg-[var(--brand-soft)] text-[var(--brand)] text-xs font-medium pl-1.5 pr-2 py-0.5 rounded-full"
                >
                  <Avatar
                    label={friend.displayName || friend.username}
                    size="small"
                    className="w-4 h-4 text-[9px]"
                  />
                  <span className="truncate max-w-[120px]">
                    {friend.displayName || friend.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFriend(friend.id)}
                    className="text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
                    title={`Bỏ chọn ${friend.displayName || friend.username}`}
                  >
                    <Icon name={ICON_NAMES.CLOSE} className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Quick Search in modal */}
          <div className="mb-2">
            <SearchInput
              label="Tìm kiếm bạn bè"
              placeholder="Tìm bạn bè theo tên..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          {/* Friends Checklist */}
          <div className="max-h-52 overflow-y-auto border border-[var(--border)] rounded-lg divide-y divide-[var(--border-subtle)] bg-[var(--surface)]">
            {friendsQuery.isPending ? (
              <div className="p-4 space-y-2 text-center text-xs text-[var(--text-secondary)]">
                Đang tải danh sách bạn bè...
              </div>
            ) : friends.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                Bạn chưa có bạn bè nào. Bạn vẫn có thể tạo nhóm và chia sẻ liên kết mời sau!
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                Không tìm thấy bạn bè nào khớp với &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = selectedFriendIds.has(friend.id)
                const displayName = friend.displayName || friend.username
                return (
                  <label
                    key={friend.id}
                    className={`flex items-center justify-between gap-3 p-2.5 transition-colors cursor-pointer hover:bg-[var(--surface-subtle)] ${
                      isSelected ? "bg-[var(--brand-soft)]/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar label={displayName} src={friend.avatarUrl} size="small" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          @{friend.username}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFriend(friend.id)}
                      className="w-4 h-4 rounded-sm text-[var(--brand)] border-[var(--border)] focus:ring-[var(--brand)] cursor-pointer"
                    />
                  </label>
                )
              })
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs text-[var(--danger)]">
            {error}
          </p>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!name.trim() || isSubmitting}
          >
            <Icon name={ICON_NAMES.CHECK} />
            <span>Tạo nhóm</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
