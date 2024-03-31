import ffmpeg from "fluent-ffmpeg";
import utils from "../utils/utils";

import {
  VideoCombinePayload,
  VideoUtilityFunctions,
} from "../interfaces/utils.interface";
import { VideoResolution } from "../interfaces/metadata.interface";

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
    console.log({ sourceIsPortrait, isPortrait });

    // Working

    const scalePortrait = `[0:v]scale=-1:ih*9/16`;
    const scaleLandscape = `[0:v]scale=ih*16/9:-1`;
    let scale = isPortrait ? scalePortrait : scaleLandscape;
    if (!sourceIsPortrait) scale = `[0:v]scale=1080:-2`;

    const cropPortrait = `crop=w=ih*9/16:h=ih,scale=${finalWidth}:${finalHeight}`;
    const cropLandscape = `crop=h=iw*9/16,scale=${finalWidth}:${finalHeight}`;
    const crop = isPortrait ? cropPortrait : cropLandscape;

    // Options
    const boxblur = `boxblur=luma_radius=min(h\\,w)/20`;
    const lumapower = `luma_power=1`;
    const chromaradius = `chroma_radius=min(cw\\,ch)/20`;
    const chromapower = `chroma_power=1[bg]`;
    const bg = `[bg][0:v]overlay=(W-w)/2:(H-h)/2`;
    const bgvideoblur = `${boxblur}:${lumapower}:${chromaradius}:${chromapower}`;
    const bgvideoblack = `drawbox=c=black:t=fill[bg]`;
    const verticalblack = `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black'`;

    const sourceLandscapeOptions = `${scale},${verticalblack}`;
    const sourcePortraitOptions = `${scale},${showBlur ? bgvideoblur : bgvideoblack};${bg},${crop}`;
    const options = sourceIsPortrait
      ? sourcePortraitOptions
      : sourceLandscapeOptions;

    console.log({ options });

    // Example:
    // const Scale = `[0:v]scale=ih*16/9:-1`
    // const Blur = `boxblur=luma_radius=min(h\\,w)/20:luma_power=1:chroma_radius=min(cw\\,ch)/20:chroma_power=1[bg]`
    // const Crop = `crop=h=iw*9/16`
    // const Background = `[bg][0:v]overlay=(W-w)/2:(H-h)/2,`
    // const exampleOptions = `${Scale},${Blur};${Background},${Crop}`;

    ffmpeg(src)
      .inputOptions(["-lavfi", options])
      .on("progress", ({ percent }) => utils.logProgress(percent / 2)) // divide by 2 because there's 2 videos, idk
      .on("end", () => resolve(tmpFilePath))
      .on("error", (err) => {
        utils.logError(err);
        resolve("");
      })
      .save(tmpFilePath);
  });

  const hasError = response === "";
  if (hasError) return "";

  console.log({ message: "End Standardizing MP4" });
  return response;
}

async function combineVideos(values: VideoCombinePayload): Promise<string> {
  const { video1, video2, endFilePath, tmpDir } = values;

  const response = await new Promise((resolve) => {
    ffmpeg()
      .input(video1)
      .input(video2)
      .videoCodec("libx264")
      .audioCodec("libmp3lame")
      .on("progress", ({ percent }) => utils.logProgress(percent / 2)) // divide by 2 because there's 2 videos, idk
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
  combineVideos,
};

export default VideoUtils;
