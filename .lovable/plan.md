## Problem

Avatars uploaded from the React Native app appear squished/stretched in the web app, but render correctly in RN.

## Root cause

`src/components/ui/avatar.tsx` renders `AvatarImage` with:

```tsx
className={cn("aspect-square h-full w-full", className)}
```

The `<img>` element defaults to stretching its content to fill both width and height. There's no `object-fit` rule, so any non-square source image gets squished into the square avatar container.

The React Native app doesn't show this because RN's `<Image>` defaults to a different resize behavior (and the upload preview likely uses `resizeMode="cover"`), so the same source file looks fine there.

The image file itself is fine — only the web-side display is wrong. No re-upload needed.

## Fix

Add `object-cover` to the `AvatarImage` className so non-square images crop to fill instead of stretching:

```tsx
className={cn("aspect-square h-full w-full object-cover", className)}
```

This is a one-line change in `src/components/ui/avatar.tsx`. It will instantly fix:
- The profile page avatar (large)
- The header avatar
- Every other place `UserAvatar` / `AvatarImage` is used

## Optional follow-up (not included unless you want it)

To make uploads consistent across platforms, we could crop avatars to a square on upload (either client-side before upload, or in the existing `generate-thumbnails` edge function). Let me know if you'd like that too.
