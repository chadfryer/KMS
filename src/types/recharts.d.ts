import { ComponentType, ReactNode } from 'react';

declare module 'recharts' {
  export interface BaseChartProps {
    data?: any[];
    width?: number | string;
    height?: number | string;
    children?: ReactNode;
  }

  export interface ResponsiveContainerProps {
    width?: number | string;
    height?: number | string;
    children?: ReactNode;
  }

  export interface LineChartProps extends BaseChartProps {
    data: any[];
  }

  export interface BarChartProps extends BaseChartProps {
    data: any[];
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }

  export interface PieChartProps extends BaseChartProps {}

  export interface PieProps {
    data?: any[];
    dataKey?: string;
    nameKey?: string;
    cx?: string | number;
    cy?: string | number;
    outerRadius?: number;
    label?: boolean | Function;
    children?: ReactNode;
  }

  export interface CellProps {
    key?: string;
    fill?: string;
  }

  export interface CartesianGridProps {
    strokeDasharray?: string;
  }

  export interface XAxisProps {
    dataKey?: string;
    angle?: number;
    textAnchor?: string;
    height?: number;
    tick?: boolean | ReactNode | Function;
  }

  export interface YAxisProps {
    tick?: boolean | ReactNode | Function;
  }

  export interface TooltipProps {
    wrapperStyle?: React.CSSProperties;
    labelStyle?: React.CSSProperties;
    formatter?: Function;
  }

  export interface LineProps {
    type?: 'basis' | 'basisClosed' | 'basisOpen' | 'linear' | 'linearClosed' | 'natural' | 'monotoneX' | 'monotoneY' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
    dataKey: string;
    stroke?: string;
    name?: string;
  }

  export interface BarProps {
    dataKey: string;
    fill?: string;
    name?: string;
    radius?: number | number[];
  }

  export interface LegendProps {
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
  }

  // Export components as proper React components that return ReactElement
  export const ResponsiveContainer: ComponentType<ResponsiveContainerProps>;
  export const LineChart: ComponentType<LineChartProps>;
  export const BarChart: ComponentType<BarChartProps>;
  export const PieChart: ComponentType<PieChartProps>;
  export const Pie: ComponentType<PieProps>;
  export const Cell: ComponentType<CellProps>;
  export const CartesianGrid: ComponentType<CartesianGridProps>;
  export const XAxis: ComponentType<XAxisProps>;
  export const YAxis: ComponentType<YAxisProps>;
  export const Tooltip: ComponentType<TooltipProps>;
  export const Line: ComponentType<LineProps>;
  export const Bar: ComponentType<BarProps>;
  export const Legend: ComponentType<LegendProps>;
} 