import type { ReactNode } from "react";

/**
 * SVGProps kullanılmaz — monorepo'da birden fazla @types/react kopyası
 * (web + mobile/expo) ref tiplerini çakıştırıp CI typecheck'i kırıyor.
 */
export type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

/** Stroke icon factory — Lucide-style 24×24 paths, currentColor. */
function createIcon(paths: ReactNode, displayName: string) {
  function Icon({
    size = 24,
    strokeWidth = 2,
    className,
    title,
    "aria-label": ariaLabel,
    "aria-hidden": ariaHidden = true,
  }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden}
        aria-label={ariaLabel}
        className={className}
      >
        {title ? <title>{title}</title> : null}
        {paths}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

export const HomeIcon = createIcon(
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </>,
  "HomeIcon",
);

export const PackageIcon = createIcon(
  <>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.3 7 12 12l8.7-5" />
    <path d="M12 22V12" />
  </>,
  "PackageIcon",
);

export const DocumentIcon = createIcon(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </>,
  "DocumentIcon",
);

export const MapPinIcon = createIcon(
  <>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </>,
  "MapPinIcon",
);

export const WalletIcon = createIcon(
  <>
    <rect x="2" y="6" width="20" height="14" rx="3" />
    <path d="M2 10h20" />
  </>,
  "WalletIcon",
);

export const UserIcon = createIcon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M5 21v-1a7 7 0 0 1 14 0v1" />
  </>,
  "UserIcon",
);

export const UsersIcon = createIcon(
  <>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21v-1a7 7 0 0 1 14 0v1" />
    <path d="M17 4a4 4 0 0 1 0 8" />
    <path d="M22 21v-1a7 7 0 0 0-4-6.3" />
  </>,
  "UsersIcon",
);

export const BellIcon = createIcon(
  <>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </>,
  "BellIcon",
);

export const BriefcaseIcon = createIcon(
  <>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </>,
  "BriefcaseIcon",
);

export const TruckIcon = createIcon(
  <>
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
    <path d="M9 17h6" />
    <path d="M19 17h2v-4l-3-5h-4v9" />
    <path d="M3 17V7h11" />
  </>,
  "TruckIcon",
);

export const ArrowLeftIcon = createIcon(
  <>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </>,
  "ArrowLeftIcon",
);

export const ArrowRightIcon = createIcon(
  <>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>,
  "ArrowRightIcon",
);

export const ChevronRightIcon = createIcon(<path d="m9 18 6-6-6-6" />, "ChevronRightIcon");

export const CheckIcon = createIcon(<path d="M20 6 9 17l-5-5" />, "CheckIcon");

export const CloseIcon = createIcon(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
  "CloseIcon",
);

export const PhoneIcon = createIcon(
  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" />,
  "PhoneIcon",
);

export const MessageIcon = createIcon(
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  "MessageIcon",
);

export const ShareIcon = createIcon(
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
  </>,
  "ShareIcon",
);

export const StarIcon = createIcon(
  <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L4 8.8h6.1z" />,
  "StarIcon",
);

export const ClockIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
  "ClockIcon",
);

export const LockIcon = createIcon(
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
  "LockIcon",
);

export const ShieldIcon = createIcon(
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  "ShieldIcon",
);

export const NavigationIcon = createIcon(
  <polygon points="3 11 22 2 13 21 11 13 3 11" />,
  "NavigationIcon",
);

export const AlertIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </>,
  "AlertIcon",
);

export const PlusIcon = createIcon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
  "PlusIcon",
);

export const LogOutIcon = createIcon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </>,
  "LogOutIcon",
);

export const RepeatIcon = createIcon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </>,
  "RepeatIcon",
);

export const CardIcon = createIcon(
  <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </>,
  "CardIcon",
);

export const ArrowUpIcon = createIcon(
  <path d="M12 19V5m0 0-6 6m6-6 6 6" />,
  "ArrowUpIcon",
);

export const ArrowDownIcon = createIcon(
  <path d="M12 5v14m0 0 6-6m-6 6-6-6" />,
  "ArrowDownIcon",
);

export const MenuIcon = createIcon(
  <path d="M4 6h16M4 12h16M4 18h16" />,
  "MenuIcon",
);

export const SearchIcon = createIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>,
  "SearchIcon",
);

export const ChartIcon = createIcon(
  <>
    <path d="M3 3v18h18" />
    <path d="M7 14v4" />
    <path d="M12 9v9" />
    <path d="M17 5v13" />
  </>,
  "ChartIcon",
);

export const BikeIcon = createIcon(
  <>
    <circle cx="6" cy="17" r="3.5" />
    <circle cx="18" cy="17" r="3.5" />
    <path d="M6 17 9 8h6" />
    <path d="m18 17-3-9" />
    <path d="M9 8 7 5h3" />
  </>,
  "BikeIcon",
);

export const FootprintsIcon = createIcon(
  <>
    <path d="M4 16v-2.4a3.5 3.5 0 0 1 3.5-3.5c1.9 0 3.5 1.6 3.5 3.5V16" />
    <path d="M4 16h7v2a3.5 3.5 0 0 1-7 0z" />
    <path d="M13 8V5.6A3.5 3.5 0 0 1 16.5 2C18.4 2 20 3.6 20 5.5V8" />
    <path d="M13 8h7v2a3.5 3.5 0 0 1-7 0z" />
  </>,
  "FootprintsIcon",
);

export const CarIcon = createIcon(
  <>
    <path d="M5 11 6.5 6.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
    <rect x="3" y="11" width="18" height="7" rx="2" />
    <circle cx="7.5" cy="18" r="1.5" />
    <circle cx="16.5" cy="18" r="1.5" />
  </>,
  "CarIcon",
);
