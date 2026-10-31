"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { name: string; progress: number; status: "queued" | "uploading" | "processing" | "done" | "error"; error?: string };

const CONCURRENCY = 3;

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Storage returned ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });
}

export default function PhotoUploader({ galleryId }: { galleryId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);

  const patch = (i: number, p: Partial<Item>) => setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, ...p } : it)));

  async function uploadOne(file: File, i: number) {
    try {
      patch(i, { status: "uploading" });
      const reg = await fetch(`/api/galleries/${galleryId}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const body = await reg.json();
      if (!reg.ok) throw new Error(body.error ?? "Could not start upload");
      await putWithProgress(body.uploadUrl, file, (progress) => patch(i, { progress }));
      patch(i, { status: "processing", progress: 100 });
      const done = await fetch(`/api/galleries/${galleryId}/photos/${body.photoId}/complete`, { method: "POST" });
      if (!done.ok) throw new Error((await done.json()).error ?? "Processing failed");
      patch(i, { status: "done" });
    } catch (e) {
      patch(i, { status: "error", error: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function start(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const offset = items.length;
    setItems((cur) => [...cur, ...files.map((f) => ({ name: f.name, progress: 0, status: "queued" as const }))]);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
        while (next < files.length) {
          const n = next++;
          await uploadOne(files[n], offset + n);
        }
      }),
    );
    router.refresh();
  }

  const finished = items.filter((i) => i.status === "done").length;

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); start(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
        className={`cursor-pointer rounded border-2 border-dashed p-8 text-center ${dragging ? "border-black bg-gray-100" : "border-gray-300"}`}
      >
        Drop photos here or click to choose
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => e.target.files && start(e.target.files)} />
      </div>
      {items.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="mb-1 text-gray-600">{finished} of {items.length} uploaded</p>
          <ul className="max-h-40 overflow-auto">
            {items.map((it, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="truncate">{it.name}</span>
                <span className={it.status === "error" ? "text-red-600" : "text-gray-500"}>
                  {it.status === "uploading" ? `${it.progress}%` : it.status === "error" ? it.error : it.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
