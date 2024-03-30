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

async function compressVideo(uri: string) {
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
      .on("error", (e, stdout, stderr) => utils.logError(e))
      .save(endFilePath);
  });

  return response;
}

async function splitVideo(vals: SplitVideo): Promise<void> {
  const { uri, startTime, endTime } = vals;
  const filename = uri.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const outputfile1: string = `${name}-split-part.mp4`;
  const outputfile2: string = `${name}-split-final.mp4`;
  const endFilePath1: string = `output/${outputfile1}`;
  const endFilePath: string = `output/${outputfile2}`;

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
        console.log(`First part of the video saved as ${outputfile1}`);

        // Then cut out the beginning by offsetting startTime
        // to get the selected section of video
        ffmpeg(uri)
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .outputOptions("-c copy")
          .videoCodec("libx264")
          .on("progress", ({ percent }) => utils.logProgress(percent))
          .on("end", () => {
            console.log(`Second part of the video saved as ${outputfile2}`);
            // Delete temporary files
            fs.unlink(endFilePath1, (err) => {
              if (err) {
                console.error(`Error deleting ${outputfile1}:`, err);
                resolve("");
              } else {
                console.log(`${outputfile1} deleted successfully.`);
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
  else console.log("Video split successfully.");

  return;
}

async function combineVideo(vals: CombineVideo) {
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
  return;
}

const video: VideoFunctions = { compressVideo, splitVideo, combineVideo };
export default video;
