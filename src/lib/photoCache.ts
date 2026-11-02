// How the service worker keeps the app's own photos on the device.
//
// Every photo reaches the page as a signed Storage URL, and a new signature
// (a new ?token=) is minted on every render. To the browser each visit is
// a different URL, so the same photo was downloaded again on every page
// view. The file behind a path never changes, though: uploads get a fresh
// timestamped name and are never overwritten. So the cache key is the URL
// without its query string, and a photo already on the device is served
// from there whatever token the page carries this time.
//
// Only the private "coffee-photos" bucket, which holds nothing but the
// signed-in account's own photos (public pages show none). The cache is
// cleared with the rest on sign-out (see clearDeviceData).

export const PHOTO_CACHE_NAME = "coffee-photos";

const SIGNED_PHOTO_PATH = "/storage/v1/object/sign/coffee-photos/";

export function isSignedPhotoUrl(url: URL): boolean {
  return url.pathname.startsWith(SIGNED_PHOTO_PATH);
}

/** The photo's URL with the signature dropped: the same for every token. */
export function photoCacheKey(url: string): string {
  const key = new URL(url);
  key.search = "";
  return key.href;
}
