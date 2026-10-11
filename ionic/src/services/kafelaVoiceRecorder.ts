import { VoiceRecorder } from 'capacitor-voice-recorder';

export const MAX_VOICE_MS = 60_000;

export type VoiceClip = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  objectUrl: string;
};

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function formatVoiceDuration(ms: number | null | undefined): string {
  if (ms == null || ms < 0 || Number.isNaN(ms)) return '0:00';
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export async function ensureMicPermission(): Promise<boolean> {
  const can = await VoiceRecorder.canDeviceVoiceRecord();
  if (!can.value) return false;
  const has = await VoiceRecorder.hasAudioRecordingPermission();
  if (has.value) return true;
  const requested = await VoiceRecorder.requestAudioRecordingPermission();
  return requested.value;
}

export async function startVoiceRecording(): Promise<void> {
  const ok = await ensureMicPermission();
  if (!ok) throw new Error('Microphone permission is required to record a voice message');
  await VoiceRecorder.startRecording();
}

export async function stopVoiceRecording(): Promise<VoiceClip> {
  const result = await VoiceRecorder.stopRecording();
  const { recordDataBase64, mimeType, msDuration } = result.value;
  if (!recordDataBase64) throw new Error('Recording was empty');
  const type = (mimeType || 'audio/mp4').split(';')[0];
  const blob = base64ToBlob(recordDataBase64, type);
  const durationMs = Math.min(MAX_VOICE_MS, Math.max(0, msDuration || 0));
  return {
    blob,
    mimeType: type,
    durationMs,
    objectUrl: URL.createObjectURL(blob),
  };
}

export async function cancelVoiceRecording(): Promise<void> {
  try {
    const status = await VoiceRecorder.getCurrentStatus();
    if (status.status === 'RECORDING' || status.status === 'PAUSED') {
      await VoiceRecorder.stopRecording();
    }
  } catch {
    // ignore — nothing to cancel
  }
}

export function revokeVoiceClip(clip: VoiceClip | null | undefined): void {
  if (clip?.objectUrl) URL.revokeObjectURL(clip.objectUrl);
}
