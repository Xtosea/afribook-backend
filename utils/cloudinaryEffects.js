export const getEffectUrl = (
  imageUrl,
  effect
) => {
  switch (effect) {
    case "enhance":
      return imageUrl.replace(
        "/upload/",
        "/upload/e_improve/"
      );

    case "beauty":
      return imageUrl.replace(
        "/upload/",
        "/upload/e_improve,e_brightness:20/"
      );

    case "afroglow":
      return imageUrl.replace(
        "/upload/",
        "/upload/e_brightness:30,e_saturation:40/"
      );

    case "naijavibes":
      return imageUrl.replace(
        "/upload/",
        "/upload/e_vibrance:100/"
      );

    case "festival":
      return imageUrl.replace(
        "/upload/",
        "/upload/e_saturation:80/"
      );

    case "studio":
      return imageUrl.replace(
        "/upload/",
        "/upload/e_contrast:50/"
      );

    case "goldenhour":
      return imageUrl.replace(
        "/upload/",
        "/upload/e_sepia/"
      );

    default:
      return imageUrl;
  }
};