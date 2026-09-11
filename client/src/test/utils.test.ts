import { describe, expect, it } from "vitest";
import { formatBytes, groupByPeriod } from "@/lib/utils";

const labels = { today: "Today", yesterday: "Yesterday", week: "Week", month: "Month", older: "Older" };
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe("groupByPeriod", () => {
  it("buckets items by recency and drops empty groups", () => {
    const groups = groupByPeriod(
      [
        { id: "a", lastMessageAt: new Date().toISOString() },
        { id: "b", lastMessageAt: daysAgo(3) },
        { id: "c", lastMessageAt: daysAgo(90) },
      ],
      labels,
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Week", "Older"]);
    expect(groups[1]?.items.map((i) => i.id)).toEqual(["b"]);
  });

  it("returns nothing for an empty list", () => {
    expect(groupByPeriod([], labels)).toEqual([]);
  });
});

describe("formatBytes", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
