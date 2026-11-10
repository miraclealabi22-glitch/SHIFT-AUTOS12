"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { getCloudinaryDeliveryUrl, SHIFT_MEDIA_ASSETS } from "@/lib/cloudinary/config";

const heroImageUrl = getCloudinaryDeliveryUrl(SHIFT_MEDIA_ASSETS.landingHero);

export default function CinematicHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const kickerRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      gsap.set([kickerRef.current, titleRef.current, copyRef.current, ctaRef.current], { autoAlpha: 1, y: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        ".cinematic-hero__image",
        { autoAlpha: 0, scale: 1.04 },
        { autoAlpha: 1, scale: 1, duration: 1.2, ease: "power2.out" }
      );
      gsap.fromTo(
        [kickerRef.current, titleRef.current, copyRef.current, ctaRef.current],
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power2.out" }
      );
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section className="cinematic-hero" ref={sectionRef} aria-labelledby="cinematic-title">
      <div className="cinematic-hero__image-wrap" aria-hidden="true">
        {heroImageUrl && (
          <Image
            className="cinematic-hero__image"
            src={heroImageUrl}
            alt=""
            fill
            priority
            quality={100}
            sizes="100vw"
            unoptimized
          />
        )}
      </div>
      <div className="cinematic-hero__shade" aria-hidden="true" />
      <div className="cinematic-hero__index" aria-hidden="true">
        <span>FORM IN MOTION</span>
      </div>
      <div className="cinematic-hero__content">
        <p className="cinematic-hero__kicker" ref={kickerRef}>SHIFT / AUTOMOTIVE CULTURE</p>
        <h1 id="cinematic-title" ref={titleRef}>
          <span className="cinematic-hero__line"><span className="cinematic-hero__word">BEYOND</span></span>
          <span className="cinematic-hero__line cinematic-hero__line--second"><span className="cinematic-hero__word">THE MACHINE.</span></span>
        </h1>
        <div className="cinematic-hero__copy" ref={copyRef}>
          <p>An elevated destination for extraordinary machines, groundbreaking engineering and the culture of automotive performance. Discover the world&apos;s most remarkable vehicles, the stories behind their creation and the people who live for them.</p>
          <p className="cinematic-hero__microcopy">FROM HYPERCARS TO ICONIC AUTOMOTIVE LEGENDS.</p>
          <Link className="cinematic-hero__cta" href="/login" ref={ctaRef}>
            <span>EXPLORE SHIFT</span><span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <div className="cinematic-hero__meta">
        <span>DISCOVER. EXPERIENCE. SHARE.</span>
        <Link className="cinematic-hero__scroll" href="#brand">
          <span>SCROLL TO EXPLORE</span><span aria-hidden="true">↓</span>
        </Link>
      </div>
    </section>
  );
}
