import { get, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function localFile(name: string) {
  return path.join(process.cwd(), "data", name);
}

export async function loadJson(name: string): Promise<unknown | null> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const result = await get(name, { access: "private", useCache: false });
      if (!result?.stream) return null;
      return JSON.parse(await new Response(result.stream).text()) as unknown;
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(await readFile(localFile(name), "utf8")) as unknown;
  } catch {
    return null;
  }
}

export async function savePrivateBytes(name: string, bytes: Uint8Array, contentType: string): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(name, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return;
  }
  const file = localFile(name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

export async function saveJson(name: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(name, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }
  const file = localFile(name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
}
