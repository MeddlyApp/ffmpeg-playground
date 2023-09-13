/*/
 * COMPRESS VIDEO
/*/

import ffmpeg from "fluent-ffmpeg";
import utils from "../utils/utils.js";

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

const video = { compressVideo };
export default video;
