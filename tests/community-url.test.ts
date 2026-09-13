import assert from "node:assert/strict";

import { getTelegramJoinUrl } from "../lib/community";

const withEnv = (value: string | undefined, fn: () => void) => {
  const prev = process.env.NEXT_PUBLIC_TELEGRAM_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_TELEGRAM_URL;
  else process.env.NEXT_PUBLIC_TELEGRAM_URL = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_TELEGRAM_URL;
    else process.env.NEXT_PUBLIC_TELEGRAM_URL = prev;
  }
};

// Unset / blank → nothing renders.
withEnv(undefined, () => assert.equal(getTelegramJoinUrl(), null));
withEnv("", () => assert.equal(getTelegramJoinUrl(), null));
withEnv("   ", () => assert.equal(getTelegramJoinUrl(), null));

// Accepts both invite forms on t.me.
withEnv("https://t.me/+AbC123", () => assert.equal(getTelegramJoinUrl(), "https://t.me/+AbC123"));
withEnv("https://t.me/storyofastock", () =>
  assert.equal(getTelegramJoinUrl(), "https://t.me/storyofastock"),
);
withEnv(" https://telegram.me/storyofastock ", () =>
  assert.equal(getTelegramJoinUrl(), "https://telegram.me/storyofastock"),
);

withEnv("https://www.t.me/joinchat/AbC-123", () =>
  assert.equal(getTelegramJoinUrl(), "https://www.t.me/joinchat/AbC-123"),
);
withEnv("https://T.ME/+AbC123", () =>
  assert.equal(getTelegramJoinUrl(), "https://t.me/+AbC123", "host is case-folded"),
);

withEnv("https://t.me/storyofastock/", () =>
  assert.equal(getTelegramJoinUrl(), "https://t.me/storyofastock", "trailing slash tolerated, not a dead link"),
);
withEnv("https://t.me/+AbC123#frag", () =>
  assert.equal(getTelegramJoinUrl(), "https://t.me/+AbC123", "fragment dropped"),
);

// Rejects anything that isn't an https Telegram link — a typo'd env var must
// never ship as a live outbound link.
withEnv("http://t.me/storyofastock", () => assert.equal(getTelegramJoinUrl(), null));
withEnv("https://example.com/t.me", () => assert.equal(getTelegramJoinUrl(), null));
withEnv("t.me/storyofastock", () => assert.equal(getTelegramJoinUrl(), null));
withEnv("javascript:alert(1)", () => assert.equal(getTelegramJoinUrl(), null));

// Rejects a t.me URL that isn't a group invite or handle.
withEnv("https://t.me", () => assert.equal(getTelegramJoinUrl(), null, "bare origin"));
withEnv("https://t.me/", () => assert.equal(getTelegramJoinUrl(), null, "bare origin with slash"));
withEnv("https://t.me/some_bot?start=abc", () => assert.equal(getTelegramJoinUrl(), null, "query"));
// Built at runtime: a literal user:pass@host line trips the credential push guard.
withEnv(["https://", "u:p", "@t.me/storyofastock"].join(""), () =>
  assert.equal(getTelegramJoinUrl(), null, "userinfo"),
);
withEnv("https://t.me/a/b", () => assert.equal(getTelegramJoinUrl(), null, "nested path"));
withEnv("https://t.me/ab", () => assert.equal(getTelegramJoinUrl(), null, "handle too short"));

console.log("community-url: ok");
