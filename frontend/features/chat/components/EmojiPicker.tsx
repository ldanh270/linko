"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

export interface EmojiItem {
  readonly char: string
  readonly name: string
  readonly keywords: readonly string[]
}

export const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    label: "😀 Cảm xúc",
    emojis: [
      { char: "😀", name: "cười tươi", keywords: ["smile", "happy", "cuoi", "vui"] },
      { char: "😃", name: "cười rạng rỡ", keywords: ["smile", "happy", "cuoi"] },
      { char: "😄", name: "cười tít mắt", keywords: ["smile", "laugh", "cuoi"] },
      { char: "😁", name: "cười toe toét", keywords: ["grin", "cuoi"] },
      { char: "😆", name: "cười ngặt nghẽo", keywords: ["laugh", "cuoi"] },
      { char: "😅", name: "cười trừ toát mồ hôi", keywords: ["sweat", "cuoi"] },
      { char: "🤣", name: "cười lăn lộn", keywords: ["rofl", "cuoi", "hai"] },
      { char: "😂", name: "cười ra nước mắt", keywords: ["joy", "laugh", "cuoi", "hai"] },
      { char: "🙂", name: "cười mỉm", keywords: ["smile", "nhe"] },
      { char: "🙃", name: "mặt ngược", keywords: ["upside", "nguoc"] },
      { char: "😉", name: "nháy mắt", keywords: ["wink", "nhay"] },
      { char: "😊", name: "mỉm cười hạnh phúc", keywords: ["blush", "vui"] },
      { char: "😇", name: "thiên thần", keywords: ["angel", "hien"] },
      { char: "🥰", name: "mặt yêu thương", keywords: ["love", "yeu", "thuong"] },
      { char: "😍", name: "mắt trái tim", keywords: ["heart", "love", "yeu"] },
      { char: "🤩", name: "mắt sao hào hứng", keywords: ["star", "thich"] },
      { char: "😘", name: "thổi nụ hôn", keywords: ["kiss", "hon"] },
      { char: "😗", name: "chu môi", keywords: ["kiss"] },
      { char: "😋", name: "ngon miệng", keywords: ["yum", "ngon"] },
      { char: "😛", name: "thè lưỡi", keywords: ["tongue", "le"] },
      { char: "😜", name: "thè lưỡi nháy mắt", keywords: ["playful", "nghich"] },
      { char: "🤪", name: "ngộ nghĩnh", keywords: ["crazy", "ngao"] },
      { char: "😝", name: "thè lưỡi nhắm mắt", keywords: ["tongue"] },
      { char: "🤑", name: "mắt tiền", keywords: ["money", "tien", "giau"] },
      { char: "🤗", name: "ôm", keywords: ["hug", "om"] },
      { char: "🤭", name: "bịt miệng cười", keywords: ["giggle", "cuoi"] },
      { char: "🤫", name: "suỵt im lặng", keywords: ["shh", "im"] },
      { char: "🤔", name: "suy ngẫm", keywords: ["think", "nghi"] },
      { char: "🤐", name: "khóa miệng", keywords: ["zipper", "im"] },
      { char: "🤨", name: "nhướng mày ngờ vực", keywords: ["skeptical", "nghi"] },
      { char: "😐", name: "mặt đơ", keywords: ["neutral", "do"] },
      { char: "😑", name: "bất lực", keywords: ["expressionless", "chan"] },
      { char: "😏", name: "cười khẩy", keywords: ["smirk", "deu"] },
      { char: "😒", name: "khó chịu", keywords: ["unamused", "chan"] },
      { char: "🙄", name: "đảo mắt", keywords: ["eyes", "roll"] },
      { char: "😬", name: "gượng gạo", keywords: ["grimace", "nguong"] },
      { char: "🤥", name: "nói dối mũi dài", keywords: ["lie", "bocphet"] },
      { char: "😌", name: "thanh thản", keywords: ["relieved", "nhe"] },
      { char: "😔", name: "trầm ngâm buồn", keywords: ["sad", "buon"] },
      { char: "😪", name: "buồn ngủ", keywords: ["sleepy", "ngu"] },
      { char: "🤤", name: "thèm thuồng", keywords: ["drool", "them"] },
      { char: "😴", name: "ngủ say", keywords: ["sleeping", "ngu"] },
      { char: "😷", name: "khẩu trang", keywords: ["mask", "om"] },
      { char: "🤒", name: "kẹp nhiệt độ", keywords: ["sick", "sot"] },
      { char: "🤕", name: "băng đầu", keywords: ["hurt", "dau"] },
      { char: "🤢", name: "buồn nôn", keywords: ["nausea", "kinh"] },
      { char: "🤮", name: "nôn mửa", keywords: ["vomit"] },
      { char: "🥵", name: "nóng bừng", keywords: ["hot", "nong"] },
      { char: "🥶", name: "lạnh buốt", keywords: ["cold", "lanh"] },
      { char: "😵", name: "chóng mặt hoa mắt", keywords: ["dizzy", "choang"] },
      { char: "🤯", name: "nổ tung đầu", keywords: ["mindblown", "soc"] },
      { char: "🥳", name: "tiệc tùng ăn mừng", keywords: ["party", "tiec", "mung"] },
      { char: "😎", name: "ngầu kính râm", keywords: ["cool", "ngau"] },
      { char: "🤓", name: "mọt sách", keywords: ["nerd", "tri"] },
      { char: "🧐", name: "soi xét kính lúp", keywords: ["monocle", "soi"] },
      { char: "😕", name: "hoang mang", keywords: ["confused", "lo"] },
      { char: "🥺", name: "mắt long lanh năn nỉ", keywords: ["pleading", "xin", "nan"] },
      { char: "😢", name: "khóc một giọt lệ", keywords: ["cry", "khoc"] },
      { char: "😭", name: "khóc to oà", keywords: ["sob", "khoc", "buon"] },
      { char: "😱", name: "hét lên kinh hãi", keywords: ["scream", "so"] },
      { char: "😤", name: "bực bội thở phì", keywords: ["triumph", "cay"] },
      { char: "😡", name: "giận dữ đỏ mặt", keywords: ["angry", "gian", "tuc"] },
    ],
  },
  {
    id: "gestures",
    label: "👍 Cử chỉ & Tim",
    emojis: [
      { char: "👍", name: "thích like", keywords: ["thumbsup", "like", "duyet", "ok"] },
      { char: "👎", name: "không thích dislike", keywords: ["thumbsdown", "dislike", "che"] },
      { char: "👏", name: "vỗ tay hoan hô", keywords: ["clap", "votay", "hay"] },
      { char: "🙌", name: "giơ tay ăn mừng", keywords: ["celebrate", "chuc"] },
      { char: "👐", name: "mở lòng bàn tay", keywords: ["open"] },
      { char: "🤲", name: "chắp tay đón nhận", keywords: ["palms"] },
      { char: "🤝", name: "bắt tay hợp tác", keywords: ["handshake", "dongy"] },
      { char: "🙏", name: "cảm ơn chắp tay", keywords: ["pray", "thanks", "camon"] },
      { char: "✌️", name: "chiến thắng v", keywords: ["peace", "victory", "thang"] },
      { char: "🤞", name: "chúc may mắn chéo ngón", keywords: ["luck", "cau"] },
      { char: "🤟", name: "yêu bạn ngón tay", keywords: ["love", "yeu"] },
      { char: "🤘", name: "rock cá tính", keywords: ["rock"] },
      { char: "🤙", name: "gọi nhé shaka", keywords: ["call", "alo"] },
      { char: "👈", name: "chỉ sang trái", keywords: ["point", "left"] },
      { char: "👉", name: "chỉ sang phải", keywords: ["point", "right"] },
      { char: "👆", name: "chỉ lên trên", keywords: ["point", "up"] },
      { char: "👇", name: "chỉ xuống dưới", keywords: ["point", "down"] },
      { char: "☝️", name: "giơ một ngón", keywords: ["one"] },
      { char: "👋", name: "vẫy tay chào", keywords: ["wave", "bye", "chao"] },
      { char: "💪", name: "bắp tay khỏe", keywords: ["muscle", "khoe", "gang"] },
      { char: "❤️", name: "trái tim đỏ", keywords: ["heart", "love", "tim", "yeu"] },
      { char: "🧡", name: "trái tim cam", keywords: ["heart", "orange", "tim"] },
      { char: "💛", name: "trái tim vàng", keywords: ["heart", "yellow", "tim"] },
      { char: "💚", name: "trái tim xanh lá", keywords: ["heart", "green", "tim"] },
      { char: "💙", name: "trái tim xanh biển", keywords: ["heart", "blue", "tim"] },
      { char: "💜", name: "trái tim tím", keywords: ["heart", "purple", "tim"] },
      { char: "🖤", name: "trái tim đen", keywords: ["heart", "black", "tim"] },
      { char: "🤍", name: "trái tim trắng", keywords: ["heart", "white", "tim"] },
      { char: "🤎", name: "trái tim nâu", keywords: ["heart", "brown", "tim"] },
      { char: "💔", name: "tim vỡ đau lòng", keywords: ["broken", "dau", "vo"] },
      { char: "❣️", name: "chấm than trái tim", keywords: ["heart", "exclamation"] },
      { char: "💕", name: "hai trái tim", keywords: ["hearts", "love"] },
      { char: "💖", name: "trái tim lấp lánh", keywords: ["sparkle", "love"] },
      { char: "💗", name: "trái tim lớn dần", keywords: ["growing", "love"] },
      { char: "🔥", name: "ngọn lửa cháy", keywords: ["fire", "chay", "hot", "dinh"] },
      { char: "💯", name: "một trăm điểm", keywords: ["100", "score", "tuyetdoi"] },
      { char: "✨", name: "ngôi sao lấp lánh", keywords: ["sparkles", "sao", "sang"] },
      { char: "⭐", name: "ngôi sao", keywords: ["star", "sao"] },
    ],
  },
  {
    id: "objects",
    label: "🎉 Hoạt động & Vật phẩm",
    emojis: [
      { char: "🎉", name: "pháo hoa ăn mừng", keywords: ["party", "tada", "chucmung"] },
      { char: "🎊", name: "bóng nổ tiệc", keywords: ["confetti", "mung"] },
      { char: "🎁", name: "hộp quà", keywords: ["gift", "present", "qua"] },
      { char: "🎂", name: "bánh sinh nhật", keywords: ["cake", "birthday", "banh"] },
      { char: "☕", name: "cà phê nóng", keywords: ["coffee", "caphe", "uong"] },
      { char: "🍵", name: "tách trà", keywords: ["tea", "tra"] },
      { char: "🍻", name: "cụng ly bia", keywords: ["cheers", "beer", "nhau", "bia"] },
      { char: "🥂", name: "nâng ly rượu vang", keywords: ["wine", "cheers"] },
      { char: "🍕", name: "pizza", keywords: ["pizza", "an"] },
      { char: "🍔", name: "hamburger", keywords: ["burger", "an"] },
      { char: "🍜", name: "bát mì phở", keywords: ["ramen", "pho", "mi"] },
      { char: "📱", name: "điện thoại", keywords: ["phone", "dienthoai"] },
      { char: "💻", name: "máy tính xách tay", keywords: ["laptop", "computer"] },
      { char: "💡", name: "bóng đèn ý tưởng", keywords: ["idea", "bulb", "y kien"] },
      { char: "🚀", name: "tên lửa cất cánh", keywords: ["rocket", "tenlua", "bay"] },
      { char: "🏆", name: "cúp vô địch", keywords: ["trophy", "cup", "nhat"] },
    ],
  },
] as const

