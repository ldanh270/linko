"use client"
import { POLL_MODE, UTILITY_LIMITS } from "@linko/contracts"
import { Modal } from "@/shared/components/Modal/Modal"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { usePollForm } from "../hooks/usePollForm"
import { UTILITY_FIELD_CLASS } from "../utility.constants"

/** Poll creation context. */
export interface PollFormProps { readonly conversationId: string; readonly onClose: () => void }
/** Render a named poll composer. UI only, logic lives in usePollForm. */
export function PollForm({ conversationId, onClose }: PollFormProps) {
  const state = usePollForm(conversationId, onClose)
  return <Modal title="Tạo bình chọn" onClose={onClose}><form onSubmit={state.submit} className="grid gap-4">
    <Input id="poll-question" label="Câu hỏi" maxLength={UTILITY_LIMITS.QUESTION} error={state.formState.errors.question?.message} {...state.register("question")} />
    <fieldset className="grid gap-3"><legend className="text-sm font-medium mb-2">Phương án</legend>
      {state.fields.map((field, index) => <div key={field.id} className="flex items-end gap-2"><div className="flex-1 min-w-0"><Input id={`poll-option-${field.id}`} label={`Phương án ${index + 1}`} error={state.formState.errors.options?.[index]?.text?.message} {...state.register(`options.${index}.text`)} /></div><Button variant="ghost" onClick={() => state.remove(index)} disabled={state.fields.length <= UTILITY_LIMITS.MIN_OPTIONS} aria-label={`Xóa phương án ${index + 1}`}>Xóa</Button></div>)}
      <Button variant="secondary" onClick={state.add} disabled={state.fields.length >= UTILITY_LIMITS.MAX_OPTIONS}>Thêm phương án</Button>
      {state.formState.errors.options?.root?.message && <p role="alert" className="text-danger text-sm">{state.formState.errors.options.root.message}</p>}
    </fieldset>
    <label className="grid gap-1 text-sm">Cách chọn<select className={UTILITY_FIELD_CLASS} {...state.register("mode")}><option value={POLL_MODE.SINGLE}>Chọn một phương án</option><option value={POLL_MODE.MULTIPLE}>Chọn nhiều phương án</option></select></label>
    <Input id="poll-deadline" label="Đóng bình chọn lúc (tùy chọn, giờ trên thiết bị)" type="datetime-local" {...state.register("closesAt")} />
    <p className="text-xs text-text-secondary">Bình chọn công khai trong cuộc trò chuyện: thành viên có thể xem ai đã chọn từng phương án.</p>
    {state.isError && <p role="alert" className="text-sm text-danger">Chưa tạo được. Kiểm tra thời hạn và thử lại; nội dung vẫn được giữ.</p>}
    <Button type="submit" isLoading={state.isPending}>Đăng bình chọn</Button>
  </form></Modal>
}
