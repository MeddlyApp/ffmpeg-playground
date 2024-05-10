/*/ 
 * LOGGING FUNCTIONS
 * UTILITY FUNCTIONS
/*/

import path from "path";
import { promises } from "node:fs";
import { UtilityFunctions } from "../interfaces/utils.interface";

// ************* LOGGING FUNCTIONS ************* //

function logProgress(p: number): void {
  if (p) console.log({ response: `Progress: ${p.toFixed(2)}%` });
  else console.log({ response: "No progress..." });
}

function logError(e: Error): void {
  if (e && e.message) console.log({ response: `Error: ${e.message}` });
  else console.log({ error: e });
}

// ************* UTILITY FUNCTIONS ************* //

async function deleteTmpDirectory(dirPath: string): Promise<void> {
  const startMessage = `Deleting Dir: ${dirPath}`;
  console.log({ response: `Start ${startMessage}` });
  const entries = await promises.readdir(dirPath, { withFileTypes: true });
  // Delete all files within the destination folder
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = `${entry.path + "/" + entry.name}`;

      if (entry.isDirectory()) {
        await deleteTmpDirectory(fullPath);
        const recursiveMessage = `Rescursive Delete Path: ${fullPath}`;
        console.log({ response: recursiveMessage });
      } else if (entry.isFile()) {
        await promises.unlink(fullPath); // If it's a file, delete it
        const deleteMessage = `Deleted ${fullPath}`;
        console.log({ response: deleteMessage });
      }
    })
  );

  await promises.rmdir(dirPath);
  console.log({ response: `Completed ${startMessage}` });
}

async function uploadAllFilesToCloud(dirPath: string): Promise<void> {
  const startMessage = `Uploading files to cloud...`;
  console.log({ response: startMessage });

  const entries = await promises.readdir(dirPath, {
    withFileTypes: true,
  });

  // Delete all files within the destination folder
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await uploadAllFilesToCloud(fullPath);
        console.log({ response: `Rescursive Upload Path: ${fullPath}` });
      } else {
        console.log({ response: `Upload: ${fullPath}` });
      }
    })
  );

  const completedMessage = `Completed uploading files to cloud`;
  console.log({ response: completedMessage });
}

const utils: UtilityFunctions = {
  logProgress,
  logError,
  deleteTmpDirectory,
  uploadAllFilesToCloud,
};

export default utils;
