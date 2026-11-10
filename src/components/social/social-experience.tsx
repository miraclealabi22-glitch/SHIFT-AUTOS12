"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ShiftLogo from "@/components/brand/shift-logo";
import type { SocialFixtures, SocialPost, SocialUser } from "@/lib/social/types";

export type SocialPageKind =
  | "community" | "profile" | "followers" | "following" | "garage" | "create"
  | "reels" | "post" | "comments" | "saved" | "collections" | "collection"
  | "notifications" | "search" | "messages" | "settings" | "settings-profile"
  | "settings-account" | "settings-privacy" | "settings-notifications" | "liked"
  | "profile-reels";

type Props = {
  kind: SocialPageKind;
  fixtures: SocialFixtures | null;
  username?: string;
  slug?: string;
};

const navigation = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Discover", href: "/discover/brands", icon: "discover" },
  { label: "Community", href: "/community", icon: "community" },
  { label: "Reels", href: "/reels", icon: "reels" },
  { label: "Journal", href: "/#explore", icon: "journal" },
  { label: "Create", href: "/create", icon: "create" },
  { label: "Saved", href: "/saved", icon: "saved" },
  { label: "Notifications", href: "/notifications", icon: "notifications" },
  { label: "Messages", href: "/messages", icon: "messages" },
  { label: "Profile", href: "/profile/shift-editorial", icon: "profile" },
  { label: "Settings", href: "/settings", icon: "settings" },
] as const;

const titles: Record<SocialPageKind, string> = {
  community: "Community", profile: "Profile", followers: "Followers", following: "Following",
  garage: "Garage", create: "Create post", reels: "SHIFT Reels", post: "Post",
  comments: "Comments", saved: "Saved", collections: "Collections", collection: "Collection",
  notifications: "Notifications", search: "Search", messages: "Messages", settings: "Settings",
  "settings-profile": "Profile", "settings-account": "Account",
  "settings-privacy": "Privacy", "settings-notifications": "Notifications",
  liked: "Liked content", "profile-reels": "Reels",
};
const EMPTY_POSTS: SocialPost[] = [];

function getActiveNavigationHref(active: SocialPageKind) {
  if (active.startsWith("settings")) return "/settings";
  if (["profile", "profile-reels", "followers", "following", "garage", "liked"].includes(active)) {
    return "/profile/shift-editorial";
  }
  return `/${active}`;
}

function FixtureNotice() {
  return (
    <p className="social-fixture-note" role="status">DEVELOPMENT PREVIEW · Sample data; actions are not saved.</p>
  );
}

function SocialIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    discover: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5M8.5 13.5l2-5 5 5-5 2z" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
    reels: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="m10 9 5 3-5 3zM3 9h18M8 4l3 5M15 4l3 5" /></>,
    journal: <><path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h6" /></>,
    create: <><path d="M12 5v14M5 12h14" /></>,
    saved: <><path d="M6 4h12v17l-6-4-6 4z" /></>,
    notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    messages: <><path d="M4 5h16v12H9l-5 4zM8 9h8M8 13h5" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 2z" /></>,
    play: <path d="m9 6 10 6-10 6z" />,
    pause: <path d="M8 6h3v12H8zM15 6h3v12h-3z" />,
    sound: <><path d="M4 10v4h4l5 4V6l-5 4z" /><path d="M17 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12" /></>,
    muted: <><path d="M4 10v4h4l5 4V6l-5 4zM17 9l5 6M22 9l-5 6" /></>,
    like: <path d="M20.8 8.6c0 5.2-8.8 10.4-8.8 10.4S3.2 13.8 3.2 8.6A4.4 4.4 0 0 1 12 6.7a4.4 4.4 0 0 1 8.8 1.9z" />,
    comment: <><path d="M4 5h16v12H9l-5 4z" /><path d="M8 9h8M8 13h5" /></>,
    share: <><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 12v8h14v-8" /></>,
  };
  return <svg className="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.discover}</svg>;
}

