/* ============================================================
   >>> EDIT EVERYTHING ABOUT YOU HERE. <<<
   This single file feeds both the static sections and the
   interactive terminal. Change text here, the whole site updates.
   ============================================================ */

export const site = {
  handle: '5coinin1',
  name: '5coinin1',
  role: 'CTF player · Security enthusiast',
  team: '________', // your CTF team (or set to '')
  location: 'Vietnam',
  email: '________',

  // Short one-liner shown under your name on the home hero.
  tagline: 'I break things, then write about how I did it.',

  about: [
    "Hi, I'm 5coinin1 — a security enthusiast who loves breaking and building.",
    'I play CTFs (mostly rev / pwn) and tinker with low-level stuff.',
    'This is my little corner of the internet. Type `help` in the terminal to explore.',
  ],

  projects: [
    {
      name: 'project-one',
      tag: 'python · tooling',
      desc: 'Short description of what it does.',
      url: 'https://github.com/5coinin1/project-one',
    },
    {
      name: 'project-two',
      tag: 'web · ctf',
      desc: 'Another thing you built.',
      url: 'https://github.com/5coinin1/project-two',
    },
  ],

  ctf: [
  ],

  socials: {
    github: 'https://github.com/5coinin1',
    twitter: 'https://x.com/5coinin1',
    ctftime: 'https://ctftime.org/user/XXXX',
  },
} as const;

export type Site = typeof site;
