import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import utils from "../utils/utils";
import { SplitVideo, VideoFunctions } from "../interfaces/video.interface";
import metadata from "../src/metadata";

import {
  VideoCombinePayload,
  VideoUtilityFunctions,
} from "../interfaces/utils.interface";
import { VideoResolution } from "../interfaces/metadata.interface";

async function standardizeVideo(
  values: VideoResolution,
  tmpFilePath: string,
  finalResolution: string
): Promise<string> {
  const { src, height, width, resolution, orientation } = values;
  const finalWidth = finalResolution.split("x")[0];
  const finalHeight = finalResolution.split("x")[1];

  const response: string = await new Promise((resolve) => {
    ffmpeg(src)
      .inputOptions([
        "-lavfi",
        "[0:v]scale=ih*16/9:-1,boxblur=luma_radius=min(h\\,w)/20:luma_power=1:chroma_radius=min(cw\\,ch)/20:chroma_power=1[bg];[bg][0:v]overlay=(W-w)/2:(H-h)/2,crop=h=iw*9/16",
      ])
      //.output("output.mp4")
      .on("progress", ({ percent }) => utils.logProgress(percent / 2)) // divide by 2 because there's 2 videos, idk
      .on("end", () => resolve(tmpFilePath))
      .on("error", (err) => {
        utils.logError(err);
        resolve("");
      })
      //.run();
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
