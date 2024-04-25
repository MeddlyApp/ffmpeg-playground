/*/
 * COMPRESS VIDEO
 * SPLIT VIDEO
 * COMBINE VIDEO
/*/

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import utils from "../utils/utils";
import {
  CombineVideos,
  CombineVideoItem,
  CombineVideoSettings,
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

async function combineVideos(vals: CombineVideos): Promise<void> {
  let { videos, outputFileName } = vals;

  let { orientation } = vals;
  if (orientation !== "portrait") orientation = "landscape";

  const portraitHDResolution = "1080x1920";
  const landscapeHDResolution = "1920x1080";

  // 1. Set output resolution based on orientation
  const outputResolution =
    orientation === "portrait" ? portraitHDResolution : landscapeHDResolution;

  // 2. Ensure all videos are the same resolution
  const formattedVideos: CombineVideoItem[] =
    await VideoUtils.formatVideosToStandard(outputResolution, videos);

  if (formattedVideos.length < 2) {
    const error =
      "Error - formattedVideos: Need at least 2 videos to combine output.";
    console.error({ message: error });
    return;
  }

  // 3. Sort videos by index, so we can combine them in order
  const sortedVideos = formattedVideos.sort((a, b) => a.index - b.index);
  console.log({ message: "Start Combining Videos", videos: sortedVideos });

  // 4. Format Final Output File Name

  const filename = outputFileName.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const finalname: string = `${name}.mp4`;
  const tmpDir: string = `../tmp`;
  const endFilePath: string = `${tmpDir}/${finalname}`;

  if (sortedVideos.length < 2) {
    const error =
      "Error - sortedVideos: Need at least 2 videos to combine output.";
    console.error({ message: error });
    return;
  }

  // 5. Combine Videos

  // Notes:
  // - if the video has no audio, copying the audio in current
  //   function VideoUtils.combineVideos will move the other file's
  //   audio up. We need to add silence to the video with no audio
  // - also need to account for showBlur in CombineVideoItem in the
  //   VideoUtils.formatVideosToStandard function above. Use argument
  //   values to set upsale / orientation filters.

  const combinePayload: VideoCombinePayload = {
    videos: sortedVideos,
    endFilePath,
    tmpDir,
  };

  const response = await VideoUtils.combineVideos(combinePayload);

  // 6. Delete Temporary Files

  //for (const x of sortedVideos) {
  //  const { video } = x;

  //  // Make sure video includes ../tmp/ in path
  //  if (!video.includes("../tmp/")) {
  //    const skip = `Skip deleting ${video} because it is not in tmp directory.`;
  //    console.log({ message: skip });
  //  } else {
  //    fs.unlink(video, (err) => {
  //      if (err) {
  //        console.error({ message: `Error deleting ${video}:`, err });
  //      } else {
  //        console.log({ message: `${video} deleted successfully.` });
  //      }
  //    });
  //  }
  //}

  const hasError = response === "";
  if (hasError) {
    console.error({ message: "Error combining videos." });
    return;
  }

  console.log({ message: "End Combining Videos" });
}

const video: VideoFunctions = { compressVideo, splitVideo, combineVideos };
export default video;
