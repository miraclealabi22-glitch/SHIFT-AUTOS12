export type SocialMedia = {
  type: "image" | "video";
  src: string;
  poster?: string;
  alt: string;
};

export type SocialUser = {
  username: string;
  displayName: string;
  bio: string;
  location?: string;
  avatar?: string;
  verified?: boolean;
  joinedAt?: string;
  followers?: number;
  following?: number;
  vehicles?: number;
};

export type SocialPost = {
  id: string;
  author: SocialUser;
  caption: string;
  createdAt: string;
  media: SocialMedia[];
  vehicle?: string;
  likes?: number;
  comments?: number;
  hashtags?: string[];
  developmentFixture: true;
};

export type SocialFixtures = {
  users: SocialUser[];
  posts: SocialPost[];
};
