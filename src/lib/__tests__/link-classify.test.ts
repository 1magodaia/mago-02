import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyLink,
  normalizeUrl,
  isRealSite,
  getClassifyMetrics,
  resetClassifyMetrics,
} from "../link-classify";

describe("classifyLink", () => {
  describe("Instagram", () => {
    it("classifies bare instagram.com/handle as instagram", () => {
      const r = classifyLink("https://instagram.com/pizzariabella");
      expect(r.kind).toBe("instagram");
      expect(r.host).toBe("instagram.com");
    });
    it("classifies www.instagram.com as instagram", () => {
      expect(classifyLink("https://www.instagram.com/foo").kind).toBe("instagram");
    });
    it("classifies subdomains like m.instagram.com as instagram", () => {
      expect(classifyLink("https://m.instagram.com/foo").kind).toBe("instagram");
    });
    it("classifies instagr.am short link as instagram", () => {
      expect(classifyLink("https://instagr.am/foo").kind).toBe("instagram");
    });
  });

  describe("Facebook", () => {
    it("classifies facebook.com as facebook", () => {
      expect(classifyLink("https://facebook.com/page").kind).toBe("facebook");
    });
    it("classifies m.facebook.com as facebook", () => {
      expect(classifyLink("https://m.facebook.com/page").kind).toBe("facebook");
    });
    it("classifies fb.me short link as facebook", () => {
      expect(classifyLink("https://fb.me/abc").kind).toBe("facebook");
    });
  });

  describe("Real sites", () => {
    it("classifies plain company sites as site", () => {
      expect(classifyLink("https://pizzariabella.com.br").kind).toBe("site");
    });
    it("classifies subdomain sites as site", () => {
      expect(classifyLink("https://loja.pizzariabella.com.br").kind).toBe("site");
    });
    it("does NOT classify random .com as instagram/facebook", () => {
      expect(classifyLink("https://instagramtips.example.com").kind).toBe("site");
      expect(classifyLink("https://facebookclone.dev").kind).toBe("site");
    });
  });

  describe("Empty / invalid", () => {
    it("returns other for null/undefined/empty", () => {
      expect(classifyLink(null).kind).toBe("other");
      expect(classifyLink(undefined).kind).toBe("other");
      expect(classifyLink("").kind).toBe("other");
      expect(classifyLink("   ").kind).toBe("other");
    });
    it("returns other for non-http schemes", () => {
      expect(classifyLink("mailto:foo@bar.com").kind).toBe("other");
      expect(classifyLink("tel:+5511999999999").kind).toBe("other");
      expect(classifyLink("javascript:alert(1)").kind).toBe("other");
    });
  });
});

describe("normalizeUrl — fallback for incomplete / tracking / redirects", () => {
  it("adds https:// when scheme missing", () => {
    expect(normalizeUrl("instagram.com/foo")?.toString()).toBe("https://instagram.com/foo");
    expect(normalizeUrl("www.foo.com")?.toString()).toBe("https://www.foo.com/");
  });

  it("unwraps facebook redirector l.facebook.com/l.php?u=…", () => {
    const wrapped = "https://l.facebook.com/l.php?u=https%3A%2F%2Fpizzariabella.com.br%2F&h=abc";
    const n = normalizeUrl(wrapped);
    expect(n?.hostname).toBe("pizzariabella.com.br");
  });

  it("unwraps instagram redirector l.instagram.com/?u=…", () => {
    const wrapped = "https://l.instagram.com/?u=https%3A%2F%2Freal-site.com%2Fmenu";
    const n = normalizeUrl(wrapped);
    expect(n?.hostname).toBe("real-site.com");
    expect(n?.pathname).toBe("/menu");
  });

  it("unwraps google.com/url?q=… search out-links", () => {
    const wrapped = "https://www.google.com/url?q=https%3A%2F%2Fpizzariabella.com.br&sa=U";
    const n = normalizeUrl(wrapped);
    expect(n?.hostname).toBe("pizzariabella.com.br");
  });

  it("strips utm_* / fbclid / gclid / igshid tracking params", () => {
    const dirty = "https://foo.com/menu?utm_source=ig&utm_medium=bio&fbclid=xyz&gclid=abc&keep=1&igshid=zz";
    const n = normalizeUrl(dirty);
    expect(n?.searchParams.get("keep")).toBe("1");
    expect(n?.searchParams.get("utm_source")).toBeNull();
    expect(n?.searchParams.get("fbclid")).toBeNull();
    expect(n?.searchParams.get("gclid")).toBeNull();
    expect(n?.searchParams.get("igshid")).toBeNull();
  });

  it("classifies via redirector: FB link wrapping instagram is Instagram", () => {
    const wrapped = "https://l.facebook.com/l.php?u=https%3A%2F%2Finstagram.com%2Fpizzariabella";
    expect(classifyLink(wrapped).kind).toBe("instagram");
  });

  it("classifies via redirector: google wrapping a real site is site", () => {
    const wrapped = "https://www.google.com/url?q=https%3A%2F%2Fpizzariabella.com.br%2F";
    expect(classifyLink(wrapped).kind).toBe("site");
  });

  it("stops after 3 redirect hops (safety)", () => {
    // Auto-referente não deve travar.
    const loop = "https://l.facebook.com/l.php?u=" + encodeURIComponent("https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com");
    const n = normalizeUrl(loop);
    expect(n?.hostname).toBe("example.com");
  });
});

describe("isRealSite", () => {
  it("is true only for real sites, not socials", () => {
    expect(isRealSite("https://pizzariabella.com.br")).toBe(true);
    expect(isRealSite("https://instagram.com/foo")).toBe(false);
    expect(isRealSite("https://facebook.com/foo")).toBe(false);
    expect(isRealSite(null)).toBe(false);
  });
});

describe("confidence + metrics", () => {
  beforeEach(() => resetClassifyMetrics());

  it("marks direct URLs as confirmed", () => {
    const r = classifyLink("https://pizzariabella.com.br");
    expect(r.confidence).toBe("confirmed");
    expect(r.wasUnwrapped).toBe(false);
  });

  it("marks unwrapped redirector URLs as inferred", () => {
    const r = classifyLink("https://l.facebook.com/l.php?u=https%3A%2F%2Fpizzariabella.com.br%2F");
    expect(r.confidence).toBe("inferred");
    expect(r.wasUnwrapped).toBe(true);
  });

  it("flags tracking removal on hadTracking", () => {
    const r = classifyLink("https://foo.com/x?utm_source=ig&fbclid=abc");
    expect(r.hadTracking).toBe(true);
    expect(r.confidence).toBe("confirmed");
  });

  it("returns unknown confidence for empty/invalid", () => {
    expect(classifyLink("").confidence).toBe("unknown");
    expect(classifyLink("mailto:x@y.com").confidence).toBe("unknown");
  });

  it("accumulates metrics per classification", () => {
    classifyLink("https://instagram.com/foo");
    classifyLink("https://pizzariabella.com.br");
    classifyLink("https://l.facebook.com/l.php?u=https%3A%2F%2Freal.com");
    classifyLink("https://foo.com/?utm_source=ig");
    const m = getClassifyMetrics();
    expect(m.total).toBe(4);
    expect(m.byKind.instagram).toBe(1);
    expect(m.byKind.site).toBe(3);
    expect(m.redirectsUnwrapped).toBe(1);
    expect(m.trackingStripped).toBe(1);
    expect(m.byConfidence.confirmed).toBe(3);
    expect(m.byConfidence.inferred).toBe(1);
  });
});
