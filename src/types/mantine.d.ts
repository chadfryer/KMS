import type { ReactElement, ComponentType, ReactNode, JSXElementConstructor, ElementType } from 'react';
import type { MantineColor, MantineNumberSize, MantineRadius } from '@mantine/core';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
    }
  }
}

declare module '@mantine/core' {
  export interface MantineThemeOverride {}

  // Extend component props to ensure they return ReactElement
  export interface TooltipProps {
    children: ReactNode;
    label: string;
    position?: 'top' | 'right' | 'bottom' | 'left';
    withinPortal?: boolean;
  }

  export interface BoxProps {
    component?: ElementType;
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  export interface ContainerProps {
    size?: MantineNumberSize | number | string;
    p?: MantineNumberSize | number | string;
    children?: ReactNode;
  }

  export interface GroupProps {
    position?: 'left' | 'center' | 'right' | 'apart';
    spacing?: MantineNumberSize | number | string;
    grow?: boolean;
    children?: ReactNode;
  }

  export interface StackProps {
    spacing?: MantineNumberSize | number | string;
    children?: ReactNode;
  }

  export interface TitleProps {
    order?: 1 | 2 | 3 | 4 | 5 | 6;
    children?: ReactNode;
  }

  export interface TextProps {
    size?: MantineNumberSize | number | string;
    children?: ReactNode;
  }

  export interface PaperProps {
    shadow?: MantineNumberSize | string;
    p?: MantineNumberSize | number | string;
    radius?: MantineRadius;
    withBorder?: boolean;
    children?: ReactNode;
  }

  export interface MantineProviderProps {
    theme?: any;
    children?: ReactNode;
  }

  // Export components as proper React components that return ReactElement
  export const Tooltip: ComponentType<TooltipProps>;
  export const Box: ComponentType<BoxProps>;
  export const Container: ComponentType<ContainerProps>;
  export const Group: ComponentType<GroupProps>;
  export const Stack: ComponentType<StackProps>;
  export const Title: ComponentType<TitleProps>;
  export const Text: ComponentType<TextProps>;
  export const Paper: ComponentType<PaperProps>;
  export const MantineProvider: ComponentType<MantineProviderProps>;
} 