"use client"
import { z } from "zod"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { APPOINTMENT_SOURCE_PARAM, UTILITY_UI } from "../utility.constants"

const panelSchema = z.enum(["", "poll", "appointment", "location", "reminders", "overview"])
/** Keep the selected utility panel in the URL for Back and Refresh restoration. */
export function useUtilityPanel() {
  const panel = useQueryParamState(UTILITY_UI.PANEL, panelSchema, "")
  const reminder = useQueryParamState("reminderMessage", z.string().regex(/^[a-f\d]{24}$/i).or(z.literal("")), "")
  const appointment = useQueryParamState(APPOINTMENT_SOURCE_PARAM, z.string().regex(/^[a-f\d]{24}$/i).or(z.literal("")), "")
  return { panel: panel.value, open: panel.setValue, close: () => panel.setValue(""), reminderMessage: reminder.value, remind: reminder.setValue, closeReminder: () => reminder.setValue(""), appointmentMessage: appointment.value, schedule: appointment.setValue, closeAppointment: () => appointment.value ? appointment.setValue("") : panel.setValue("") }
}
