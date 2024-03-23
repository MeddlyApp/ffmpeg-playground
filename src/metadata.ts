/*/
 * METADATA
 * RUN
/*/

import * as dotenv from "dotenv";
import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import { MetadataFunctions } from "../interfaces/metadata.interface";
dotenv.config();

// ************* METADATA ************* //

async function getFileMetadata(uri: string) {
  const metadata: any = await new Promise((resolve) => {
    return ffmpeg(uri).ffprobe((err: any, data: FfprobeData) => resolve(data));
  });

  const stream1: FfprobeStream = metadata?.streams[0];
  const stream2: FfprobeStream = metadata?.streams[1];
  console.log({ uri, stream1, stream2, metadata });
}

const metadata: MetadataFunctions = { getFileMetadata };
export default metadata;
