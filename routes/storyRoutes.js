import React, {
  useState,
  useEffect,
} from "react";

import StoryCard from "./StoryCard";
import StoryViewer from "./StoryViewer";

import { API_BASE } from "../../api/api";

const StoryBar = () => {

  const [selectedStory, setSelectedStory] =
    useState(null);

  const [viewedStories, setViewedStories] =
    useState([]);

  const [activeStories, setActiveStories] =
    useState([]);

  // FETCH STORIES
  useEffect(() => {

    const fetchStories =
      async () => {

        try {

          const token =
            localStorage.getItem(
              "token"
            );

          const res =
            await fetch(
              `${API_BASE}/api/stories`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const data =
            await res.json();

          console.log(
            "Stories:",
            data
          );

          // ✅ FIX
          setActiveStories(
            data.stories || []
          );

        } catch (err) {

          console.error(
            "Fetch stories error:",
            err
          );
        }
      };

    fetchStories();

  }, []);

  // OPEN STORY
  const openStory = (story) => {

    setSelectedStory(story);

    if (
      !viewedStories.includes(
        story._id
      )
    ) {
      setViewedStories((prev) => [
        ...prev,
        story._id,
      ]);
    }
  };

  // LIKE STORY
  const handleLike = async (
    story
  ) => {

    try {

      const token =
        localStorage.getItem(
          "token"
        );

      const res = await fetch(
        `${API_BASE}/api/stories/like/${story._id}`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data =
        await res.json();

      console.log(
        "Liked:",
        data
      );

    } catch (err) {

      console.error(
        "Like story error:",
        err
      );
    }
  };

  // SHARE STORY
  const handleShare = async (
    story
  ) => {

    try {

      if (navigator.share) {

        await navigator.share({
          title: "Story",
          url:
            story.media?.[0]?.url,
        });

      } else {

        await navigator.clipboard.writeText(
          story.media?.[0]?.url
        );

        alert("Link copied");

      }

    } catch (err) {

      if (
        err.name !==
        "AbortError"
      ) {

        console.error(
          "Share error:",
          err
        );
      }
    }
  };

  return (
    <>

      <div
        className="
          flex
          gap-4
          overflow-x-auto
          py-3
          px-2
          scrollbar-hide
        "
      >

        {activeStories.map(
          (story) => (

            <StoryCard
              key={story._id}
              story={story}
              viewed={viewedStories.includes(
                story._id
              )}
              onOpen={openStory}
            />

          )
        )}

      </div>

      {selectedStory && (
        <StoryViewer
          story={selectedStory}
          onClose={() =>
            setSelectedStory(null)
          }
          onLike={handleLike}
          onShare={handleShare}
        />
      )}

    </>
  );
};

export default StoryBar;