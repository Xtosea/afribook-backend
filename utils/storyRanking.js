export const getStoryScore = (story) => {
  const reactions = story.reactions?.length || 0;
  const replies = story.replies?.length || 0;
  const shares = story.shares || 0;
  const views = story.viewsCount || 0;

  const engagementScore =
    reactions * 1 +
    replies * 2 +
    shares * 3;

  // recency boost (new posts get advantage)
  const age = Date.now() - new Date(story.createdAt);
  const recencyBoost = 1 / (age / 10000000);

  return engagementScore + views * 0.1 + recencyBoost;
};