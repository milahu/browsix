console.log("App.jsx: hello")

//import pkg from "../../package.json"

//import logo from './logo.svg';
//import styles from './App.module.css';

import { onMount, createSignal, createEffect, Show } from "solid-js";
import pify from "pify";
import * as BrowserFS from "browserfs";
import {BootWith} from "../src/kernel/kernel"
import {Terminal} from "./elements/browsix-terminal/browsix-terminal"
import {FileSystemProvider, useFileSystem, FileSystemView} from "./elements/solidjs-filesystem-component"

const debug = false;

// get the data at compile time
// https://github.com/egoist/vite-plugin-compile-time
// @ts-ignore Property 'compileTime' does not exist on type 'ImportMeta'. ts(2339)
// codegen:
// const filesystemFiles = {
//   '/bin/file': () => '/path/to/bin/file.js',
// };
/** @type {Record<string, string>} */
const filesystemFiles = {};
import.meta.compileTime("./filesystem-files.js");

function App() {
  const [getKernel, setKernel] = createSignal();
  onMount(async () => {
    const fs = useFileSystem();
    try { await fs.promises.mkdir("/bin"); } catch {}
    try { await fs.promises.mkdir("/usr"); } catch {}
    try { await fs.promises.mkdir("/usr/bin"); } catch {}
    console.log("App: readdir /", await fs.promises.readdir("/"));
    //console.log("App: readdir /", await pify(fs.readdir)("/"));
    // TODO init files on runtime
    //console.log("App: filesystemFiles", filesystemFiles);
    if (false) {
      const [file, importFile] = Object.entries(filesystemFiles)[0];
      // TypeError: Cannot read properties of undefined (reading 'F_OK')
      /*
      fs.access(file, fs.constants.F_OK, (err) => {
        console.log("access", file, "err", err);
      });
      */
      // fs.constants.F_OK = 0
      // "Error: ENOTSUP: Operation is not supported."
      /*
      fs.access(file, 0, (err) => {
        console.log("access", file, "err", err);
      });
      */
      /*
      console.log("App: file", file, "exists ...");
      const exists = await fs.promises.exists(file);
      // FIXME hangs
      console.log("App: file", file, "exists", exists);
      */
      // FIXME never calls back
      // fixed: dont patch window.setImmediate in kernel.ts
      console.log("App: file", file, "exists ...");
      fs.exists(file, (res) => {
        console.log("App: file", file, "exists", res);
      });
    }
    if (true) {
      console.log("App: filesystemFiles", filesystemFiles);
      Object.entries(filesystemFiles).map(async ([filePath, file]) => {
        if (filePath.startsWith("/bin/") == false) return; // TODO later
        filePath = "/usr" + filePath; // TODO generate correct path on comptime
        //console.log("App: file", filePath);
        //console.log("App: file", file, "exists ...");
        const exists = await fs.promises.exists(filePath);
        //console.log("App: file", file, "exists", exists);
        //console.log("App: file", filePath, "from", file.source);
        if (exists == false) {
          // copy file to filesystem
          // recursive mkdir. TODO implement in browserfs
          const parts = filePath.split("/");
          for (let i = 1; i < parts.length; i++) {
            const dirPath = parts.slice(0, i).join("/");
            //console.log("mkdir:", "i", i, "len", parts.length, "dirPath", dirPath);
            try { await fs.promises.mkdir(dirPath); } catch {}
          }
          // fetch + write
          // TODO does this work on github pages?
          console.log("App: file", filePath, "from", file.source, "- fetching");
          const fileModule = await file.import();
          console.log("App: file", filePath, "from", file.source, "- imported module", fileModule);
          const response = await fetch(file.source);
          const fileText = await response.text();
          await fs.promises.writeFile(filePath, fileText, "utf8");

          // TODO better? mount browserfs XmlHttpRequest filesystem

          // TODO *.js files must be compiled with target = node
          // original files:
          // https://unix.bpowers.net/fs/index.json
          // https://unix.bpowers.net/fs/usr/bin/cat
          /*
            #!/usr/bin/env node
            'use strict';
            var fs = require('fs');
            var util_1 = require('util');
            // ...
            process.stderr.write(msg, cb);
          */
        }
      });
    }
    const rootFs = fs.getRootFS();
    console.log("App: fs", fs);
    console.log("App: rootFs", rootFs);
    console.log("App: boot kernel");
    // FIXME TypeError: rootFS.constructor.isAvailable is not a function
    // BootWith should take "fs" not "rootFs"
    BootWith(rootFs, (error, kernel) => {
      if (error) throw error;
      setKernel(kernel);
    });
  });

  const [getFile, setFile] = createSignal("");

  return (
    <Show when={getKernel()} fallback={<div>Loading kernel ...</div>}>
      <Terminal kernel={getKernel()}/>
      <details>
        <summary>files</summary>
        <div style="display:flex; width:100%; padding:1em; box-sizing:border-box">
          <div style="flex-basis:20%; max-height:10em; overflow:auto">
            <FileSystemView setFile={setFile}/>
          </div>
          <div style="flex-basis:80%">
            <Editor getFile={getFile}/>
          </div>
        </div>
      </details>
    </Show>
  )
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
      <textarea ref={textarea} style="width:100%" rows="8"></textarea>
      <div>
        <button onClick={saveFile}>Save</button>
      </div>
    </div>
  );
}

