import { createSignal, createEffect } from "solid-js";

import { FileSystemProvider, useFileSystem, FileSystemView } from "../../src/index.js"

import pify from "pify";

import * as _BrowserFS from 'browserfs';
const BrowserFS = pify(_BrowserFS);

//import LightningFS from "@isomorphic-git/lightning-fs"

/*
import git from "isomorphic-git"
import http from 'isomorphic-git/http/web'
*/

// @ts-ignore
const debug = !!globalThis.debug;



export default function EditMenuWrapper() {

  async function getFs() {

    //const fs = new LightningFS('fs')

    /*
    const rootFs = await pify(BrowserFS.FileSystem.MountableFileSystem.Create)({
      '/tmp': await pify(BrowserFS.FileSystem.InMemory.Create)({}),
      '/home': await pify(BrowserFS.FileSystem.IndexedDB.Create)({}),
      //'/mnt/usb0': await pify(BrowserFS.FileSystem.LocalStorage.Create)({}),
    });
    */
    const rootFs = await pify(BrowserFS.FileSystem.IndexedDB.Create)({});
    BrowserFS.initialize(rootFs);

    const fsGlobal = {};
    BrowserFS.install(fsGlobal);

    /** @type {typeof import("fs")} */
    // @ts-ignore
    const fs = fsGlobal.require("fs");

    return fs;
  }

  return (
    <FileSystemProvider getFs={getFs} fallbackLoading={<div>Loading filesystem ...</div>}>
      <EditMenu/>
    </FileSystemProvider>
  )
}

export function EditMenu() {

  /*
  const [getState, setState] = createStore({
    fileList: [],
    fileSelected: '',
  });
  */

  const fs = useFileSystem();

  debug && console.log("EditMenu: fs", fs);

  if (!fs) {
    throw new Error("no filesystem");
  }

  /*
  // TODO check if files exist
  debug && console.log("EditMenu: cloning ...")
  git.clone({
    fs,
    http,
    dir: "/",
    url: "https://github.com/milahu/prosemirror-inplace-editing-demo-test-repo",
    // TODO run cors proxy on localhost
    // or use limited api tokens for write access
    corsProxy: 'https://cors.isomorphic-git.org',
  }).then(() => {
    debug && console.log("EditMenu: cloning done")
  })
  */

  // add some files
  (async () => {
    //const debug = true;
    debug && console.log("readdir /", await fs.promises.readdir("/"));

    const demoFiles = {
      "/hello.txt": "hello world\n",
      "/readme.md": "# readme\n\nwrite me\n",
      "/src/index.js": 'console.log("hello")\n',
      "/src/App.jsx": 'export default function App(props) {\n  return <div>hello</div>\n}\n',
      "/demo/src/index.js": 'console.log("hello")\n',
    };

    for (const [filePath, fileText] of Object.entries(demoFiles)) {
      if (await fs.promises.exists(filePath) == false) {

        // recursive mkdir. TODO implement in browserfs
        const parts = filePath.split("/");
        for (let i = 2; i < parts.length; i++) {
          const dirPath = parts.slice(0, i).join("/");
          debug && console.log("mkdir:", "i", i, "len", parts.length, "dirPath", dirPath);
          try { await fs.promises.mkdir(dirPath); } catch {}
        }

        debug && console.log("writeFile", filePath);
        /** @type {string} */
        await fs.promises.writeFile(filePath, fileText, "utf8");
      }
      else {
        debug && console.log("file exists:", filePath);
      }
    }

    debug && console.log("readdir /", await fs.promises.readdir("/"));
  })();

  const [getFile, setFile] = createSignal("");

  // TODO better: share app state with child components
  /*
      <Files setFile={setFile}/>
  */
  return (
    <div>
      <FileSystemView fs={fs} setFile={setFile}/>
      <Editor getFile={getFile}/>
    </div>
  );
}

/**
  @param {Object} props
  @param {() => string} props.getFile get file path
*/
function Editor(props) {
  const fs = useFileSystem();
  debug && console.log("EditMenu.Editor: fs", fs);
  /** @type {HTMLTextAreaElement | undefined} */
  let textarea;
  // load file
  createEffect(async () => {
    if (!fs) throw new Error("no filesystem");
    if (!textarea) throw new Error("no textarea");
    const file = props.getFile();
    debug && console.log("EditMenu.Editor: file", file);
    if (file) {
      const value = file ? await fs.promises.readFile(file, "utf8") : "";
      textarea.value = value;
    }
  }, [props.getFile])
  // save file
  async function saveFile() {
    if (!fs) throw new Error("no filesystem");
    if (!textarea) throw new Error("no textarea");
    const file = props.getFile();
    debug && console.log("Editor saveFile: textarea", textarea);
    const value = textarea.value;
    debug && console.log("Editor saveFile: file", file, value)
    await fs.promises.writeFile(file, value, "utf8");
    debug && console.log("Editor saveFile: done")
  }
  // TODO codemirror + prosemirror
  return (
    <div>
      <div>file: {props.getFile()}</div>
      <textarea ref={textarea} cols="80" rows="8"></textarea>
      <div>
        <button onClick={saveFile}>Save</button>
      </div>
    </div>
  );
}
