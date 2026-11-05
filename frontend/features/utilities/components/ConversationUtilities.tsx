"use client"
import { useUtilityPanel } from "../hooks/useUtilityPanel"
import { PollForm } from "./PollForm"
import { AppointmentForm } from "./AppointmentForm"
import { LocationForm } from "./LocationForm"
import { MessageReminderForm } from "./MessageReminderForm"
import { UtilityOverview } from "./UtilityOverview"

/** Compose dialogs for one authorized conversation. */
export interface ConversationUtilitiesProps { readonly conversationId: string; readonly conversationName: string }
/** Render the URL-selected utility dialog. UI only, logic lives in useUtilityPanel. */
export function ConversationUtilities({ conversationId, conversationName }: ConversationUtilitiesProps) {
  const state = useUtilityPanel()
  return <>
    {state.panel === "poll" && <PollForm conversationId={conversationId} onClose={state.close} />}
    {(state.panel === "appointment" || state.appointmentMessage) && <AppointmentForm conversationId={conversationId} sourceMessageId={state.appointmentMessage || undefined} onClose={state.closeAppointment} />}
    {state.panel === "location" && <LocationForm conversationId={conversationId} conversationName={conversationName} onClose={state.close} />}
    {state.panel === "overview" && <UtilityOverview conversationId={conversationId} onClose={state.close} />}
    {state.reminderMessage && <MessageReminderForm conversationId={conversationId} messageId={state.reminderMessage} onClose={state.closeReminder} />}
  </>
}