function AppWrapper() {

  async function getFs() {

    //const fs = new LightningFS('fs')

    /*
    const rootFs = await pify(BrowserFS.FileSystem.MountableFileSystem.Create)({
      '/tmp': await pify(BrowserFS.FileSystem.InMemory.Create)({}),
      '/home': await pify(BrowserFS.FileSystem.IndexedDB.Create)({}),
      //'/mnt/usb0': await pify(BrowserFS.FileSystem.LocalStorage.Create)({}),
    });
    */
    /*
    const rootFs = await pify(BrowserFS.FileSystem.IndexedDB.Create)({});
    BrowserFS.initialize(rootFs);
    */
    const rootFs = await pify(BrowserFS.FileSystem.MountableFileSystem.Create)({
      '/tmp': await pify(BrowserFS.FileSystem.InMemory.Create)({}),
      '/home': await pify(BrowserFS.FileSystem.IndexedDB.Create)({}),
      //'/mnt/usb0': await pify(BrowserFS.FileSystem.LocalStorage.Create)({}),
    });
    BrowserFS.initialize(rootFs);

    //console.log("AppWrapper: rootFs", rootFs);

    const fsGlobal = {};
    BrowserFS.install(fsGlobal);
    /** @type {typeof import("fs")} */
    // @ts-ignore
    const fs = fsGlobal.require("fs");

    globalThis._browsix = {};
    globalThis._browsix.fs = fs;
    globalThis._browsix.buffer = fsGlobal.require("buffer");

    //console.log("AppWrapper: fs", fs);

    // fix: fs.getRootFS() always returns undefined
    fs.getRootFS = () => rootFs;

    /*
    // done in FileSystemProvider
    if (!fs.promises) {
      // @ts-ignore
      fs.promises = {};
      // @ts-ignore
      fs.promises.readFile = pify(fs.readFile);
      // @ts-ignore
      fs.promises.writeFile = pify(fs.writeFile);
      // @ts-ignore
      fs.promises.readdir = pify(fs.readdir);
      // @ts-ignore
      fs.promises.stat = pify(fs.stat);
      // @ts-ignore
      fs.promises.unlink = pify(fs.unlink);
      // @ts-ignore
      fs.promises.mkdir = pify(fs.mkdir);
      // @ts-ignore
      //fs.promises.mktemp = pify(fs.mktemp); // TODO implement
      // @ts-ignore
      //fs.promises.access = pify(fs.access); // TODO implement

      const existsCb = fs.exists;
      // @ts-ignore
      fs.promises.exists = (path) => {
        return new Promise((resolve, _reject) => {
          existsCb.apply(fs, [path, resolve]);
        });
      };
    }
    */

    return fs;
  }

  return (
    <FileSystemProvider getFs={getFs} fallbackLoading={<div>Loading filesystem ...</div>}>
      <App/>
    </FileSystemProvider>
  )
}

export default AppWrapper;
