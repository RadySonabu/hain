import * as FileSystem from "expo-file-system/legacy";

const MODEL_FILENAME = "smollm2-360m-instruct-q4_k_m.gguf";
const MODEL_URL =
  "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q4_k_m.gguf";

function modelUri(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("Document directory is not available on this platform.");
  }
  return FileSystem.documentDirectory + MODEL_FILENAME;
}

/**
 * Returns true if the model file is already present on disk.
 */
export async function isModelDownloaded(): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(modelUri());
    return info.exists && info.size !== undefined && info.size > 0;
  } catch {
    return false;
  }
}

/**
 * Downloads the SmolLM2 360M GGUF to the document directory.
 * Fires onProgress with 0–100 as bytes land.
 * Returns the file:// URI of the downloaded model.
 */
export async function downloadModel(
  onProgress: (pct: number) => void
): Promise<string> {
  const dest = modelUri();

  // Delete any partial/corrupt file before starting
  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    MODEL_URL,
    dest,
    {},
    (progress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
      if (totalBytesExpectedToWrite > 0) {
        const pct = Math.round(
          (totalBytesWritten / totalBytesExpectedToWrite) * 100
        );
        onProgress(Math.min(pct, 99)); // hold at 99 until fully confirmed
      }
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) throw new Error("Download failed — no URI returned.");

  // Confirm the file actually landed
  const info = await FileSystem.getInfoAsync(result.uri);
  if (!info.exists || !info.size || info.size < 1024) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error("Downloaded file appears corrupt or empty.");
  }

  onProgress(100);
  return result.uri; // file:// URI
}

/**
 * Returns the file:// URI of the model if it is present, or null if not yet
 * downloaded.  llama.rn accepts file:// URIs and strips the prefix internally.
 */
export async function getModelPath(): Promise<string | null> {
  const downloaded = await isModelDownloaded();
  return downloaded ? modelUri() : null;
}
