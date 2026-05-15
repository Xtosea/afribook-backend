export const calculateEngagementPoints = ({
  likes = 0,
  views = 0,
  replies = 0,
  shares = 0,
}) => {
  return (
    likes * 2 +
    views * 0.1 +
    replies * 3 +
    shares * 5
  );
};