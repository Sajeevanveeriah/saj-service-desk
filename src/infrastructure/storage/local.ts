import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface PrivateStorage {
  put(key: string, content: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}

export class LocalPrivateStorage implements PrivateStorage {
  private readonly root: string;

  constructor(root = process.env.LOCAL_ATTACHMENT_ROOT ?? "runtime/attachments") {
    this.root = resolve(/* turbopackIgnore: true */ process.cwd(), root);
  }

  private targetFor(key: string): string {
    const target = resolve(this.root, key);
    const relative = target.slice(this.root.length);
    if (!relative || (!relative.startsWith("\\") && !relative.startsWith("/")) || relative.includes("..")) {
      throw new Error("Invalid storage key");
    }
    return target;
  }

  async put(key: string, content: Uint8Array): Promise<void> {
    const target = this.targetFor(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx" });
  }

  async get(key: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.targetFor(key)));
  }

  async remove(key: string): Promise<void> {
    await unlink(this.targetFor(key));
  }
}
