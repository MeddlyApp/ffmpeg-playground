/*/
 * COMPRESS VIDEO
/*/

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import utils from "../utils/utils";
import {
  CombineVideo,
  SplitVideo,
  VideoFunctions,
} from "../interfaces/video.interface";

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
  if (hasError) console.error({ message: "Error compressing video." });

  console.log({ message: "End Compressing MP4" });
  return;
}

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
  if (hasError) console.error("Error splitting video.");

  console.log({ message: "End Splitting MP4" });
  return;
}

async function combineVideo(vals: CombineVideo): Promise<void> {
  console.log({ message: "Start Combining two MP4's" });
  const { file1, file2 } = vals;
  const filename = file1.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const finalname: string = `${name}-compressed.mp4`;
  const endFilePath: string = `../tmp/${finalname}`;

  const response = filename;
  //await new Promise((resolve) => {
  //  return ffmpeg(uri)
  //    .videoCodec("libx264")
  //    .outputOptions([
  //      "-crf 20", // 0 is lossless, 18 is lossy, 23 is default, 51 is worst quality
  //      "-c:a copy",
  //    ])
  //    .on("progress", ({ percent }) => utils.logProgress(percent))
  //    .on("end", (e, stdout, stderr) => resolve(endFilePath))
  //    .on("error", (e, stdout, stderr) => utils.logError(e))
  //    .save(endFilePath);
  //});

  // return response;

  console.log({ message: "End Combining two MP4's" });
  return;
}

const video: VideoFunctions = { compressVideo, splitVideo, combineVideo };
export default video;
