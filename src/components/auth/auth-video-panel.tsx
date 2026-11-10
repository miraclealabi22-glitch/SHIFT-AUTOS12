"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authMedia } from "./auth-media";
import ShiftLogo from "@/components/brand/shift-logo";

export default function AuthVideoPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeRef = useRef(0.65);
  const [videoFailed, setVideoFailed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const [volume, setVolume] = useState(0.65);

  const stopEngineSound = useCallback(() => {
    if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current);
    soundTimeoutRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSoundEnabled(false);
  }, []);

  const playEngineSound = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current);
    soundTimeoutRef.current = null;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = volumeRef.current;
    try {
      await audio.play();
      setSoundEnabled(true);
      setSoundError(false);
      soundTimeoutRef.current = setTimeout(stopEngineSound, 4000);
    } catch {
      setSoundEnabled(false);
      setSoundError(true);
    }
  }, [stopEngineSound]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !authMedia.videoSrc || !authMedia.posterSrc) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    video.muted = true;

    const updatePlayback = () => {
      if (motionPreference.matches) {
        video.pause();
        stopEngineSound();
      } else {
        void video.play().catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "NotAllowedError")) {
            setVideoFailed(true);
          }
        });
      }
    };

    updatePlayback();
    const soundStartTimeout = window.setTimeout(() => {
      if (!motionPreference.matches) void playEngineSound();
    }, 0);
    motionPreference.addEventListener("change", updatePlayback);

    return () => {
      window.clearTimeout(soundStartTimeout);
      motionPreference.removeEventListener("change", updatePlayback);
      stopEngineSound();
      video.muted = true;
    };
  }, [playEngineSound, stopEngineSound]);

  function changeVolume(value: number) {
    volumeRef.current = value;
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  }

  return (
    <section className="auth-hero" aria-label="SHIFT automotive editorial">
      {authMedia.videoSrc && authMedia.posterSrc && !videoFailed ? (
        <video
          ref={videoRef}
          className="auth-hero__video"
          src={authMedia.videoSrc}
          poster={authMedia.posterSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <div className="auth-hero__fallback" aria-hidden="true" />
      )}

      <div className="auth-hero__header">
        <Link className="auth-brand-link" href="/" aria-label="SHIFT home">
          <ShiftLogo alt="SHIFT home" loading="eager" />
        </Link>
        <div className="auth-hero__actions">
          <p>DISCOVER. EXPERIENCE. SHARE.</p>
          <div className="auth-sound">
            <button
              className="auth-sound__toggle"
              type="button"
              onClick={soundEnabled ? stopEngineSound : playEngineSound}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? "Stop engine sound" : "Play four-second engine sound"}
            >
              {soundEnabled ? "ENGINE ON" : "PLAY ENGINE"}
            </button>
            {soundEnabled && (
              <input
                className="auth-sound__volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(event) => changeVolume(Number(event.currentTarget.value))}
                aria-label="Engine sound volume"
                aria-valuetext={`${Math.round(volume * 100)} percent`}
              />
            )}
            {soundError && <span className="auth-sound__error" role="status">Sound unavailable</span>}
          </div>
          <audio ref={audioRef} src={authMedia.soundSrc} preload="auto" />
        </div>
      </div>

      <div className="auth-hero__editorial">
        <p className="auth-kicker">AUTOMOTIVE CULTURE / 001</p>
        <h2>BUILT TO<br />STAND APART.</h2>
        <p className="auth-hero__subline">A WORLD BEYOND THE ORDINARY.</p>
      </div>
      <span className="auth-hero__vertical" aria-hidden="true">INDEPENDENT AUTOMOTIVE CULTURE</span>
    </section>
  );
}
