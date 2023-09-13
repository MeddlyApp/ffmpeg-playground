/*/
 * COMPRESS VIDEO
 * RUN
/*/

import * as dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import utils from "./utils/utils.js";
dotenv.config();

// ************* COMPRESS VIDEO ************* //

async function compressVideo(uri) {
  const filename = uri.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];

  const finalname = `${name}-compressed.mp4`;
  const endFilePath = `../tmp/${finalname}`;

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

// ************* RUN ************* //

async function run() {
  const file1 = process.env.LOCAL_FILE_URI;
  const file2 = process.env.LOCAL_FILE_URI2;
  const value = file1;

  await compressVideo(value);
  console.log("Done");
}

run();
