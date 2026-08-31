/* Every icon, one export per glyph, grouped by file. `base` is deliberately
   not re-exported: it is the shared attribute spread, and the only callers it
   should ever have are the icon files beside it. */
export type { IconProps } from './base';

export {
  IconArrowRight,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconColumns,
  IconFilter,
  IconKanban,
  IconLayoutGrid,
  IconLayoutList,
  IconMenu,
  IconPin,
  IconSortAsc,
  IconSortDesc,
} from './arrows';

export {
  IconClose,
  IconCopy,
  IconDownload,
  IconExternal,
  IconEye,
  IconEyeOff,
  IconGrip,
  IconLink,
  IconMinus,
  IconMore,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUndo,
} from './actions';

export {
  IconBook,
  IconBookmark,
  IconCalendar,
  IconClipboardList,
  IconClock,
  IconDatabase,
  IconFile,
  IconFlow,
  IconGlobe,
  IconHourglass,
  IconImage,
  IconLock,
  IconPaperclip,
  IconTag,
} from './objects';

export {
  IconBellOff,
  IconChat,
  IconContacts,
  IconInbox,
  IconLogOut,
  IconMail,
  IconMessage,
  IconMessageCircle,
  IconMic,
  IconPhone,
  IconSend,
  IconShield,
  IconUser,
  IconUsers,
} from './communication';

export {
  IconAssistant,
  IconFacebook,
  IconInstagram,
  IconMegaphone,
  IconNavigate,
  IconSparkles,
  IconStop,
  IconStory,
  IconTarget,
  IconTikTok,
  IconTool,
  IconWhatsApp,
  IconWidget,
} from './channels';

export {
  IconBolt,
  IconCheck,
  IconChecks,
  IconHand,
  IconHeart,
  IconInfo,
  IconMaximize,
  IconMonitor,
  IconMoon,
  IconPlay,
  IconPointer,
  IconRepeat,
  IconSun,
  IconWarning,
} from './status';
