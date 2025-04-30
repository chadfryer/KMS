import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import App from './App'
import './index.css'
import '@mantine/core/styles.css'

const theme = createTheme({
  colors: {
    primary: ['#CC0000', '#CC0000', '#CC0000', '#CC0000', '#CC0000', '#CC0000', '#CC0000', '#CC0000', '#CC0000', '#CC0000'],
    dark: ['#1E293B', '#1E293B', '#1E293B', '#1E293B', '#1E293B', '#1E293B', '#1E293B', '#1E293B', '#1E293B', '#1E293B'],
    charcoal: ['#333333', '#333333', '#333333', '#333333', '#333333', '#333333', '#333333', '#333333', '#333333', '#333333']
  },
  primaryColor: 'red',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  defaultRadius: 'md',
  components: {
    Text: {
      styles: {
        root: { color: '#FFFFFF' }
      }
    },
    Title: {
      styles: {
        root: { color: '#FFFFFF' }
      }
    },
    Button: {
      defaultProps: {
        variant: 'filled',
        size: 'md'
      },
      styles: {
        root: {
          backgroundColor: '#CC0000',
          border: '2px solid transparent',
          justifyContent: 'flex-start',
          padding: '10px 15px',
          transition: 'all 0.2s ease',

          '&:hover': {
            backgroundColor: '#990000',
            transform: 'translateY(-1px)'
          },

          '&.navButton': {
            backgroundColor: 'transparent',
            border: '2px solid #666666',
            
            '&[data-variant="filled"]': {
              backgroundColor: '#CC0000',
              borderColor: '#CC0000',
              '& .mantine-Button-label, & .mantine-Button-section svg': {
                color: '#FFFFFF'
              },
              '&:hover': {
                backgroundColor: '#990000',
                borderColor: '#990000',
                transform: 'translateY(-1px)'
              }
            },
            
            '&[data-variant="light"]': {
              backgroundColor: 'transparent',
              borderColor: '#666666',
              '& .mantine-Button-label': {
                color: '#CCCCCC'
              },
              '& .mantine-Button-section svg': {
                color: '#888888'
              },
              '&:hover': {
                backgroundColor: '#444444',
                borderColor: '#888888',
                transform: 'translateY(-1px)',
                '& .mantine-Button-label, & .mantine-Button-section svg': {
                  color: '#FFFFFF'
                }
              }
            }
          }
        },
        label: {
          color: '#FFFFFF',
          fontSize: '16px',
          fontWeight: 600,
          textAlign: 'left',
          transition: 'color 0.2s ease'
        },
        inner: {
          justifyContent: 'flex-start'
        },
        section: {
          marginRight: '12px',
          '& svg': {
            transition: 'color 0.2s ease'
          }
        }
      }
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
        withBorder: true
      },
      styles: {
        root: {
          backgroundColor: '#333333',
          borderColor: '#3A4444',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)'
          }
        }
      }
    },
    AppShell: {
      styles: {
        main: {
          backgroundColor: '#000000'
        },
        navbar: {
          backgroundColor: '#333333',
          borderRight: '1px solid #3A4444'
        },
        header: {
          backgroundColor: '#333333',
          borderBottom: '1px solid #3A4444'
        }
      }
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>
)
