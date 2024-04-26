import ffmpeg from "fluent-ffmpeg";
import utils from "../utils/utils";

import {
  VideoCombinePayload,
  VideoUtilityFunctions,
} from "../interfaces/utils.interface";
import { VideoResolution } from "../interfaces/metadata.interface";
import { CombineVideoItem } from "../interfaces/video.interface";
import metadata from "../src/metadata";

async function standardizeVideo(
  values: VideoResolution,
  showBlur: boolean,
  tmpFilePath: string,
  finalResolution: string
): Promise<string> {
  const { src } = values;
  const finalWidth = finalResolution.split("x")[0];
  const finalHeight = finalResolution.split("x")[1];

  const response: string = await new Promise((resolve) => {
    let finalOrientation: string = "";
    if (finalHeight > finalWidth) finalOrientation = "portrait";
    else finalOrientation = "landscape";
    const isPortrait = finalOrientation === "portrait";

    const sourceVideoOrientation = values.orientation;
    const sourceIsPortrait = sourceVideoOrientation === "portrait";

    // Scale Options
    const scalePortrait = `[0:v]scale=-1:ih*9/16`;
    const scaleLandscape = `[0:v]scale=ih*16/9:-1`;
    let scale = isPortrait ? scalePortrait : scaleLandscape;
    if (!sourceIsPortrait) scale = `[0:v]scale=${finalWidth}:-2`;

    // Background Options
    const pboxblur = `boxblur=luma_radius=min(h\\,w)/20`;
    const lumapower = `luma_power=1`;
    const chromaradius = `chroma_radius=min(cw\\,ch)/20`;
    const hchromapower = `chroma_power=1[bg]`;

    const portraitblur = `${pboxblur}:${lumapower}:${chromaradius}:${hchromapower}`;
    const portraitblack = `drawbox=c=black:t=fill[bg]`;
    const portraitBackground = showBlur ? portraitblur : portraitblack;

    const horizontalblur = `${pboxblur}:${lumapower}:${chromaradius}:${hchromapower}`;
    const horizontalblack = `pad=${finalWidth}:${finalHeight}:(ow-iw)/2:(oh-ih)/2:black`;
    const horizontalBackground = horizontalblack; // showBlur ? horizontalblur : horizontalblack;

    const background = sourceIsPortrait
      ? portraitBackground
      : horizontalBackground;

    // Overlay Options
    const horizontaloverlay = `[bg][0:v]overlay=(W-w)/2:(H-h)/2`;
    const verticaloverlay = `[bg][0:v]overlay=(W-w)/2:(H-h)/2`;
    const overlay = sourceIsPortrait ? verticaloverlay : horizontaloverlay;

    // Crop Options
    const cropPortrait = `crop=w=ih*9/16:h=ih,scale=${finalWidth}:${finalHeight}`;
    const cropLandscape = `crop=h=iw*9/16,scale=${finalWidth}:${finalHeight}`;
    const crop = isPortrait ? cropPortrait : cropLandscape;

    // Combine Options
    const standard = `${scale},${background}`;
    const overlayCrop = sourceIsPortrait
      ? `${overlay},${crop}`
      : showBlur
        ? "" // `${overlay},${crop}` // BUG! show blur + landscape to horizontal
        : "";
    const options = `${standard};${overlayCrop}`;

    console.log({ message: "Set Standardization FFMPEG Options", options });

    ffmpeg(src)
      .inputOptions(["-lavfi", options])
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => resolve(tmpFilePath))
      .on("error", (err) => {
        utils.logError(err);
        resolve("");
      })
      .save(tmpFilePath);
  });

  const hasError = response === "";
  if (hasError) return "";

  return response;
}

async function formatVideosToStandard(
  outputResolution: string,
  videos: CombineVideoItem[]
) {
  // // 1. Make sure files are the desired resolution
  const outputVideos: CombineVideoItem[] = [];

  for (const x of videos) {
    const { index, video, showBlur } = x;

    const videoData = await metadata.returnVideoResolution(video);
    const { resolution } = videoData;

    const videoIsOutputResolution = resolution === outputResolution;

    if (!videoIsOutputResolution) {
      const warn = `Video is not the same resolution. Updating ${index}`;
      console.warn({ message: warn });

      const videoName = video.split("/").pop() || "";
      const videoExt = videoName.split(".").pop() || "";
      const filename = videoName.replace(`.${videoExt}`, "");
      const tmpFilePath: string = `../tmp/${filename}.mp4`;

      await VideoUtils.standardizeVideo(
        videoData,
        showBlur,
        tmpFilePath,
        outputResolution
      );

      outputVideos.push({ index, video: tmpFilePath, showBlur });
      const output = `Video ${index} filepath updated: ${tmpFilePath}`;
      console.log({ message: output });
    } else {
      outputVideos.push({ index, video, showBlur });
    }
  }

  return outputVideos;
}

async function combineVideos(values: VideoCombinePayload): Promise<string> {
  const { videos, endFilePath, tmpDir } = values;

  const command = ffmpeg();
  videos.forEach((x: CombineVideoItem) => command.input(x.video));

  const response = await new Promise((resolve) => {
    command
      .videoCodec("libx264")
      .audioCodec("aac")
      .on("progress", ({ percent }) => utils.logProgress(percent / 2))
      .on("end", (e, stdout, stderr) => {
        console.log({ message: "End Combining two MP4's" });
        resolve("Complete");
      })
      .on("error", (e, stdout, stderr) => {
        utils.logError(e);
        resolve("");
      })
      .mergeToFile(endFilePath, tmpDir); // Merge and save to the output file
  });

  const hasError = response === "";
  if (hasError) return "";
  return endFilePath;
}

const VideoUtils: VideoUtilityFunctions = {
  standardizeVideo,
  formatVideosToStandard,
  combineVideos,
};

export default VideoUtils;
