import { describe, it, expect } from "vitest";
import { AudioGraph } from "@/audio/AudioGraph";

/** Nó de áudio fake que conta conexões/desconexões. */
class FakeNode {
  connections: unknown[] = [];
  disconnectCount = 0;
  connect(target: unknown) {
    this.connections.push(target);
  }
  disconnect() {
    this.disconnectCount++;
    this.connections = [];
  }
}

class FakeAnalyser extends FakeNode {
  fftSize = 2048;
  smoothingTimeConstant = 0.8;
  get frequencyBinCount() {
    return this.fftSize / 2;
  }
  getByteFrequencyData(_arr: Uint8Array) {
    // silêncio: deixa zeros
  }
}

class FakeContext {
  sampleRate = 44100;
  state: "running" | "closed" = "running";
  destination = new FakeNode();
  analyser = new FakeAnalyser();
  fileNode = new FakeNode();
  micNode = new FakeNode();
  createAnalyser() {
    return this.analyser;
  }
  createMediaElementSource() {
    return this.fileNode;
  }
  createMediaStreamSource() {
    return this.micNode;
  }
  async resume() {}
  async close() {
    this.state = "closed";
  }
}

const fakeStream = () => ({ getTracks: () => [] }) as unknown as MediaStream;
const newGraph = (fake: FakeContext) =>
  new AudioGraph({ createContext: () => fake as unknown as AudioContext });

describe("AudioGraph", () => {
  it("connects a file source and reports it active", async () => {
    const fake = new FakeContext();
    const graph = newGraph(fake);
    await graph.connectFile({} as HTMLAudioElement);
    expect(graph.activeSource).toBe("file");
  });

  it("disconnects the previous source when switching file → mic", async () => {
    const fake = new FakeContext();
    const graph = newGraph(fake);
    await graph.connectFile({} as HTMLAudioElement);
    const before = fake.fileNode.disconnectCount;

    await graph.connectMic(fakeStream());

    expect(graph.activeSource).toBe("mic");
    expect(fake.fileNode.disconnectCount).toBeGreaterThan(before);
  });

  it("does not route the mic to the destination (no feedback)", async () => {
    const fake = new FakeContext();
    const graph = newGraph(fake);
    await graph.connectMic(fakeStream());
    // analyser nunca foi conectado ao destino enquanto em modo mic
    expect(fake.analyser.connections).not.toContain(fake.destination);
  });

  it("routes the file through analyser → destination (audible)", async () => {
    const fake = new FakeContext();
    const graph = newGraph(fake);
    await graph.connectFile({} as HTMLAudioElement);
    expect(fake.analyser.connections).toContain(fake.destination);
  });

  it("sample() returns a normalized frame sized to the bin count", async () => {
    const fake = new FakeContext();
    const graph = newGraph(fake);
    await graph.connectFile({} as HTMLAudioElement);

    const frame = graph.sample();
    expect(frame).not.toBeNull();
    expect(frame!.frequency.length).toBe(1024);
    expect(frame!.bands.sub).toBe(0); // silêncio
    expect(frame!.beat).toBe(false);
  });

  it("returns null from sample() before any source is connected", () => {
    const graph = newGraph(new FakeContext());
    expect(graph.sample()).toBeNull();
  });

  it("dispose() closes the context and clears the active source", async () => {
    const fake = new FakeContext();
    const graph = newGraph(fake);
    await graph.connectFile({} as HTMLAudioElement);
    graph.dispose();
    expect(fake.state).toBe("closed");
    expect(graph.activeSource).toBeNull();
  });
});