export interface EmojiPickerProps {
  readonly onSelect: (emoji: string) => void
  readonly onClose: () => void
}

/** Render accessible, interactive emoji picker popover with search and categories. UI only. */
export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState<string>("smileys")
  const [search, setSearch] = useState("")
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus search input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Filter emojis based on search keyword
  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      const category = EMOJI_CATEGORIES.find((c) => c.id === activeTab)
      return category ? category.emojis : []
    }
    const allEmojis: EmojiItem[] = []
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.name.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        ) {
          allEmojis.push(item)
        }
      }
    }
    return allEmojis
  }, [search, activeTab])

  return (
    <div
      ref={popoverRef}
      className="emoji-picker-popover"
      role="dialog"
      aria-label="Chọn biểu tượng cảm xúc"
    >
      {/* Search Header */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-subtle)]/50">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm biểu tượng..."
            className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
            >
              <Icon name={ICON_NAMES.CLOSE} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (only when not searching) */}
      {!search && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)] text-xs overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`rounded-lg px-2.5 py-1 font-medium transition shrink-0 ${
                activeTab === cat.id
                  ? "bg-[var(--brand-soft)] text-[var(--brand)] font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="flex-1 overflow-y-auto p-3 max-h-64 grid grid-cols-7 gap-1">
        {filteredEmojis.length === 0 ? (
          <p className="col-span-7 text-center text-xs text-[var(--text-secondary)] py-6">
            Không tìm thấy biểu tượng phù hợp
          </p>
        ) : (
          filteredEmojis.map((emoji) => (
            <button
              key={`${emoji.char}-${emoji.name}`}
              type="button"
              onClick={() => {
                onSelect(emoji.char)
                onClose()
              }}
              title={emoji.name}
              aria-label={emoji.name}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-[var(--brand-soft)]/60 transition active:scale-95"
            >
              {emoji.char}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
