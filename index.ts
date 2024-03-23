/*/
 * RUN
/*/

import * as dotenv from "dotenv";
import audio from "./src/audio.js";
import image from "./src/image.js";
import playlist from "./src/m3u8-playlist.js";
import metadata from "./src/metadata.js";
import video from "./src/video.js";
dotenv.config();

// ************* RUN ************* //

async function run() {
  const file1: string = process?.env?.LOCAL_FILE_URI || "";
  const file2: string = process?.env?.LOCAL_FILE_URI2 || "";

  // Pick and choose what you want to run here...
  //
  // await audio.generateMP3FromMp4(file1);
  // await image.generateGif(file1);
  // await playlist.generateVOD(file1, file2);
  // await metadata.getFileMetadata(file1);
  // await video.compressVideo(file1);

  console.log("Done");
}

run();
