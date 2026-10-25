export type AppLanguage = "vi" | "en"

export interface TranslationDictionary {
  readonly navigation: {
    readonly inbox: string
    readonly people: string
    readonly notifications: string
    readonly settings: string
    readonly profile: string
    readonly logout: string
    readonly toggleTheme: string
    readonly brandLogo: string
  }
  readonly settings: {
    readonly title: string
    readonly eyebrow: string
    readonly description: string
    readonly accountTitle: string
    readonly accountDescription: string
    readonly viewProfileBtn: string
    readonly chatTitle: string
    readonly chatDescription: string
    readonly sendOnEnterLabel: string
    readonly sendOnEnterDescription: string
    readonly sendOnEnterOptionEnter: string
    readonly sendOnEnterOptionCtrlEnter: string
    readonly typingIndicatorLabel: string
    readonly typingIndicatorDescription: string
    readonly autoScrollLabel: string
    readonly autoScrollDescription: string
    readonly previewToastLabel: string
    readonly previewToastDescription: string
    readonly languageTitle: string
    readonly languageDescription: string
    readonly appearanceTitle: string
    readonly appearanceDescription: string
    readonly themeSystem: string
    readonly themeLight: string
    readonly themeDark: string
    readonly soundTitle: string
    readonly soundDescription: string
    readonly soundTest: string
    readonly soundOn: string
    readonly soundOff: string
    readonly soundNote: string
    readonly privacyTitle: string
    readonly privacyDescription: string
    readonly logoutTitle: string
    readonly logoutDescription: string
    readonly logoutBtn: string
  }
  readonly notifications: {
    readonly title: string
    readonly eyebrow: string
    readonly description: string
    readonly tabAll: string
    readonly tabRequests: string
    readonly tabMessages: string
    readonly emptyTitle: string
    readonly emptyDescription: string
    readonly loading: string
    readonly errorTitle: string
    readonly retry: string
  }
  readonly chat: {
    readonly placeholderSendOnEnter: string
    readonly placeholderSendOnClick: string
    readonly sendBtn: string
    readonly attachBtn: string
    readonly emojiBtn: string
    readonly replyingTo: string
    readonly cancelReply: string
  }
  readonly common: {
    readonly edit: string
    readonly save: string
    readonly cancel: string
    readonly delete: string
    readonly close: string
    readonly loading: string
    readonly retry: string
    readonly on: string
    readonly off: string
  }
}

export interface I18nState {
  readonly language: AppLanguage
  readonly setLanguage: (language: AppLanguage) => void
  readonly copy: TranslationDictionary
}
