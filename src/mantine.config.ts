import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  components: {
    Container: {
      defaultProps: {
        size: 'xl',
        p: 'md',
      },
    },
    Paper: {
      defaultProps: {
        shadow: 'sm',
        p: 'md',
      },
    },
    Group: {
      defaultProps: {
        spacing: 'md',
      },
    },
    Stack: {
      defaultProps: {
        spacing: 'lg',
      },
    },
    Title: {
      defaultProps: {
        order: 1,
      },
    },
    Text: {
      defaultProps: {
        size: 'md',
      },
    },
  },
}); 