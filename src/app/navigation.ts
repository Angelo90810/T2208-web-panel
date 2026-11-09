import type { IconName } from '../components/Icon';

export const VIEW_IDS = [
  'mixer',
  'meters',
  'processing',
  'routing',
  'automix',
  'presets',
  'system',
  'connection',
] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export interface ViewMeta {
  id: ViewId;
  icon: IconName;
  labelKey: string;
}

export const VIEW_META: ViewMeta[] = [
  { id: 'mixer', icon: 'mixer', labelKey: 'nav.mixer' },
  { id: 'meters', icon: 'meters', labelKey: 'nav.meters' },
  { id: 'processing', icon: 'processing', labelKey: 'nav.processing' },
  { id: 'routing', icon: 'routing', labelKey: 'nav.routing' },
  { id: 'automix', icon: 'automix', labelKey: 'nav.automix' },
  { id: 'presets', icon: 'presets', labelKey: 'nav.presets' },
  { id: 'system', icon: 'system', labelKey: 'nav.system' },
  { id: 'connection', icon: 'connection', labelKey: 'nav.connection' },
];

export function isViewId(value: string): value is ViewId {
  return (VIEW_IDS as readonly string[]).includes(value);
}
