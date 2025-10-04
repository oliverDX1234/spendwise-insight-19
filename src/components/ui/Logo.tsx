import { cn } from "@/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
    >
      <rect width="40" height="40" rx="8" fill="url(#gradient)" />
      <path
        d="M20 8C18.8954 8 18 8.89543 18 10V12C18 13.1046 18.8954 14 20 14C21.1046 14 22 13.1046 22 12V10C22 8.89543 21.1046 8 20 8Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M13 15C11.8954 15 11 15.8954 11 17V30C11 31.1046 11.8954 32 13 32H27C28.1046 32 29 31.1046 29 30V17C29 15.8954 28.1046 15 27 15H13Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M15 20C15 19.4477 15.4477 19 16 19H24C24.5523 19 25 19.4477 25 20C25 20.5523 24.5523 21 24 21H16C15.4477 21 15 20.5523 15 20Z"
        fill="url(#gradient)"
      />
      <path
        d="M15 24C15 23.4477 15.4477 23 16 23H21C21.5523 23 22 23.4477 22 24C22 24.5523 21.5523 25 21 25H16C15.4477 25 15 24.5523 15 24Z"
        fill="url(#gradient)"
      />
      <circle cx="24" cy="28" r="1.5" fill="url(#gradient)" />
      <defs>
        <linearGradient
          id="gradient"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
