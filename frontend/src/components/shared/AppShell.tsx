interface AppShellProps {
  children: React.ReactNode
}

function AppShell({ children }: AppShellProps) {
  return (
    <>
      <a
        href="#fretboard"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:bg-background focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to fretboard
      </a>
      <div className="app-shell">
        {children}
      </div>
    </>
  )
}

AppShell.displayName = 'AppShell'

export default AppShell
