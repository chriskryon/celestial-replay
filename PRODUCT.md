# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who want a personal, focused way to replay one video or sequence a small set of videos repeatedly.

## Product Purpose

Celestial Replay is a personal video replay player. It lets anyone play a supported video URL repeatedly, while signed-in users can keep playlists and a private playback history across devices.

## Positioning

The product separates instant playback from persistence: replay is available immediately, while playlists and history become durable only after sign-in.

## Operating Context

Visitors paste video URLs for single-video repetition or compose a sequence with a repetition count per item. Authenticated visitors return to their saved playlists and history.

## Capabilities and Constraints

- Next.js provides the user interface and server backend, deployed to Vercel.
- Neon Postgres stores application data.
- Neon Auth provides Google and email/password sign-in.
- Playlists and history are private to each authenticated user.
- Anonymous playback must remain available and must not persist account data.
- Supported video playback depends on the capabilities and policies of the linked media provider.

## Brand Commitments

The name is Celestial Replay. The interface must retain a celestial liquid-glass character while keeping playback controls clear and practical.

## Evidence on Hand

Existing prototype routes demonstrate single replay, multi-video replay, locally saved stacks, and local playback history. Existing visual assets include `public/bg.jpg`, `public/logo.png`, and `components/Starfield.tsx`.

## Product Principles

- Start playing before asking for an account.
- Make saving a clear benefit of signing in, not a barrier to playback.
- Keep private listening and viewing data private by default.
- Treat media-provider limitations as visible, recoverable states.

