export const moderateContent =
(
  caption
) => {

  const bannedWords = [
    "scam",
    "hack",
    "fraud",
  ];

  return !bannedWords.some(
    (word) =>
      caption
        .toLowerCase()
        .includes(word)
  );
};