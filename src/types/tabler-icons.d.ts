import { ComponentType } from 'react';

declare module '@tabler/icons-react' {
  export interface TablerIconProps {
    size?: number;
    style?: React.CSSProperties;
    className?: string;
    color?: string;
    stroke?: number;
  }

  export const IconInfoCircle: ComponentType<TablerIconProps>;
} 