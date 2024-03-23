/*/
 * COMPRESS VIDEO
/*/

import ffmpeg from "fluent-ffmpeg";
import utils from "../utils/utils.js";
import { VideoFunctions } from "../interfaces/video.interface.js";

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

async function splitVideo(uri: string) {
  const filename = uri.split("/").pop() || "";
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

  return response;
}

async function combineVideo(file1: string, file2: string) {
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

  return response;
}

const video: VideoFunctions = { compressVideo, splitVideo, combineVideo };
export default video;
