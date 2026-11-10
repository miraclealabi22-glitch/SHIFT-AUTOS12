import { getCloudinaryDeliveryUrl, SHIFT_MEDIA_ASSETS } from "@/lib/cloudinary/config";

export const authMedia = {
  videoSrc: getCloudinaryDeliveryUrl(SHIFT_MEDIA_ASSETS.loginBackgroundVideo) ?? "",
  posterSrc: "/media/auth/shift-ferrari-black-studio-poster.webp",
  soundSrc: "/media/auth/shift-ferrari-engine.mp3",
};
