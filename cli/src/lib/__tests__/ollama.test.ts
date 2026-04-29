import { describe, test, expect } from "bun:test";
import { describeImage, suggestTags } from "../ollama";

async function withMockServer(
  handler: (req: Request) => Response | Promise<Response>,
  fn: (url: string) => Promise<void>
): Promise<void> {
  const server = Bun.serve({ port: 0, fetch: handler });
  try {
    await fn(`http://localhost:${server.port}`);
  } finally {
    server.stop();
  }
}

// Minimal valid 1x1 JPEG
const TINY_JPEG = new Uint8Array([
  0xff,0xd8,0xff,0xe0,0,0x10,0x4a,0x46,0x49,0x46,0,1,1,0,0,1,0,1,0,0,
  0xff,0xdb,0,0x43,0,8,6,6,7,6,5,8,7,7,7,9,9,8,0xa,0xc,0x14,0xd,0xc,
  0xb,0xb,0xc,0x19,0x12,0x13,0xf,0x14,0x1d,0x1a,0x1f,0x1e,0x1d,0x1a,
  0x1c,0x1c,0x20,0x24,0x2e,0x27,0x20,0x22,0x2c,0x23,0x1c,0x1c,0x28,
  0x37,0x29,0x2c,0x30,0x31,0x34,0x34,0x34,0x1f,0x27,0x39,0x3d,0x38,
  0x32,0x3c,0x2e,0x33,0x34,0x32,0xff,0xc0,0,0xb,8,0,1,0,1,1,1,0x11,0,
  0xff,0xc4,0,0x1f,0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,
  8,9,0xa,0xb,0xff,0xda,0,8,1,1,0,0,0x3f,0,0xfb,0x26,0xa3,0xff,0xd9,
]);

describe("describeImage", () => {
  test("sends image as base64 and returns response content", async () => {
    await withMockServer(
      async (req) => {
        const body = await req.json() as any;
        expect(body.model).toBe("test-model");
        expect(typeof body.messages[0].images[0]).toBe("string");
        return Response.json({ message: { content: "A sunny park with trees." } });
      },
      async (url) => {
        const tmpPath = "/tmp/test-ollama-img.jpg";
        await Bun.write(tmpPath, TINY_JPEG);
        const result = await describeImage(tmpPath, url, "test-model");
        expect(result).toBe("A sunny park with trees.");
      }
    );
  });
});

describe("suggestTags", () => {
  test("parses JSON array response and filters to known tags", async () => {
    const taxonomy = ["london", "landscape", "travel", "nature", "food"];
    await withMockServer(
      async (req) => {
        const body = await req.json() as any;
        expect(body.messages[0].content).toContain("london");
        return Response.json({ message: { content: '["london", "landscape", "unknown-hallucinated-tag", "food"]' } });
      },
      async (url) => {
        const tags = await suggestTags("Green fields and the Thames.", taxonomy, url, "test-model");
        expect(tags).toEqual(["london", "landscape", "food"]);
      }
    );
  });

  test("handles response wrapped in markdown code block", async () => {
    const taxonomy = ["london", "landscape"];
    await withMockServer(
      async () => Response.json({ message: { content: '```json\n["london","landscape"]\n```' } }),
      async (url) => {
        const tags = await suggestTags("desc", taxonomy, url, "test-model");
        expect(tags).toEqual(["london", "landscape"]);
      }
    );
  });
});
