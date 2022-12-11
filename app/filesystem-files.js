// https://github.com/egoist/vite-plugin-compile-time

import glob from "tiny-glob"

// FIXME bundle each binary, for example src/browser-node/browser-node.ts to /usr/bin/node
// -> inline all imports

export default async function () {
  // note: paths must be relative to App.jsx so dynamic imports work
  //const prefix = "src";
  const prefix = "../src";
  const sourceFiles = (await glob(prefix + "/**/*.{ts,js}", {
    //cwd: __dirname + "/..",
    cwd: __dirname,
    filesOnly: true,
  })).filter(file => file != "../src/bin/pipeline-example.ts");
  // FIXME Failed to resolve import "node-pipe2" from "src/bin/pipeline-example.ts". Does the file exist?

  console.log("sourceFiles", sourceFiles);

  // TODO pass name as argument
  // https://github.com/egoist/vite-plugin-compile-time/issues/19
  const object = "filesystemFiles";
  const str = JSON.stringify;
  /**
   * @param {string} object
   * @param {string} target
   * @param {string} source
   * @returns {string}
   */
  function addFile(object, target, source) {
    return `${object}[${str(target)}] = { source: ${str(source)}, import: () => import(${str(source)}) };`;
  }
  let importCode = sourceFiles.map(source => {
    const target = source.slice(prefix.length).replace(/\.[a-z0-9]+$/i, "");
    //return `${object}[${str(name)}] = () => import(${str(path)});`;
    return addFile(object, target, source);
  }).join("");
  importCode += addFile(object, "/bin/node", "../src/browser-node/browser-node.ts");
  // note: plugin does not emit sourcemaps
  // workaround: dont emit newlines
  return {
    //data: files,
    code: importCode,
  };
}