function SocialNavigation({ active }: { active: SocialPageKind }) {
  const activeHref = getActiveNavigationHref(active);
  return (
    <aside className="social-sidebar">
      <Link className="social-brand" href="/" aria-label="SHIFT home">
        <ShiftLogo alt="SHIFT" size="small" loading="eager" />
      </Link>
      <p className="social-sidebar__label">AUTOMOTIVE CULTURE</p>
      <nav aria-label="SHIFT social navigation">
        {navigation.map(({ label, href, icon }) => (
          <Link
            className={`${href === activeHref || (href === "/settings" && active.startsWith("settings-")) ? "is-active" : ""} social-sidebar__link`}
            href={href}
            key={href}
          >
            <SocialIcon name={icon} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <Link className={`social-sidebar__search${active === "search" ? " is-active" : ""}`} href="/search"><SocialIcon name="discover" /><span>Search SHIFT</span></Link>
    </aside>
  );
}

function UserAvatar({ user, size = "medium" }: { user: SocialUser; size?: "small" | "medium" | "large" }) {
  return (
    <span className={`social-avatar social-avatar--${size}`} aria-label={`${user.displayName} profile`}>
      {user.avatar ? (
        <Image src={user.avatar} alt="" fill sizes="64px" style={{ objectFit: "cover" }} />
      ) : <span aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

function PostCard({ post, detailed = false }: { post: SocialPost; detailed?: boolean }) {
  const [shareMessage, setShareMessage] = useState("");
  function sharePost() {
    if (!navigator.clipboard?.writeText) {
      setShareMessage("Link sharing is not available in this browser.");
      return;
    }
    void navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`)
      .then(() => setShareMessage("Link copied"))
      .catch(() => setShareMessage("Unable to copy link."));
  }

  return (
    <article className={`social-post${detailed ? " social-post--detailed" : ""}`}>
      <header className="social-post__header">
        <Link className="social-user" href={`/profile/${post.author.username}`}>
          <UserAvatar user={post.author} />
          <span>
            <strong>{post.author.displayName}{post.author.verified && <span className="social-verified" aria-label="Verified"> ✓</span>}</strong>
            <small>@{post.author.username} · {post.createdAt}</small>
          </span>
        </Link>
      </header>
      <p className="social-post__caption">{post.caption}</p>
      {post.media.map((media, index) => (
        <div className="social-post__media" key={`${media.src}-${index}`}>
          {media.type === "video" ? (
            <video src={media.src} poster={media.poster} controls muted playsInline preload="none" aria-label={media.alt} />
          ) : (
            <Image src={media.src} alt={media.alt} width={1280} height={720} sizes="(max-width: 700px) 100vw, 680px" />
          )}
        </div>
      ))}
      {post.vehicle && <p className="social-vehicle-tag">VEHICLE · {post.vehicle}</p>}
      {post.hashtags && <p className="social-hashtags">{post.hashtags.map((tag) => `#${tag}`).join("  ")}</p>}
      <div className="social-post__actions">
        <button type="button" disabled title="Likes require a connected social backend">♡ {post.likes === undefined ? "Like" : post.likes}</button>
        <Link href={`/posts/${post.id}/comments`}>{post.comments === undefined ? "Comment" : `Comment · ${post.comments}`}</Link>
        <button type="button" onClick={sharePost}>Share</button>
        <button type="button" disabled title="Saving requires a connected account">Save</button>
      </div>
      {shareMessage && <p className="social-share-status" role="status">{shareMessage}</p>}
    </article>
  );
}

function EmptyState({ eyebrow, title, description, href, action }: { eyebrow: string; title: string; description: string; href?: string; action?: string }) {
  return (
    <section className="social-empty">
      <p className="social-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {href && action && <Link className="social-outline-button" href={href}>{action}</Link>}
    </section>
  );
}

function FollowAction() {
  return <button className="social-outline-button" type="button" disabled title="Following requires a connected account">Follow</button>;
}

function ProfileTabs({ username, active }: { username: string; active: string }) {
  const tabs = [
    ["Posts", `/profile/${username}`, "posts"],
    ["Reels", `/profile/${username}/reels`, "reels"],
    ["Garage", `/profile/${username}/garage`, "garage"],
    ["Collections", `/collections`, "collections"],
    ["Liked", `/profile/${username}/liked`, "liked"],
  ];
  return <nav className="social-tabs" aria-label="Profile sections">{tabs.map(([label, href, id]) => <Link aria-current={active === id ? "page" : undefined} href={href} key={id}>{label}</Link>)}</nav>;
}

function ReelStage({ post }: { post: SocialPost }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || motion.matches) {
        video.pause();
        setPlaying(false);
      } else {
        void video.play().then(() => {
          setPlaying(true);
          setPlaybackError(false);
        }).catch(() => {
          setPlaying(false);
          setPlaybackError(true);
        });
      }
    }, { threshold: 0.6 });
    observer.observe(video);
    const onMotion = () => {
      if (motion.matches) { video.pause(); setPlaying(false); }
    };
    motion.addEventListener("change", onMotion);
    return () => { observer.disconnect(); motion.removeEventListener("change", onMotion); };
  }, []);
  const media = post.media.find((item) => item.type === "video");
  if (!media) return <EmptyState eyebrow="VIDEO NOT AVAILABLE" title="No reel media found." description="A verified video record is not available in this preview." />;

  return (
    <article className="reel-stage">
      <video
        ref={videoRef}
        src={media.src}
        poster={media.poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={media.alt}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onError={() => { setLoading(false); setPlaybackError(true); }}
        onPlay={() => { setPlaying(true); setPlaybackError(false); }}
        onPause={() => setPlaying(false)}
      />
      <div className="reel-stage__shade" />
      {loading && !playbackError && <p className="reel-stage__status" role="status">LOADING VIDEO…</p>}
      {playbackError && <p className="reel-stage__status" role="status">Playback unavailable · Select play to retry</p>}
      <div className="reel-stage__caption">
        <Link className="social-user" href={`/profile/${post.author.username}`}><UserAvatar user={post.author} size="small" /><strong>@{post.author.username}</strong></Link>
        <p>{post.caption}</p>
        {post.vehicle && <p className="social-vehicle-tag">{post.vehicle}</p>}
      </div>
      <div className="reel-stage__controls">
        <button type="button" aria-label={playing ? "Pause video" : "Play video"} onClick={() => {
          const video = videoRef.current;
          if (!video) return;
          if (video.paused) {
            void video.play().then(() => setPlaybackError(false)).catch(() => setPlaybackError(true));
          } else {
            video.pause();
          }
        }}><SocialIcon name={playing ? "pause" : "play"} /><span>{playing ? "Pause" : "Play"}</span></button>
        <button type="button" aria-label={muted ? "Turn sound on" : "Mute video"} onClick={() => setMuted((value) => !value)}><SocialIcon name={muted ? "muted" : "sound"} /><span>{muted ? "Sound off" : "Sound on"}</span></button>
        <button type="button" aria-label="Like unavailable" disabled title="Likes require a connected social backend"><SocialIcon name="like" /><span>Like</span></button>
        <Link aria-label="Open comments" href={`/posts/${post.id}/comments`}><SocialIcon name="comment" /><span>Comment</span></Link>
        <button type="button" aria-label="Save unavailable" disabled title="Saving requires a connected account"><SocialIcon name="saved" /><span>Save</span></button>
        <button type="button" aria-label="Copy reel link" onClick={() => {
          if (!navigator.clipboard?.writeText) {
            setShareMessage("Link sharing is not available in this browser.");
            return;
          }
          void navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`)
            .then(() => setShareMessage("Link copied"))
            .catch(() => setShareMessage("Unable to copy link."));
        }}><SocialIcon name="share" /><span>Share</span></button>
      </div>
      {shareMessage && <p className="reel-stage__share-status" role="status">{shareMessage}</p>}
    </article>
  );
}

function ProfileHeader({ user }: { user: SocialUser }) {
  const hasStats = user.followers !== undefined || user.following !== undefined || user.vehicles !== undefined;
  return (
    <section className="social-profile-header">
      <div className="social-profile-header__identity">
        <UserAvatar user={user} size="large" />
        <div className="social-profile-header__copy">
          <p className="social-eyebrow">@{user.username}</p>
          <h1>{user.displayName}{user.verified && <span className="social-verified"> ✓</span>}</h1>
          <p>{user.bio}</p>
          {(user.location || user.joinedAt) && <small>{[user.location, user.joinedAt && `Joined ${user.joinedAt}`].filter(Boolean).join(" · ")}</small>}
        </div>
        <div className="social-profile-header__actions"><FollowAction /><button className="social-outline-button" disabled title="Messaging is not connected">Message</button></div>
      </div>
      {hasStats && <div className="social-profile-stats">
        {user.followers !== undefined && <Link href={`/profile/${user.username}/followers`}><strong>{user.followers}</strong> Followers</Link>}
        {user.following !== undefined && <Link href={`/profile/${user.username}/following`}><strong>{user.following}</strong> Following</Link>}
        {user.vehicles !== undefined && <Link href={`/profile/${user.username}/garage`}><strong>{user.vehicles}</strong> Garage</Link>}
      </div>}
    </section>
  );
}

function CreatePost() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  function chooseFiles(fileList: FileList | null) {
    if (!fileList) return;
    const selected = Array.from(fileList);
    const valid = selected.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    if (valid.length !== selected.length) {
      setUploadError("Only image and video files are supported.");
      return;
    }
    if (valid.some((file) => file.size > 50 * 1024 * 1024)) {
      setUploadError("Each image or video must be 50 MB or smaller.");
      return;
    }
    if (valid.length > 10) {
      setUploadError("Choose no more than 10 files.");
      return;
    }
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const urls = valid.map((file) => URL.createObjectURL(file));
    urlsRef.current = urls;
    setPreviewUrls(urls);
    setFiles(valid);
    setUploadError("");
  }
  return (
    <form className="social-create-form" onSubmit={(event) => event.preventDefault()}>
      <FixtureNotice />
      <label className="social-field"><span>Caption</span><textarea rows={5} value={caption} maxLength={2200} onChange={(event) => setCaption(event.currentTarget.value)} placeholder="Share the story behind the machine…" /></label>
      <div className="social-create-options">
        <label className="social-field"><span>Associated vehicle</span><input disabled placeholder="Vehicle catalogue is not connected" /></label>
        <label className="social-field"><span>Location (optional)</span><input placeholder="Add a location" /></label>
        <label className="social-field"><span>Visibility</span><select defaultValue="public"><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label>
      </div>
      <input ref={inputRef} className="social-visually-hidden" type="file" accept="image/*,video/*" multiple onChange={(event) => chooseFiles(event.currentTarget.files)} />
      <button className="social-outline-button" type="button" onClick={() => inputRef.current?.click()}>Add photos or video</button>
      <p className="social-muted">Up to 10 files · Images and videos up to 50 MB each. Files remain local; nothing is uploaded.</p>
      {uploadError && <p className="social-form-error" role="alert">{uploadError}</p>}
      {previewUrls.length > 0 && <div className="social-upload-preview">{previewUrls.map((url, index) => files[index]?.type.startsWith("video/") ? <video key={url} src={url} controls /> : <Image key={url} src={url} alt={`Local upload preview ${index + 1}`} width={320} height={220} unoptimized />)}</div>}
      <label className="social-field"><span>Hashtags</span><input placeholder="#carculture #automotive" /></label>
      <button className="social-outline-button" type="button" disabled title="Publishing requires a connected social backend">Publish</button>
    </form>
  );
}

function SearchExperience({ fixtures }: { fixtures: SocialFixtures | null }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const terms = query.trim().toLowerCase();
  const users = fixtures?.users.filter((user) => `${user.username} ${user.displayName} ${user.bio}`.toLowerCase().includes(terms)) ?? [];
  const posts = fixtures?.posts.filter((post) => `${post.caption} ${post.vehicle ?? ""} ${post.hashtags?.join(" ") ?? ""}`.toLowerCase().includes(terms)) ?? [];
  const visibleUsers = filter === "all" || filter === "users" ? users : [];
  const visiblePosts = (filter === "all" || filter === "posts" || filter === "reels")
    ? posts.filter((post) => filter !== "reels" || post.media.some((media) => media.type === "video"))
    : [];
  const hasResults = visibleUsers.length > 0 || visiblePosts.length > 0;
  return (
    <>
      <label className="social-search"><span>Search SHIFT</span><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="People and community posts…" /></label>
      <div className="social-tabs" aria-label="Search results">
        {["all", "users", "posts", "reels"].map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      {!terms ? <EmptyState eyebrow="EXPLORE SHIFT" title="What are you looking for?" description="Search community profiles and posts. Discover verified manufacturers and vehicles in the catalogue." href="/discover" action="Explore SHIFT" /> : (
        <>
          {visibleUsers.map((user) => <article className="social-user-row" key={user.username}><Link className="social-user" href={`/profile/${user.username}`}><UserAvatar user={user} /><span><strong>{user.displayName}</strong><small>@{user.username}</small></span></Link></article>)}
          {visiblePosts.map((post) => <PostCard post={post} key={post.id} />)}
          {!hasResults && <EmptyState eyebrow="NO RESULTS" title="Nothing found." description="Try another search or result type. Production search requires connected SHIFT community and catalogue services." />}
        </>
      )}
    </>
  );
}

function SettingsNavigation({ active }: { active: SocialPageKind }) {
  const tabs = [
    ["Profile", "/settings/profile"],
    ["Account", "/settings/account"],
    ["Privacy", "/settings/privacy"],
    ["Notifications", "/settings/notifications"],
  ];
  return (
    <div className="social-settings-layout">
      <nav className="social-settings-nav" aria-label="Settings">
        {tabs.map(([label, href]) => <Link aria-current={href.endsWith(`/${active.replace("settings-", "")}`) || (active === "settings" && href.endsWith("/profile")) ? "page" : undefined} href={href} key={href}>{label}</Link>)}
      </nav>
      <section className="social-settings-panel">
        <p className="social-eyebrow">{titles[active].toUpperCase()}</p>
        <h2>{active === "settings" ? "Profile settings" : `${titles[active]} settings`}</h2>
        <p className="social-muted">Settings are preview-only until account and privacy services are connected.</p>
        {(active === "settings" || active === "settings-profile") && <><label className="social-field"><span>Display name</span><input disabled placeholder="Sign in to edit your profile" /></label><label className="social-field"><span>Biography</span><textarea disabled rows={3} placeholder="Profile editing unavailable" /></label><button className="social-outline-button" disabled>Save changes unavailable</button></>}
        {active === "settings-account" && <p className="social-muted">Email, password, security, and account deletion require authenticated account services.</p>}
        {active === "settings-privacy" && <p className="social-muted">Profile visibility, blocked accounts, and liked-content privacy require an account service.</p>}
        {active === "settings-notifications" && <p className="social-muted">Notification preferences require the SHIFT notification service.</p>}
      </section>
    </div>
  );
}

export default function SocialExperience({ kind, fixtures, username = "shift-editorial", slug }: Props) {
  const user = fixtures?.users.find((item) => item.username === username);
  const posts = fixtures?.posts ?? EMPTY_POSTS;
  const selectedPost = slug ? posts.find((post) => post.id === slug) : posts[0];
  const isFixture = Boolean(fixtures);
  const postsForProfile = useMemo(() => posts.filter((post) => post.author.username === username), [posts, username]);
  const title = kind === "profile" && user ? user.displayName : titles[kind];

  let content;
  if (!fixtures && kind !== "create" && kind !== "search" && kind !== "settings") {
    content = <EmptyState eyebrow="SOCIAL SERVICE OFFLINE" title="SHIFT social data is not connected." description="This interface is ready for the social API, but the project has no account, post, messaging, or community backend. No content or actions are being simulated." />;
  } else switch (kind) {
    case "community":
      content = (
        <div className="social-feed-layout">
          <section className="social-feed">
            {isFixture && <FixtureNotice />}
            {posts.length ? posts.map((post) => <PostCard post={post} key={post.id} />) : <EmptyState eyebrow="COMMUNITY" title="Your feed is ready." description="Posts will appear once SHIFT community data is connected." href="/create" action="Create a post" />}
          </section>
          <aside className="social-context"><p className="social-eyebrow">DISCOVER</p><Link href="/discover/brands">Explore manufacturers ↗</Link><p className="social-eyebrow">CREATORS</p>{fixtures?.users.map((item) => <Link className="social-context-user" href={`/profile/${item.username}`} key={item.username}><UserAvatar user={item} size="small" />{item.displayName}</Link>)}</aside>
        </div>
      );
      break;
    case "profile":
    case "profile-reels":
    case "garage":
      content = user ? (
        <>
          {isFixture && <FixtureNotice />}
          <ProfileHeader user={user} />
          <ProfileTabs username={username} active={kind === "garage" ? "garage" : kind === "profile-reels" ? "reels" : "posts"} />
          {kind === "garage" ? <EmptyState eyebrow="PERSONAL GARAGE" title="No vehicles in this garage." description="Garage records require an authenticated account and verified vehicle catalogue." href="/discover/brands" action="Discover manufacturers" /> : kind === "profile-reels" ? <EmptyState eyebrow="PROFILE REELS" title="No reels in this profile." description="Verified creator videos will appear here when media records are connected." href="/reels" action="Explore SHIFT Reels" /> : postsForProfile.length ? postsForProfile.map((post) => <PostCard post={post} key={post.id} />) : <EmptyState eyebrow="PROFILE" title="No posts yet." description="This profile's posts will appear here when available." />}
        </>
      ) : <EmptyState eyebrow="PROFILE" title="Profile unavailable." description="No matching SHIFT profile is available." />;
      break;
    case "followers":
    case "following":
      content = user ? <><FixtureNotice /><ProfileHeader user={user} /><ProfileTabs username={username} active={kind} /><EmptyState eyebrow="COMMUNITY" title={`No ${kind} records available.`} description="This preview contains no relationship records. Connect the account service to search and browse verified lists." /></> : <EmptyState eyebrow="COMMUNITY" title="No relationship records available." description="Connect the account service to search and browse verified lists." />;
      break;
    case "create":
      content = <CreatePost />;
      break;
    case "reels": {
      const reel = posts.find((post) => post.media.some((media) => media.type === "video"));
      content = reel ? <ReelStage post={reel} /> : <EmptyState eyebrow="SHIFT REELS" title="No reels available." description="Connect the media catalogue to discover automotive video." />;
      break;
    }
    case "post":
    case "comments":
      content = selectedPost ? <><FixtureNotice /><PostCard post={selectedPost} detailed /><section className="social-comments"><h2>Comments</h2><EmptyState eyebrow="COMMENTS" title="No comments are connected." description="Comment threads and replies require the social backend." /><label className="social-field"><span>Write a comment</span><input disabled placeholder="Sign in and connect comments to reply" /></label></section></> : <EmptyState eyebrow="POST" title="Post not found." description="This post is not available in the current data source." />;
      break;
    case "saved":
      content = <EmptyState eyebrow="YOUR LIBRARY" title="Saved items appear here." description="Saving posts, reels, and vehicles requires an authenticated account service." href="/discover/brands" action="Browse manufacturers" />;
      break;
    case "liked":
      content = <EmptyState eyebrow="PRIVATE ACTIVITY" title="Liked content is private." description="The liked-content view is available only to the account owner after authentication is connected." />;
      break;
    case "collections":
    case "collection":
      content = <><FixtureNotice /><EmptyState eyebrow="CURATED FOR YOU" title={kind === "collection" ? "Collection not found." : "Create your first collection."} description="Collections and saved items are private account data. SHIFT is not connected to a collection service yet." href="/discover/brands" action="Explore manufacturers" /></>;
      break;
    case "notifications":
      content = <EmptyState eyebrow="ACTIVITY" title="You’re all caught up." description="Follower, comment, and platform notifications will appear here when the notification service is connected." />;
      break;
    case "search":
      content = <SearchExperience fixtures={fixtures} />;
      break;
    case "messages":
      content = <div className="social-messages-layout"><section className="social-message-list"><label className="social-search"><span>Search conversations</span><input disabled placeholder="Conversations unavailable" /></label><EmptyState eyebrow="INBOX" title="No conversations." description="Your inbox will appear when messaging is connected." /></section><section className="social-message-panel"><EmptyState eyebrow="DIRECT MESSAGES" title="Choose a conversation." description="No messages are loaded. Messaging and real-time delivery are not connected." /></section></div>;
      break;
    case "settings":
    case "settings-profile":
    case "settings-account":
    case "settings-privacy":
    case "settings-notifications":
      content = <SettingsNavigation active={kind} />;
      break;
    default:
      content = <EmptyState eyebrow="SHIFT" title="This section is not available." description="Connect the relevant SHIFT service to continue." />;
  }

  return (
    <div className={`social-app${kind === "reels" ? " social-app--reels" : ""}`}>
      <SocialNavigation active={kind} />
      <main className={`social-main${kind === "reels" ? " social-main--reels" : ""}`} id="main-content">
        <header className={`social-page-heading${kind === "reels" ? " social-page-heading--reels" : ""}`}>
          <p className="social-eyebrow">{kind === "reels" ? "SHIFT / MOTION" : "SHIFT / COMMUNITY"}</p>
          <h1>{kind === "reels" ? "Reels" : title}</h1>
          {kind === "reels" && <div className="social-reels-heading-actions">{isFixture && <span className="social-fixture-note">PREVIEW · NOT SAVED</span>}<Link className="social-reels-exit" href="/community">COMMUNITY</Link></div>}
        </header>
        {content}
      </main>
      {kind !== "reels" && <nav className="social-mobile-nav" aria-label="Mobile social navigation">
        {navigation.filter(({ label }) => ["Home", "Discover", "Community", "Reels", "Create", "Profile", "Settings"].includes(label)).map(({ label, href, icon }) => <Link href={href} key={href} aria-current={href === getActiveNavigationHref(kind) ? "page" : undefined}><SocialIcon name={icon} /><span>{label}</span></Link>)}
        <Link href="/search" aria-current={kind === "search" ? "page" : undefined}><SocialIcon name="discover" /><span>Search</span></Link>
      </nav>}
    </div>
  );
}
