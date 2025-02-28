"use client"

import { ThemeToggle } from "@/components/nui/theme-provider"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import {
  RiArrowLeftLongLine,
  RiArrowUpSLine,
  RiBrushAiLine,
  RiCodeAiFill,
  RiCodeAiLine,
  RiGithubFill,
  RiLinkedinBoxFill,
  RiMenu4Fill,
  RiTwitterXFill,
} from "@remixicon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FC, useState } from "react"

const doesPathMatchHref = (pathname: string, href: string): boolean => {
  const cleanedPathname = pathname.split(/[?#]/)[0]

  if (href === "/") {
    return (
      cleanedPathname === "/" ||
      pathname.startsWith("/#") ||
      pathname.startsWith("/?")
    )
  }

  if (href === cleanedPathname) {
    return true
  }

  if (href === "/ui") {
    return (
      cleanedPathname === "/ui" ||
      pathname.startsWith("/ui#") ||
      pathname.startsWith("/ui?")
    )
  }

  const regex = new RegExp(`^${href}/[^/]+.*$`)
  return regex.test(cleanedPathname)
}

const navItems = [
  { name: "home", href: "/" },
  { name: "blogs", href: "/blogs" },
  { name: "projects", href: "/projects" },
  { name: "contact", href: "/contact" },
]

const uiNavItems = [
  { name: "home", href: "/ui" },
  { name: "docs", href: "/ui/docs" },
  { name: "components", href: "/ui/components" },
  { name: "blocks", href: "/ui/blocks" },
]

const socialLinks = [
  { href: "https://github.com/nrjdalal", icon: RiGithubFill },
  { href: "https://www.linkedin.com/in/nrjdalal", icon: RiLinkedinBoxFill },
  { href: "https://x.com/nrjdalal_com", icon: RiTwitterXFill },
]

interface NavigationLinksProps {
  items: { name: string; href: string }[]
  hoveredItem: string | null
  setHoveredItem: (item: string | null) => void
  pathname: string
}

const NavigationLinks: FC<NavigationLinksProps> = ({
  items,
  hoveredItem,
  setHoveredItem,
  pathname,
}) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="text-muted-foreground hidden cursor-pointer items-center divide-x font-medium lg:flex">
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "group relative flex h-full items-center px-7.5",
              doesPathMatchHref(pathname, item.href)
                ? "text-foreground"
                : "hover:text-foreground",
            )}
            onMouseEnter={() => setHoveredItem(item.href)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {item.name}
            <span
              className={cn(
                "bg-foreground absolute bottom-0 left-0 h-[2px] transition-all ease-in-out",
                doesPathMatchHref(pathname, item.href)
                  ? hoveredItem && hoveredItem !== item.href
                    ? "w-0 duration-1000"
                    : "w-full duration-500"
                  : "w-0 duration-1000 group-hover:w-[90%]",
              )}
            />
          </Link>
        ))}
        {socialLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target="_blank"
            className="hover:text-foreground group relative flex aspect-square h-full items-center justify-center"
          >
            <link.icon className="size-6" />
            <RiArrowUpSLine className="absolute top-0 right-0 size-4 rotate-45 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="bg-foreground absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 ease-in-out group-hover:w-full" />
          </Link>
        ))}
        <ThemeToggle />
      </div>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger className="text-foreground flex h-full w-16 cursor-pointer items-center justify-center border-l lg:hidden">
          <RiMenu4Fill className="size-6" />
        </DrawerTrigger>
        <DrawerContent className="lg:hidden">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Menu</DrawerTitle>
            <DrawerDescription>Navigation links</DrawerDescription>
          </DrawerHeader>
          <div className="relative mt-8 px-14 pb-14">
            <span className="bg-border absolute top-0 left-0 h-px w-full" />
            <span className="bg-border absolute bottom-14 left-0 h-px w-full" />
            <span className="bg-border absolute -top-14 left-14 h-full w-px" />
            <span className="bg-border absolute right-14 bottom-0 h-full w-px" />
            <span className="text-foreground/50 absolute -right-8 bottom-48 flex rotate-270 items-center gap-x-2 text-xs">
              <RiArrowLeftLongLine className="size-3.5" /> Switch dark mode
            </span>
            <span className="absolute right-0 bottom-14 aspect-square h-14">
              <ThemeToggle />
            </span>
            <div className="mx-auto flex w-full flex-col items-center">
              {items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group relative flex h-14 w-full items-center justify-center px-7.5",
                    doesPathMatchHref(pathname, item.href)
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => setOpen(false)}
                >
                  {item.name}
                  <span
                    className={cn(
                      "bg-border/50 absolute left-0 -z-10 h-14 transition-all ease-in-out",
                      doesPathMatchHref(pathname, item.href)
                        ? hoveredItem && hoveredItem !== item.href
                          ? "w-0 duration-1000"
                          : "w-full duration-1000"
                        : "w-0 duration-1000 group-hover:w-[95%]",
                    )}
                  />
                </Link>
              ))}
              <div className="flex h-14 w-full justify-between divide-x border-t">
                {socialLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    className="hover:text-foreground group relative flex h-full w-full items-center justify-center"
                  >
                    <link.icon className="size-6" />
                    <RiArrowUpSLine className="absolute top-0 right-0 size-4 rotate-45 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <span className="bg-foreground absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 ease-in-out group-hover:w-full" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <div className="bg-background sticky top-0 z-50 flex h-14 w-full justify-between border-b">
      <div className="flex divide-x font-mono font-medium">
        <Link
          href="/"
          className={cn(
            "hover:bg-border/50 flex h-full min-w-48 cursor-pointer items-center gap-x-2 px-5 lg:min-w-64",
            pathname.startsWith("/ui") && "hidden",
          )}
        >
          <RiCodeAiLine className="size-6" />
          <p>NRJDALAL.</p>
        </Link>
        <Link
          href="/ui"
          className={cn(
            "hover:bg-border/50 flex h-full cursor-pointer items-center gap-x-2 px-5",
            pathname.startsWith("/ui") && "min-w-48 lg:min-w-64",
          )}
        >
          <RiBrushAiLine className="size-6" />
          <p className={cn(!pathname.startsWith("/ui") && "hidden")}>
            nrjdalalUI.
          </p>
        </Link>
        <Link
          href="/"
          className={cn(
            "hidden",
            pathname.startsWith("/ui") &&
              "hover:bg-border/50 flex h-full cursor-pointer items-center justify-center gap-x-2 border-r px-5",
          )}
        >
          <RiCodeAiFill className="size-6" />
        </Link>
      </div>

      <NavigationLinks
        items={pathname.startsWith("/ui") ? uiNavItems : navItems}
        hoveredItem={hoveredItem}
        setHoveredItem={setHoveredItem}
        pathname={pathname}
      />
    </div>
  )
}
