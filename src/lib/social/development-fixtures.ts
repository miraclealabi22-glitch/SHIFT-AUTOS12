import type { SocialFixtures } from "./types";

export const developmentSocialFixtures: SocialFixtures = {
  users: [
    {
      username: "shift-editorial",
      displayName: "SHIFT Editorial",
      bio: "A closer look at the machines and people shaping automotive culture.",
    },
  ],
  posts: [
    {
      id: "editorial-ferrari-preview",
      author: {
        username: "shift-editorial",
        displayName: "SHIFT Editorial",
        bio: "A closer look at the machines and people shaping automotive culture.",
      },
      caption: "Sculpted light and form, through the SHIFT lens.",
      createdAt: "Preview",
      media: [{
        type: "image",
        src: "/media/auth/shift-ferrari-black-studio-poster.webp",
        alt: "Red Ferrari in a dark studio, supplied SHIFT editorial image",
      }],
      vehicle: "Ferrari · SHIFT editorial",
      hashtags: ["SHIFTEditorial", "AutomotiveDesign"],
      developmentFixture: true,
    },
    {
      id: "editorial-ferrari-video",
      author: {
        username: "shift-editorial",
        displayName: "SHIFT Editorial",
        bio: "A closer look at the machines and people shaping automotive culture.",
      },
      caption: "A Ferrari, framed by light.",
      createdAt: "Preview",
      media: [{
        type: "video",
        src: "/media/auth/Ferrari_commercial_in_black_studio_de34f392_1080p.mp4",
        poster: "/media/auth/shift-ferrari-black-studio-poster.webp",
        alt: "Supplied Ferrari automotive video preview",
      }],
      vehicle: "Ferrari · SHIFT film",
      hashtags: ["SHIFTEditorial"],
      developmentFixture: true,
    },
  ],
};
