import { describe, expect, it } from "vitest";
import { isSignedPhotoUrl, photoCacheKey } from "@/lib/photoCache";

const signed = (token: string) =>
  `https://abc.supabase.co/storage/v1/object/sign/coffee-photos/user-1/bag-1/1700000000000.jpg?token=${token}`;

describe("photo cache", () => {
  it("gives the same key to two signatures of the same photo", () => {
    expect(photoCacheKey(signed("first"))).toBe(photoCacheKey(signed("second")));
    expect(photoCacheKey(signed("first"))).toBe(
      "https://abc.supabase.co/storage/v1/object/sign/coffee-photos/user-1/bag-1/1700000000000.jpg",
    );
  });

  it("keeps different photos apart", () => {
    expect(photoCacheKey(signed("t"))).not.toBe(photoCacheKey(signed("t").replace("1700000000000", "1700000000001")));
  });

  it("only matches signed URLs of the photo bucket", () => {
    expect(isSignedPhotoUrl(new URL(signed("t")))).toBe(true);
    expect(isSignedPhotoUrl(new URL("https://abc.supabase.co/storage/v1/object/public/coffee-photos/a.jpg"))).toBe(false);
    expect(isSignedPhotoUrl(new URL("https://abc.supabase.co/storage/v1/object/sign/other-bucket/a.jpg?token=t"))).toBe(false);
    expect(isSignedPhotoUrl(new URL("https://abc.supabase.co/rest/v1/coffees"))).toBe(false);
  });
});
