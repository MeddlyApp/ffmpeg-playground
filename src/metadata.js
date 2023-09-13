/*/
 * METADATA
 * RUN
/*/

import * as dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
dotenv.config();

// ************* METADATA ************* //

async function getFileMetadata(uri) {
  const metadata = await new Promise((resolve) => {
    return ffmpeg(uri).ffprobe((err, data) => resolve(data));
  });

  const stream1 = metadata?.streams[0];
  const stream2 = metadata?.streams[1];
  console.log({ uri, stream1, stream2, metadata });
}

//// ************* RUN ************* //

//async function run() {
//  const file1 = process.env.LOCAL_FILE_URI;
//  const file2 = process.env.LOCAL_FILE_URI2;
//  const value = file1;

//  await getFileMetadata(value);

//  console.log("Done");
//}

//run();

const metadata = { getFileMetadata };
export default metadata;
