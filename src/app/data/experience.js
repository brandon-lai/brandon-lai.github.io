/**
 * Work history, newest first.
 *
 *   role      job title
 *   org       company / organisation
 *   type      "Full-time" | "Internship" | "Fellowship" | …  (optional)
 *   start/end date range as displayed; use "Present" for a current role
 *   duration  optional — only set it for finished roles, so nothing goes stale
 *   location  optional
 *   note      one-line description
 *   href      optional — makes the whole row a link
 *   logo      optional — path to an image in /public; falls back to the initial
 */

export const EXPERIENCE = [
  {
    role: "Software Engineer",
    org: "LinkedIn",
    type: "Full-time",
    logo: "/logos/linkedin.png",
    start: "Sep 2022",
    end: "Present",
    note: "Full-stack, agentic-AI-powered builder.",
  },
  {
    role: "Software Engineer Intern",
    org: "Hearth",
    logo: "/logos/hearth.png",
    type: "Internship",
    start: "May 2022",
    end: "Aug 2022",
    duration: "4 mos",
    note: "Core product, front-end infrastructure, and growth initiatives.",
  },
  {
    role: "Fellow",
    org: "8VC",
    logo: "/logos/8vc.png",
    type: "Fellowship",
    start: "May 2022",
    end: "Aug 2022",
    duration: "4 mos",
    note: "A different kind of VC firm.",
    href: "https://www.8vc.com/fellowships",
  },
  {
    role: "Software Engineer Intern",
    org: "LinkedIn",
    logo: "/logos/linkedin.png",
    type: "Internship",
    start: "May 2021",
    end: "Aug 2021",
    duration: "4 mos",
    note: "LinkedIn.com landing page.",
  },
  {
    role: "Founding Engineer",
    org: "smoodi",
    logo: "/logos/smoodi.png",
    start: "Jun 2019",
    end: "Sep 2020",
    duration: "1 yr 4 mos",
    location: "Boston, MA",
    note: "Built the world's first fully self-cleaning autonomous smoothie machine.",
  },
];
