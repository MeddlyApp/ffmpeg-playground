/*/ 
 * LOGGING FUNCTIONS
 * UTILITY FUNCTIONS
/*/

import path from "path";
import { promises } from "node:fs";
import { UtilityFunctions } from "../interfaces/utils.interface";

// ************* LOGGING FUNCTIONS ************* //

function logProgress(p: number): void {
  if (p) console.log({ message: `Progress: ${p.toFixed(2)}%` });
  else console.log({ message: "No progress..." });
}

function logError(e: Error): void {
  if (e && e.message) console.log({ message: `Error: ${e.message}` });
  else console.log({ error: e });
}

// ************* UTILITY FUNCTIONS ************* //

async function deleteTmpDirectory(dirPath: string): Promise<void> {
  const startMessage = `Deleting Dir: ${dirPath}`;
  console.log({ message: `Start ${startMessage}` });
  const entries = await promises.readdir(dirPath, { withFileTypes: true });
  // Delete all files within the destination folder
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = `${entry.path + "/" + entry.name}`;

      if (entry.isDirectory()) {
        await deleteTmpDirectory(fullPath);
        const recursiveMessage = `Rescursive Delete Path: ${fullPath}`;
        console.log({ message: recursiveMessage });
      } else if (entry.isFile()) {
        await promises.unlink(fullPath); // If it's a file, delete it
        const deleteMessage = `Deleted ${fullPath}`;
        console.log({ message: deleteMessage });
      }
    })
  );

  await promises.rmdir(dirPath);
  console.log({ message: `Completed ${startMessage}` });
}

async function uploadAllFilesToCloud(dirPath: string): Promise<void> {
  const startMessage = `Uploading files to cloud...`;
  console.log({ message: startMessage });

  const entries = await promises.readdir(dirPath, {
    withFileTypes: true,
  });

  // Delete all files within the destination folder
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await uploadAllFilesToCloud(fullPath);
        console.log({ message: `Rescursive Upload Path: ${fullPath}` });
      } else {
        console.log({ message: `Upload: ${fullPath}` });
      }
    })
  );

  const completedMessage = `Completed uploading files to cloud`;
  console.log({ message: completedMessage });
}

const utils: UtilityFunctions = {
  logProgress,
  logError,
  deleteTmpDirectory,
  uploadAllFilesToCloud,
};

export default utils;
