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

// Rejects anything that isn't an https Telegram link — a typo'd env var must
// never ship as a live outbound link.
withEnv("http://t.me/storyofastock", () => assert.equal(getTelegramJoinUrl(), null));
withEnv("https://example.com/t.me", () => assert.equal(getTelegramJoinUrl(), null));
withEnv("t.me/storyofastock", () => assert.equal(getTelegramJoinUrl(), null));
withEnv("javascript:alert(1)", () => assert.equal(getTelegramJoinUrl(), null));

console.log("community-url: ok");
