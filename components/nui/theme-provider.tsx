"use client"

import { Button } from "@/components/ui/button"
import { RiMoonFill, RiSunFill } from "@remixicon/react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()

  const smartToggle = () => {
    /* The smart toggle by @nrjdalal */
    const prefersDarkScheme = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches
    if (theme === "system") {
      setTheme(prefersDarkScheme ? "light" : "dark")
    } else if (
      (theme === "light" && !prefersDarkScheme) ||
      (theme === "dark" && prefersDarkScheme)
    ) {
      setTheme(theme === "light" ? "dark" : "light")
    } else {
      setTheme("system")
    }
  }

  return (
    <Button
      variant="ghost"
      className="aspect-square size-full rounded-none [&_svg]:size-5"
      onClick={smartToggle}
      aria-label="Switch between system/light/dark version"
    >
      <RiSunFill className="dark:hidden" aria-hidden="true" />
      <RiMoonFill className="hidden dark:block" aria-hidden="true" />
    </Button>
  )
}

export const ThemeProvider = ({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
