"use client";

import { ChangeEvent, useState } from "react";

type AvatarInputProps = {
  initialValue: string | null;
};

export function AvatarInput({ initialValue }: AvatarInputProps) {
  const [preview, setPreview] = useState(initialValue ?? "");

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setPreview(result);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="avatarData" value={preview} />
      <label className="field-label" htmlFor="avatar-file">
        Profile Picture
      </label>
      <div className="flex items-center gap-4">
        <div className="avatar-shell">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Avatar preview" className="h-full w-full object-cover" src={preview} />
          ) : (
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#6f747a]">No image</span>
          )}
        </div>
        <label className="secondary-button cursor-pointer" htmlFor="avatar-file">
          Upload
        </label>
        <input
          accept="image/*"
          className="hidden"
          id="avatar-file"
          name="avatar-file"
          onChange={onFileChange}
          type="file"
        />
      </div>
    </div>
  );
}
