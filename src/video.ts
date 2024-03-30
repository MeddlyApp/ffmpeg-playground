/*/
 * COMPRESS VIDEO
 * SPLIT VIDEO
 * COMBINE VIDEO
/*/

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import utils from "../utils/utils";
import { SplitVideo, VideoFunctions } from "../interfaces/video.interface";
import metadata from "./metadata";
import { MetadataStreams } from "../interfaces/metadata.interface";

// ************* COMPRESS VIDEO ************* //

async function compressVideo(uri: string): Promise<void> {
  console.log({ message: "Start Compressing MP4" });
  const filename: string = uri.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const finalname: string = `${name}-compressed.mp4`;
  const endFilePath: string = `../tmp/${finalname}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(uri)
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
  const { uri, startTime, endTime } = vals;
  const filename = uri.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const outputfile1: string = `${name}-split-part.mp4`;
  const outputfile2: string = `${name}-split-final.mp4`;
  const endFilePath1: string = `../tmp/${outputfile1}`;
  const endFilePath: string = `../tmp/${outputfile2}`;

  // Split the end of the video first
  const response = await new Promise((resolve) => {
    ffmpeg(uri)
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
        ffmpeg(uri)
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

async function combineVideo(file1: string, file2: string): Promise<void> {
  console.log({ message: "Start Combining two MP4's" });
  // 1. Make sure files are same resolution
  const video1Resolution = await metadata.returnVideoResolution(file1);
  const video2Resolution = await metadata.returnVideoResolution(file2);
  console.log({ video1Resolution, video2Resolution });

  const isSameResolution = video1Resolution === video2Resolution;
  if (!isSameResolution) {
    console.error({ message: "Error: Videos are not the same resolution." });
    return;
  } else console.log({ message: "Videos are the same resolution." });

  // 2. If not, do something about it

  //
  //
  //
  //
  //
  //

  // 3. Combine the two files

  const filename = file1.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const finalname: string = `${name}-concat.mp4`;
  const filePath: string = `../tmp`;
  const endFilePath: string = `${filePath}/${finalname}`;

  const response = await new Promise((resolve) => {
    ffmpeg()
      .input(file1)
      .input(file2)
      .videoCodec("libx264")
      .audioCodec("libmp3lame")
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", (e, stdout, stderr) => {
        console.log({ message: "End Combining two MP4's" });
        resolve("Complete");
      })
      .on("error", (e, stdout, stderr) => {
        utils.logError(e);
        resolve("");
      })
      .mergeToFile(endFilePath, filePath); // Merge and save to the output file
  });

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
