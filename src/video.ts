/*/
 * COMPRESS VIDEO
 * SPLIT VIDEO
 * COMBINE VIDEO
/*/

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import utils from "../utils/utils";
import {
  CombineVideo,
  SplitVideo,
  VideoFunctions,
} from "../interfaces/video.interface";
import metadata from "./metadata";
import { MetadataStreams } from "../interfaces/metadata.interface";
import VideoUtils from "../utils/video";
import { VideoCombinePayload } from "../interfaces/utils.interface";

// ************* COMPRESS VIDEO ************* //

async function compressVideo(src: string): Promise<void> {
  console.log({ message: "Start Compressing MP4" });
  const filename: string = src.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const finalname: string = `${name}-compressed.mp4`;
  const endFilePath: string = `../tmp/${finalname}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(src)
      .videoCodec("libx264")
      .outputOptions([
        "-crf 20", // 0 is lossless, 18 is lossy, 23 is default, 51 is worst quality
        "-c:a copy",
      ])
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => {
        utils.logError(e);
        resolve("");
      })
      .save(endFilePath);
  });

  const hasError = response === "";
  if (hasError) {
    console.error({ message: "Error compressing video." });
    return;
  }

  console.log({ message: "End Compressing MP4" });
  return;
}

// ************* SPLIT VIDEO ************* //

async function splitVideo(vals: SplitVideo): Promise<void> {
  console.log({ message: "Start Splitting MP4" });
  const { src, startTime, endTime } = vals;
  const filename = src.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const outputfile1: string = `${name}-split-part.mp4`;
  const outputfile2: string = `${name}-split-final.mp4`;
  const endFilePath1: string = `../tmp/${outputfile1}`;
  const endFilePath: string = `../tmp/${outputfile2}`;

  // Split the end of the video first
  const response = await new Promise((resolve) => {
    ffmpeg(src)
      .setStartTime(0)
      .setDuration(endTime)
      .outputOptions("-c copy")
      .videoCodec("libx264")
      .outputOptions([
        "-crf 20", // 0 is lossless, 18 is lossy, 23 is default, 51 is worst quality
        "-c:a copy",
      ])
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => {
        console.log({
          message: `First part of the video saved as ${outputfile1}`,
        });

        // Then cut out the beginning by offsetting startTime
        // to get the selected section of video
        ffmpeg(src)
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .outputOptions("-c copy")
          .videoCodec("libx264")
          .on("progress", ({ percent }) => utils.logProgress(percent))
          .on("end", () => {
            console.log({
              message: `Second part of the video saved as ${outputfile2}`,
            });
            // Delete temporary files
            fs.unlink(endFilePath1, (err) => {
              if (err) {
                console.error({
                  message: `Error deleting ${outputfile1}:`,
                  err,
                });
                resolve("");
              } else {
                console.log({
                  message: `${outputfile1} deleted successfully.`,
                });
                resolve(endFilePath);
              }
            });
          })
          .on("error", (e, stdout, stderr) => {
            utils.logError(e);
            resolve("");
          })
          .save(endFilePath);
      })
      .on("error", (e, stdout, stderr) => {
        utils.logError(e);
        resolve("");
      })
      .save(endFilePath1);
  });

  const hasError = response === "";
  if (hasError) {
    console.error("Error splitting video.");
    return;
  }

  console.log({ message: "End Splitting MP4" });
  return;
}

// ************* COMBINE VIDEO ************* //

async function combineVideo(vals: CombineVideo): Promise<void> {
  let { orientation } = vals;
  const { video1, video2, showBlur } = vals;

  console.log({ message: "Start Combining two MP4's" });
  // 1. Make sure files are same resolution
  const video1Data = await metadata.returnVideoResolution(video1);
  const video2Data = await metadata.returnVideoResolution(video2);

  // Set option for user to choose orientation
  const portraitResolution = "1080x1920";
  const landscapeResolution = "1920x1080";

  // If not portrait, then it's landscape
  if (orientation !== "portrait") orientation = "landscape";

  // Set output resolution based on orientation
  const finalResolution =
    orientation === "portrait" ? portraitResolution : landscapeResolution;

  const video1Resolution = video1Data.resolution;
  const video2Resolution = video2Data.resolution;

  const video1Is1080pLandScape = video1Resolution === finalResolution;
  const video2Is1080pLandScape = video2Resolution === finalResolution;

  const bothVideosAre1080pLandScape =
    video1Is1080pLandScape && video2Is1080pLandScape;

  let convertVideos: any = [];
  if (!bothVideosAre1080pLandScape) {
    console.warn({ message: "Warning: Videos are not the same resolution." });

    if (video1Resolution !== finalResolution) {
      const convertVideo1Playload = video1Data;
      convertVideos.push(convertVideo1Playload);
    }
    if (video2Resolution !== finalResolution) {
      const convertVideo2Playload = video1Data;
      convertVideos.push(convertVideo2Playload);
    }

    // Convert videos to 1080p, landscape mode
    if (convertVideos.length > 0) {
      console.log("Start Converting Videos Array");
      console.log("Convert Videos Array:", convertVideos);
      const tmpFilePath: string = `../tmp/converted.mp4`;
      const videoResponse = await VideoUtils.standardizeVideo(
        convertVideos[0],
        showBlur,
        tmpFilePath,
        finalResolution
      );

      console.log("End Converting Videos Array", videoResponse);
      return;
    } else {
      console.log({ message: "No videos to convert" });
    }
  }

  console.log({ message: `All videos are ${finalResolution}.` });

  // Upscale all videos to 1080p

  // Upscale all videos to 1080p

  // 2. If not, do something about it

  //
  //
  //
  //
  //
  //

  // 3. Combine the two files

  const filename = video1.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const finalname: string = `${name}-concat.mp4`;
  const tmpDir: string = `../tmp`;
  const endFilePath: string = `${tmpDir}/${finalname}`;

  const combineData: VideoCombinePayload = {
    video1,
    video2,
    endFilePath,
    tmpDir,
  };

  const response = await VideoUtils.combineVideos(combineData);
  const hasError = response === "";
  if (hasError) {
    console.error({ message: "Error combining video." });
    return;
  }

  console.log({ message: "End Combining two MP4's" });
  return;
}

const video: VideoFunctions = { compressVideo, splitVideo, combineVideo };
export default video;
