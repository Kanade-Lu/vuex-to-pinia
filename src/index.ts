#!/usr/bin/env zx
import { fs, question } from "zx";
import log from "log-symbols";
import { resolveCode } from "./core";
import minimist from 'minimist'


const transform = async (currentWorkingDir: string, fileName: string) => {
  try {
    const stats = await fs.stat(`${currentWorkingDir}/${fileName}`);
    if (stats.isFile()) {
      const code = await fs.readFile(`${currentWorkingDir}/${fileName}`, "utf8");
      try {
        if(!fs.existsSync(`${currentWorkingDir}/output`)) {
          await fs.mkdir(`${currentWorkingDir}/output`, { recursive: true });
        }
        await fs.appendFile(`${currentWorkingDir}/output/${fileName}`, resolveCode(code, `${currentWorkingDir}/${fileName}`));
        console.log(log.success, `已转换文件 ${fileName}`);
      } catch (error) {
        console.error(`出现错误: ${error}`);
      }
    }
    else if(stats.isDirectory()) {
      const files = await fs.readdir(`${currentWorkingDir}/${fileName}`);
        files.forEach(async (file: string) => {
          const stats = await fs.stat(`${currentWorkingDir}/${fileName}/${file}`);
          if(stats.isFile()) {
            const code = await fs.readFile(`${currentWorkingDir}/${fileName}/${file}`, "utf8");
            try {
              if(!fs.existsSync(`${currentWorkingDir}/${fileName}/output`)) {
                await fs.mkdir(`${currentWorkingDir}/${fileName}/output`, { recursive: true });
              }
              await fs.appendFile(`${currentWorkingDir}/${fileName}/output/${file}`,resolveCode(code, `${currentWorkingDir}/${fileName}/${file}`));
              console.log(log.success, `已转换文件 output/${currentWorkingDir}/${fileName}/${file}`);
            } catch (error) {
              console.error(`出现错误: ${error}`);
            } 
          } else {
            transform(`${currentWorkingDir}/${fileName}`, file);
          }
        });
    } else {
      console.error(`未找到指定文件或文件夹: ${fileName}`);
    }
  } catch(error) {
    console.error(`出现错误: ${error}`);
  }

}

export async function main() {
  const argv = minimist(process.argv.slice(3))
  let fileName = argv._[0]
  try {
    const currentWorkingDir = process.cwd();
    transform(currentWorkingDir, fileName);
  } catch (error) {
    console.error(`出现错误: ${error}`);
  }
}