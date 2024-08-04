export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "VidRepeat Revival",
  description: "Bringing back the hacked vid-repeat.com",
  navItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Default",
      href: "/default",
    },
    {
      label: "Advanced Plus",
      href: "/advanced",
    },
    {
      label: "Stack Editor",
      href: "/stackeditor",
    },
    {
      label: "History",
      href: "/history",
    },
  ],
  navMenuItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Default",
      href: "/default",
    },
    {
      label: "Advanced Plus",
      href: "/reactplayer",
    },
    {
      label: "Stack Editor",
      href: "/stackeditor",
    },
    {
      label: "History",
      href: "/history",
    },
  ],
  links: {
    github: "https://github.com/nextui-org/nextui",
    twitter: "https://twitter.com/getnextui",
    docs: "https://nextui.org",
    discord: "https://discord.gg/9b6yyZKmH4",
    sponsor: "https://patreon.com/jrgarciadev",
  },
};
