import type { SVGProps } from 'react';

export type IconName =
  | 'mixer'
  | 'meters'
  | 'processing'
  | 'routing'
  | 'automix'
  | 'presets'
  | 'system'
  | 'connection'
  | 'dca'
  | 'power'
  | 'warning'
  | 'chevronLeft'
  | 'chevronRight'
  | 'plus'
  | 'trash'
  | 'copy'
  | 'save'
  | 'play'
  | 'scan'
  | 'link';

const paths: Record<IconName, string> = {
  mixer: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  meters: 'M5 20V10M10 20V4M15 20v-7M20 20V7',
  processing: 'M3 12h3l2-7 4 14 3-9 2 4h4',
  routing: 'M4 6h10a4 4 0 0 1 4 4v8M4 18h6M14 14l4 4 4-4',
  automix: 'M12 3a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4ZM5 11a7 7 0 0 0 14 0M12 18v3M8 21h8',
  presets: 'M6 3h12v18l-6-4-6 4V3Z',
  system: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 12H2M22 12h-2M12 4V2M12 22v-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4',
  connection: 'M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0V7ZM12 16v5',
  dca: 'M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5',
  power: 'M12 2v10M6.3 6.3a8 8 0 1 0 11.4 0',
  warning: 'M12 3 2 21h20L12 3ZM12 9v5M12 17v.5',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
  copy: 'M8 8h12v12H8V8ZM4 16V4h12',
  save: 'M4 4h12l4 4v12H4V4ZM8 4v6h8V4M8 20v-6h8v6',
  play: 'm7 4 13 8-13 8V4Z',
  scan: 'M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M8 12h8',
  link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
};

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
