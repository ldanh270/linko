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
    readonly toggleLanguage: string
    readonly brandLogo: string
  }
  readonly inbox: {
    readonly chatsTitle: string
    readonly createGroup: string
    readonly findFriends: string
    readonly searchPlaceholder: string
    readonly searchInboxPlaceholder: string
    readonly recent: string
    readonly recentConversations: string
    readonly conversationsMatch: string
    readonly peopleMatch: string
    readonly searchEmptyTitle: string
    readonly searchEmptyDesc: string
    readonly backToConversations: string
    readonly clearSearch: string
    readonly emptyTitle: string
    readonly emptyDescription: string
    readonly filterAll: string
    readonly filterGroups: string
    readonly filterFriends: string
    readonly nextPage: string
    readonly welcomeTitle: string
    readonly welcomeDescription: string
    readonly sendDirectMessage: string
    readonly searchingPeople: string
  }
  readonly groups: {
    readonly title: string
    readonly searchPlaceholder: string
    readonly createGroupModalTitle: string
    readonly groupName: string
    readonly groupNamePlaceholder: string
    readonly groupDescription: string
    readonly groupDescriptionPlaceholder: string
    readonly optional: string
    readonly addFriends: string
    readonly selected: string
    readonly searchFriendsPlaceholder: string
    readonly noFriends: string
    readonly createGroupBtn: string
    readonly emptyGroupsTitle: string
    readonly createFirstGroup: string
  }
  readonly people: {
    readonly title: string
    readonly searchPlaceholder: string
    readonly friendRequests: string
    readonly emptyContacts: string
    readonly emptyContactsDesc: string
    readonly addContactModalTitle: string
    readonly accept: string
    readonly decline: string
    readonly searchUsers: string
    readonly minSearchLength: string
    readonly searching: string
    readonly noUserFound: string
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
    readonly newMessage: string
    readonly enableBrowser: string
    readonly browserEnabled: string
    readonly browserDenied: string
    readonly browserUnsupported: string
    readonly browserDescription: string
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
    readonly typingStatus: string
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
  readonly toggleLanguage: () => void
  readonly copy: TranslationDictionary
}
