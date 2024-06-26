/*/
 * GENERATE GIF
 * GENERATE JPG
/*/

import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import utils from "../utils/utils";
import { ImageFunctions } from "../interfaces/image.interface";

// ************* GENERATE GIF ************* //

async function generateGif(src: string): Promise<void> {
  console.log({ response: "Start Generating GIF From MP4" });

  const filename = src.split("/").pop() || "";
  const splitname = filename.split(".");
  const name = splitname[0];

  const finalname = `${name}-compressed.gif`;
  const endFilePath = `../tmp/${finalname}`;

  const metadata: any = await new Promise((resolve) => {
    return ffmpeg(src).ffprobe((err: any, data: FfprobeData) => resolve(data));
  });

  const { duration } = metadata.format;
  const setDuration = duration > 5 ? "5" : `${duration}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(src)
      .setStartTime("00:00:00")
      .setDuration(setDuration)
      .fps(3)
      .complexFilter(["scale=iw/4:ih/4"])
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => {
        utils.logError(e);
        resolve("");
      })
      .save(endFilePath);
  });

  const hasError: boolean = response === "";
  if (hasError) {
    console.error("Error generating GIF.");
    return;
  }

  console.log({ response: "End Generating GIF From MP4" });
  return;
}

// ************* GENERATE JPG ************* //

const image: ImageFunctions = { generateGif };
export default image;
