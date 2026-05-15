export const fraudCheck = ({
  duration,
  ip,
  userAgent,
}) => {

  // too fast
  if (duration < 3) {
    return false;
  }

  // suspicious bots
  if (
    userAgent.includes(
      "bot"
    )
  ) {
    return false;
  }

  return true;
};