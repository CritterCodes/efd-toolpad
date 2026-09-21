'use client';
/**
 * Mic button for the smart-intake sentence. Tap to dictate, tap again to stop. Each finished
 * phrase is appended to the sentence through `onTranscript`; `onStatus` reports
 * { listening, interim, error, endedByUser } so the form can show the live phrase and, when the
 * jeweler stops it deliberately, run the analysis for them.
 *
 * Renders nothing where the browser has no speech recognition (Firefox, insecure origins).
 */
import React, { useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Mic as MicIcon, Stop as StopIcon } from '@mui/icons-material';
import useSpeechDictation from '@/hooks/useSpeechDictation';

export default function SmartIntakeMic({ onTranscript, onStatus, size = 44, sx }) {
  const dictation = useSpeechDictation({
    onFinal: (text) => onTranscript?.(text),
    onEnd: ({ byUser }) => onStatus?.({ listening: false, interim: '', error: '', endedByUser: byUser }),
  });
  const { supported, listening, interim, error, toggle } = dictation;

  useEffect(() => {
    onStatus?.({ listening, interim, error, endedByUser: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, interim, error]);

  if (!supported) return null;

  return (
    <Tooltip title={listening ? 'Stop dictating' : 'Dictate the sentence'}>
      <IconButton
        onClick={toggle}
        aria-label={listening ? 'Stop dictating' : 'Dictate the sentence'}
        aria-pressed={listening}
        sx={{
          width: size,
          height: size,
          color: listening ? '#0F1115' : 'inherit',
          backgroundColor: listening ? '#FBBF24' : 'transparent',
          border: '1px solid',
          borderColor: listening ? '#FBBF24' : 'rgba(255,255,255,0.14)',
          '&:hover': { backgroundColor: listening ? '#F59E0B' : 'rgba(255,255,255,0.08)' },
          '@keyframes intakeMicPulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(251,191,36,0.55)' },
            '100%': { boxShadow: '0 0 0 12px rgba(251,191,36,0)' },
          },
          animation: listening ? 'intakeMicPulse 1.2s ease-out infinite' : 'none',
          ...sx,
        }}
      >
        {listening ? <StopIcon fontSize="small" /> : <MicIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
