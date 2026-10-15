import React, { useState } from 'react';
import { ExternalLink, Video, AlertCircle } from 'lucide-react';

interface MediaVideoPlayerProps {
  url: string;
  title: string;
  thumbnailUrl?: string | null;
  className?: string;
}

/**
 * Extracts the 11-character YouTube video ID from various standard YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 */
export function extractYouTubeId(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    // youtube.com, m.youtube.com, youtube-nocookie.com
    if (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube-nocookie.com')
    ) {
      // ?v=VIDEO_ID
      const v = parsed.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) {
        return v;
      }
      // /embed/VIDEO_ID, /shorts/VIDEO_ID, /v/VIDEO_ID
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'v') {
        const id = parts[1];
        if (id && /^[\w-]{11}$/.test(id)) {
          return id;
        }
      }
    }
  } catch {
    // Regex fallback for non-standard or protocol-relative inputs
    const match = trimmed.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/i
    );
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Detects public Facebook video URLs
 */
export function isFacebookVideoUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'facebook.com' ||
      host.endsWith('.facebook.com') ||
      host === 'fb.watch' ||
      host === 'fb.com' ||
      host.endsWith('.fb.com')
    );
  } catch {
    return /(?:facebook\.com|fb\.watch)/i.test(rawUrl);
  }
}

/**
 * Detects direct video formats (mp4, webm, ogg, mov)
 */
export function isDirectVideoUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    const pathname = parsed.pathname.toLowerCase();
    return /\.(mp4|webm|ogg|ogv|mov)($|\?)/i.test(pathname);
  } catch {
    return /\.(mp4|webm|ogg|ogv|mov)($|\?)/i.test(rawUrl);
  }
}

/**
 * Helper to check whether any given URL is an identifiable video source
 */
export function isVideoSourceUrl(rawUrl: string): boolean {
  return !!extractYouTubeId(rawUrl) || isFacebookVideoUrl(rawUrl) || isDirectVideoUrl(rawUrl);
}

export const MediaVideoPlayer: React.FC<MediaVideoPlayerProps> = ({
  url,
  title,
  thumbnailUrl,
  className = '',
}) => {
  const [videoError, setVideoError] = useState(false);

  const cleanUrl = (url || '').trim();
  const youtubeId = extractYouTubeId(cleanUrl);
  const isFacebook = !youtubeId && isFacebookVideoUrl(cleanUrl);
  const isDirect = !youtubeId && !isFacebook && isDirectVideoUrl(cleanUrl);

  // 1. YouTube Player (16:9, youtube-nocookie.com, responsive iframe)
  if (youtubeId) {
    return (
      <div className={`relative w-full aspect-video bg-black overflow-hidden ${className}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?controls=1&rel=0`}
          title={title || 'YouTube video player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  // 2. Direct MP4 / WebM Player (native HTML5 <video controls>)
  if (isDirect) {
    if (videoError) {
      return (
        <div
          className={`relative w-full aspect-video bg-slate-900 flex flex-col items-center justify-center p-4 text-center ${className}`}
        >
          <AlertCircle className="w-6 h-6 text-amber-400 mb-2" />
          <p className="text-xs font-semibold text-slate-200">Unable to stream direct video</p>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <span>Open media</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      );
    }

    return (
      <div className={`relative w-full aspect-video bg-black overflow-hidden ${className}`}>
        <video
          controls
          preload="metadata"
          poster={thumbnailUrl || undefined}
          onError={() => setVideoError(true)}
          className="w-full h-full object-contain"
        >
          <source src={cleanUrl} />
          Your browser does not support HTML5 video playback.
        </video>
      </div>
    );
  }

  // 3. Facebook Video - Clean CivicSphere placeholder card (opens original URL externally)
  if (isFacebook) {
    return (
      <div
        className={`relative w-full aspect-video bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center ${className}`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-2 shadow-xs">
          <Video className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold tracking-wide uppercase text-blue-300">
          Facebook Video
        </span>
        <p className="text-xs font-bold text-white mt-0.5 max-w-[220px] truncate">
          {title || 'Community Civic Video'}
        </p>
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors shadow-sm"
        >
          <span>Watch on Facebook</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  // 4. Other URL - Safe External Fallback
  return (
    <div
      className={`relative w-full aspect-video bg-slate-900 flex flex-col items-center justify-center p-4 text-center ${className}`}
    >
      <Video className="w-6 h-6 text-slate-400 mb-2" />
      <p className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
        {title || 'Media Asset'}
      </p>
      <a
        href={cleanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
      >
        <span>Open media</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
};
