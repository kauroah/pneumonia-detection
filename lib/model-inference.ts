// lib/model-inference.ts
import path from "path";

const isServer = typeof window === "undefined";

type Layout = "NHWC" | "NCHW";

export type InferencePreset = {
  size: number;
  layout: Layout;
  channels: 3 | 1;
  mean: number[]; // length 1 or 3
  std: number[];  // length 1 or 3
};

// ---------- Presets ----------

// Default = TensorFlow/Keras style (your MobileNetV2 export)
export const PRESET_TF_224: InferencePreset = {
  size: 224,
  layout: "NHWC",
  channels: 3,
  mean: [0, 0, 0],
  std: [1, 1, 1],
};

// Optional alternative for PyTorch/ImageNet-style models (e.g. ResNet18)
export const PRESET_IMAGENET_NCHW: InferencePreset = {
  size: 224,
  layout: "NCHW",
  channels: 3,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
};

// ---------- Session cache ----------
let session: any /* ort.InferenceSession */ = null;

function resolveModelPath(modelPath: string) {
  if (isServer) {
    if (modelPath.startsWith("/")) {
      // e.g. "/models/model.onnx" -> "<root>/public/models/model.onnx"
      return path.join(process.cwd(), "public", modelPath.replace(/^\//, ""));
    }
    if (!path.isAbsolute(modelPath)) {
      // relative path from project root
      return path.join(process.cwd(), modelPath);
    }
  }
  return modelPath; // on the client keep as URL
}

export async function initializeModel(modelPath: string) {
  if (session) return session;

  const resolved = resolveModelPath(modelPath);
  try {
    if (isServer) {
      const ort = await import("onnxruntime-node");
      session = await ort.InferenceSession.create(resolved, {
        executionProviders: ["cpu"],
      });
    } else {
      const ort = await import("onnxruntime-web");
      // If you ever serve WASM assets, set: ort.env.wasm.wasmPaths = "/ort/";
      session = await ort.InferenceSession.create(resolved, {
        executionProviders: ["wasm"],
      });
    }
    console.log("ONNX model loaded successfully");
  } catch (err) {
    console.error("Error loading ONNX model:", err);
    throw new Error("Failed to load ONNX model");
  }

  return session;
}

// ---------- Preprocess ----------
async function preprocessImage(
  imageBuffer: Buffer,
  preset: InferencePreset
): Promise<{ floats: Float32Array; shape: number[] }> {
  if (!isServer) throw new Error("preprocessImage runs on server only");

  const sharp = (await import("sharp")).default;
  const H = preset.size;
  const W = preset.size;
  const C = preset.channels;

  // Build Sharp pipeline: ensure 3 channels in sRGB, remove alpha, resize
  let pipeline: any = sharp(imageBuffer).removeAlpha().resize(W, H, {
    fit: "cover",
    position: "center",
  });

  // Sharp has British spelling historically; support both methods:
  const toColorspace = (cs: string) => {
    if (typeof pipeline.toColorspace === "function") return pipeline.toColorspace(cs);
    if (typeof pipeline.toColourspace === "function") return pipeline.toColourspace(cs);
    return pipeline; // fallback: do nothing
  };

  if (C === 3) {
    // Force sRGB (NOT "rgb") to avoid libvips error
    pipeline = toColorspace("srgb");
  } else {
    // If you *really* need single channel models, use b-w/grey
    // pipeline = toColorspace("b-w");
    // But most CNNs expect 3ch; keeping "srgb" is fine for x-rays (3 identical channels).
    pipeline = toColorspace("srgb");
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  // info.channels should be 3 now
  const inChannels = info.channels;

  if (inChannels !== 3 && C === 3) {
    // Defensive: expand to 3 channels manually if needed
    const expanded = new Uint8Array(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      const v = data[i]; // assume 1ch input
      expanded[i * 3 + 0] = v;
      expanded[i * 3 + 1] = v;
      expanded[i * 3 + 2] = v;
    }
    return hwcToTensor(expanded, H, W, preset);
  }

  return hwcToTensor(data, H, W, preset);
}

function hwcToTensor(
  hwcU8: Uint8Array,
  H: number,
  W: number,
  preset: InferencePreset
): { floats: Float32Array; shape: number[] } {
  const C = preset.channels;
  const floats =
    preset.layout === "NCHW"
      ? new Float32Array(1 * C * H * W)
      : new Float32Array(1 * H * W * C);

  const mean = normalizeMean(preset.mean, C);
  const std = normalizeStd(preset.std, C);

  if (preset.layout === "NCHW") {
    // CHW order
    for (let i = 0; i < H * W; i++) {
      const r = hwcU8[i * 3 + 0] / 255;
      const g = hwcU8[i * 3 + 1] / 255;
      const b = hwcU8[i * 3 + 2] / 255;
      floats[0 * H * W + i] = (r - mean[0]) / std[0];
      floats[1 * H * W + i] = (g - mean[1]) / std[1];
      floats[2 * H * W + i] = (b - mean[2]) / std[2];
    }
    return { floats, shape: [1, C, H, W] };
  } else {
    // HWC order
    for (let i = 0; i < H * W; i++) {
      const base = i * 3;
      const r = hwcU8[base + 0] / 255;
      const g = hwcU8[base + 1] / 255;
      const b = hwcU8[base + 2] / 255;
      const o = i * C;
      floats[o + 0] = (r - mean[0]) / std[0];
      floats[o + 1] = (g - mean[1]) / std[1];
      floats[o + 2] = (b - mean[2]) / std[2];
    }
    return { floats, shape: [1, H, W, C] };
  }
}

function normalizeMean(mean: number[], C: number): [number, number, number] {
  if (C === 1) return [mean[0] ?? 0, mean[0] ?? 0, mean[0] ?? 0];
  return [mean[0] ?? 0, mean[1] ?? mean[0] ?? 0, mean[2] ?? mean[1] ?? mean[0] ?? 0];
}
function normalizeStd(std: number[], C: number): [number, number, number] {
  if (C === 1) return [std[0] ?? 1, std[0] ?? 1, std[0] ?? 1];
  return [std[0] ?? 1, std[1] ?? std[0] ?? 1, std[2] ?? std[1] ?? std[0] ?? 1];
}

// ---------- Postprocess ----------
function toProbabilities(arr: number[]): number[] {
  if (arr.length === 1) {
    // Already sigmoid in Keras -> value is in [0,1], else apply sigmoid.
    const v = arr[0];
    const p = v >= 0 && v <= 1 ? v : 1 / (1 + Math.exp(-v));
    // Map to 2-class probs: [NORMAL, PNEUMONIA]
    return [1 - p, p];
  }

  const all01 = arr.every((x) => x >= 0 && x <= 1);
  const sum = arr.reduce((a, b) => a + b, 0);
  if (all01 && Math.abs(sum - 1) < 1e-3) return arr;

  // softmax
  const max = Math.max(...arr);
  const exps = arr.map((x) => Math.exp(x - max));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / s);
}

// ---------- Inference ----------
export async function runInference(
  imageBuffer: Buffer,
  modelPath: string,
  preset: InferencePreset = PRESET_TF_224 // default to your Keras MobileNetV2
): Promise<{ diagnosis: "PNEUMONIA" | "NORMAL"; confidence: number; probabilities: number[] }> {
  try {
    const modelSession = await initializeModel(modelPath);

    // Choose input tensor name
    const inputName: string = modelSession.inputNames?.[0];
    if (!inputName) throw new Error("No input name found in ONNX model session.");

    // If metadata available, try to auto-verify layout (optional)
    const meta = (modelSession as any).inputMetadata?.[inputName];
    const dims: number[] | undefined = meta?.dimensions;

    let effective = { ...preset };
    if (Array.isArray(dims) && dims.length === 4) {
      // Try to guess layout by positions of 3 (channels) and 224/size
      const d0 = dims[0]; // batch or -1
      const d1 = dims[1];
      const d2 = dims[2];
      const d3 = dims[3];
      if (d1 === 3) effective.layout = "NCHW";
      if (d3 === 3) effective.layout = "NHWC";
      // If size is explicit, pick it up
      if (d2 === d3 && d2 > 0) effective.size = d2;
    }

    // Preprocess
    const { floats, shape } = await preprocessImage(imageBuffer, effective);

    // Build tensor
    const ort = isServer ? await import("onnxruntime-node") : await import("onnxruntime-web");
    const tensor = new (ort as any).Tensor("float32", floats, shape);

    // Run
    const outputName: string = modelSession.outputNames?.[0];
    if (!outputName) throw new Error("No output name found in ONNX model session.");
    const results = await modelSession.run({ [inputName]: tensor });
    const outTensor = results[outputName];
    const outData: number[] = Array.from(outTensor.data as Float32Array | number[]);

    const probabilities = toProbabilities(outData);
    // Assuming binary: index 1 = PNEUMONIA (matches your class_indices)
    const pneumoniaProb = (probabilities[1] ?? 0) * 100;
    const diagnosis: "PNEUMONIA" | "NORMAL" = pneumoniaProb > 60 ? "PNEUMONIA" : "NORMAL";
    const confidence = pneumoniaProb > 60 ? pneumoniaProb : 100 - pneumoniaProb;

    return { diagnosis, confidence, probabilities };
  } catch (err) {
    console.error("Error during inference:", err);
    throw new Error("Failed to run model inference");
  }
}

// ---------- PDFs ----------
export async function convertPdfToImage(_pdfBuffer: Buffer): Promise<Buffer> {
  // Not implemented yet. If needed later, we can add pdf-poppler or pdf-lib + canvas.
  throw new Error("PDF conversion not yet implemented. Please use PNG or JPEG images.");
}
