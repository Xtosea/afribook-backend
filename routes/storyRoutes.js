import { useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

export function useStoryUpload() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadStory = async ({
    file = null,
    text = "",
    music = null,
    stickers = [],
    backgroundColor = "#000000",
  }) => {
    try {
      setLoading(true);
      setProgress(0);
      setError(null);

      let media = [];

      // =========================
      // UPLOAD FILE IF PRESENT
      // =========================
      if (file instanceof File) {
        const token = localStorage.getItem("token");

        const signedRes = await fetch(
          `${API_BASE}/api/r2/upload-url`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileType: file.type,
            }),
          }
        );

        const signedData = await signedRes.json();

        if (
          !signedData?.uploadUrl ||
          !signedData?.fileUrl
        ) {
          throw new Error(
            "Invalid signed URL response"
          );
        }

        await axios.put(
          signedData.uploadUrl,
          file,
          {
            headers: {
              "Content-Type": file.type,
            },

            onUploadProgress: (event) => {
              const percent = Math.round(
                (event.loaded * 100) /
                  (event.total || 1)
              );

              setProgress(percent);
            },
          }
        );

        media = [
          {
            url: signedData.fileUrl,
            type:
              file.type?.startsWith("video/")
                ? "video"
                : "image",
          },
        ];
      }

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/stories`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            media,
            text,
            music,
            stickers,
            backgroundColor,
          }),
        }
      );

      const story = await res.json();

      if (!res.ok) {
        throw new Error(
          story.error ||
            "Failed to create story"
        );
      }

      return story;
    } catch (err) {
      console.error(
        "Story Upload Error:",
        err
      );

      setError(err.message);

      throw err;
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return {
    uploadStory,
    loading,
    progress,
    error,
  };
}