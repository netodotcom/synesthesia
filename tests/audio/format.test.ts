import { describe, it, expect } from "vitest";
import { formatTime, progressPercent } from "@/audio/format";

describe("formatTime", () => {
  it("formats seconds as m:ss with zero-padding", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(3599)).toBe("59:59");
  });

  it("clamps invalid input to 0:00", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
  });
});

describe("progressPercent", () => {
  it("returns the percentage of current over duration", () => {
    expect(progressPercent(5, 10)).toBe(50);
    expect(progressPercent(0, 10)).toBe(0);
  });

  it("clamps to 0..100 and guards division by zero", () => {
    expect(progressPercent(20, 10)).toBe(100);
    expect(progressPercent(5, 0)).toBe(0);
    expect(progressPercent(5, NaN)).toBe(0);
  });
});
