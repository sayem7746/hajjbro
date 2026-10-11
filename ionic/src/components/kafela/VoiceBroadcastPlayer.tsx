import React, { useEffect, useRef, useState } from 'react';
import { IonSpinner } from '@ionic/react';
import { Pause, Play } from 'lucide-react';
import { kafelaApi } from '../../services/kafelaApi';
import { formatVoiceDuration } from '../../services/kafelaVoiceRecorder';

type Props = {
  kafelaId: string;
  broadcastId: string;
  durationMs?: number | null;
  compact?: boolean;
};

const VoiceBroadcastPlayer: React.FC<Props> = ({
  kafelaId,
  broadcastId,
  durationMs,
  compact = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const ensureAudio = async () => {
    if (audioRef.current) return audioRef.current;
    setLoading(true);
    setError(null);
    try {
      const blob = await kafelaApi.fetchBroadcastAudioBlob(kafelaId, broadcastId);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.addEventListener('ended', () => {
        setPlaying(false);
        setElapsedMs(0);
      });
      audio.addEventListener('timeupdate', () => {
        setElapsedMs(Math.round(audio.currentTime * 1000));
      });
      audio.addEventListener('pause', () => setPlaying(false));
      audio.addEventListener('play', () => setPlaying(true));
      return audio;
    } catch {
      setError('Could not load voice message');
      throw new Error('load failed');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    try {
      const audio = await ensureAudio();
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      // error already set
    }
  };

  const labelMs = playing || elapsedMs > 0 ? elapsedMs : durationMs ?? 0;

  return (
    <div
      className={`flex items-center gap-2 ${compact ? '' : 'mt-2 rounded-xl bg-stitch-surface-low px-3 py-2'}`}
    >
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={loading}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stitch-primary text-white disabled:opacity-50"
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
      >
        {loading ? (
          <IonSpinner name="crescent" className="h-4 w-4" />
        ) : playing ? (
          <Pause size={16} />
        ) : (
          <Play size={16} className="ml-0.5" />
        )}
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stitch-primary">Voice message</p>
        <p className="text-xs text-stitch-on-variant">{formatVoiceDuration(labelMs)}</p>
        {error && <p className="text-xs font-medium text-red-700">{error}</p>}
      </div>
    </div>
  );
};

export default VoiceBroadcastPlayer;
