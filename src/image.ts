/*/
 * GENERATE GIF
/*/

import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import utils from "../utils/utils";
import { ImageFunctions } from "../interfaces/image.interface";

// ************* GENERATE GIF ************* //

async function generateGif(uri: string) {
  const filename = uri.split("/").pop() || "";
  const splitname = filename.split(".");
  const name = splitname[0];

  const finalname = `${name}-compressed.gif`;
  const endFilePath = `../tmp/${finalname}`;

  const metadata: any = await new Promise((resolve) => {
    return ffmpeg(uri).ffprobe((err: any, data: FfprobeData) => resolve(data));
  });

  const { duration } = metadata.format;
  const setDuration = duration > 5 ? "5" : `${duration}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(uri)
      .setStartTime("00:00:00")
      .setDuration(setDuration)
      .fps(3)
      .complexFilter(["scale=iw/4:ih/4"])
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => utils.logError(e))
      .save(endFilePath);
  });

  return response;
}

const image: ImageFunctions = { generateGif };
export default image;
