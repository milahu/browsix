// https://github.com/egoist/vite-plugin-compile-time

import glob from "tiny-glob"

export default async function () {
  const prefix = "../src";
  const files = await glob(prefix + "/**/*.{ts,js}", {
    cwd: __dirname,
    filesOnly: true,
  });
  // TODO pass name as argument
  // https://github.com/egoist/vite-plugin-compile-time/issues/19
  const object = "filesystemFiles";
  const str = JSON.stringify;
  const importCode = files.map(path => {
    const name = path.slice(prefix.length).replace(/\.[a-z0-9]+$/i, "");
    return `${object}[${str(name)}] = () => import(${str(path)});`;
  }).join(" ");
  // note: plugin does not emit sourcemaps
  // workaround: dont emit newlines
  return {
    //data: files,
    code: importCode,
  };
}
