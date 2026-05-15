export const calculateFeedScore =
({
  reel,
  user,
}) => {

  let score = 0;

  // VIRALITY
  score +=
    reel.likes.length * 2;

  score +=
    reel.shares * 3;

  score +=
    reel.comments.length * 2;

  score +=
    reel.views.length;

  // USER INTEREST MATCH
  if (
    user.interests.includes(
      reel.category
    )
  ) {
    score += 50;
  }

  // WATCH RETENTION
  score +=
    reel.watchTime / 100;

  // VIRAL BOOST
  if (reel.viral) {
    score += 100;
  }

  return score;
};