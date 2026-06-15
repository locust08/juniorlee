import { writeFile, mkdir } from "node:fs/promises";
import Replicate from "replicate";

const outputDir = new URL("../public/metro/", import.meta.url);
const outputFile = new URL("metro-approval-video.mp4", outputDir);

if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error("REPLICATE_API_TOKEN is required. Run through Doppler or set it in the environment.");
}

await mkdir(outputDir, { recursive: true });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const input = {
  prompt: [
    "Generate an 8-second loopable 16:9 video for the homepage hero of Metro Pinjaman Berlesen.",
    "Create a realistic, premium Malaysian financial service scene: a calm consultation desk, loan documents being reviewed, a phone showing a WhatsApp conversation without readable text, and a subtle green brand accent.",
    "The video must support fast personal and business loan applications, trust, clarity, and bank-transfer approval.",
    "No fake logos, no fake awards, no fake certifications, no fake client logos, no readable claims, no generic stock montage.",
    "Keep subjects centered with safe margins and make the motion smooth enough for a hero lightbox."
  ].join(" "),
  duration: 8,
  resolution: "720p",
  aspect_ratio: "16:9",
};

async function run(model, modelInput = input) {
  const output = await replicate.run(model, { input: modelInput });
  if (output?.url) {
    const response = await fetch(output.url());
    if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
    await writeFile(outputFile, Buffer.from(await response.arrayBuffer()));
    return model;
  }
  if (typeof output === "string") {
    const response = await fetch(output);
    if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
    await writeFile(outputFile, Buffer.from(await response.arrayBuffer()));
    return model;
  }
  throw new Error("Replicate returned an unsupported video output.");
}

try {
  const model = await run("google/veo-3.1-lite");
  console.log(`Generated ${outputFile.pathname} with ${model}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("E003")) throw error;
  console.warn("Primary model reported high demand (E003); retrying once.");
  try {
    const model = await run("google/veo-3.1-lite");
    console.log(`Generated ${outputFile.pathname} with ${model}`);
  } catch {
    const fallback = await run("minimax/hailuo-2.3", {
      ...input,
      duration: 6,
      resolution: "768p",
    });
    console.log(`Generated ${outputFile.pathname} with fallback minimax/hailuo-2.3`);
  }
}
