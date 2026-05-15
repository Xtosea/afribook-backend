export const predictViral =
(
  reel
) => {

  const likes =
    reel.likes.length;

  const shares =
    reel.shares;

  const comments =
    reel.comments.length;

  const views =
    reel.views.length;

  const engagementRate =
    (
      likes +
      shares +
      comments
    ) / Math.max(views, 1);

  // VIRAL THRESHOLD
  if (
    engagementRate > 0.25
  ) {
    reel.viral = true;

    reel.viralScore =
      engagementRate * 1000;
  }

  return reel;
};