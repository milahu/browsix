console.log("App.jsx: hello")

//import pkg from "../../package.json"

//import logo from './logo.svg';
//import styles from './App.module.css';

import { onMount, createSignal, Suspense, Show } from "solid-js";
import pify from "pify";
import * as BrowserFS from "browserfs";
import {BootWith} from "../src/kernel/kernel"
import {Terminal} from "./elements/browsix-terminal/browsix-terminal"

// get the data at compile time
// https://github.com/egoist/vite-plugin-compile-time
// @ts-ignore Property 'compileTime' does not exist on type 'ImportMeta'. ts(2339)
// codegen:
// const filesystemFiles = {
//   './path/to/file.js': () => import('./path/to/file.js'),
// };
/** @type {Record<string, () => any>} */
const filesystemFiles = {};
import.meta.compileTime("./filesystem-files.js");

function App() {
  const [getKernel, setKernel] = createSignal();
  onMount(async () => {
    const rootFs = await pify(BrowserFS.FileSystem.MountableFileSystem.Create)({
      '/tmp': await pify(BrowserFS.FileSystem.InMemory.Create)({}),
      '/home': await pify(BrowserFS.FileSystem.IndexedDB.Create)({}),
      //'/mnt/usb0': await pify(BrowserFS.FileSystem.LocalStorage.Create)({}),
    });
    BrowserFS.initialize(rootFs);
    const fsGlobal = {};
    BrowserFS.install(fsGlobal);
    /** @type {typeof import("fs")} */
    // @ts-ignore
    const fs = fsGlobal.require("fs");

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
      fs.promises.exists = (path) => {
        return new Promise((resolve, _reject) => {
          //console.log("fs.promises.exists: calling fs.exists")
          //resolve(false);
          existsCb.apply(fs, [path, resolve]); // never resolves
          //existsCb(path, resolve); // never resolves
          //fs.exists.apply(fs, [path, resolve]); // wrong
          //existsRaw(path, (result) => { // wrong
          // wrong. infinite recursion
          //fs.exists(path, (result) => {
          //  //console.log("fs.promises.exists: result", result);
          //  resolve(result);
          //});
        });
      };

      if (false) {
        // simple but wrong ... fs.promises.exists hangs
        // @ts-ignore
        fs.promises = pify(fs);
        // fs.exists has non-standard callback signature:
        // (result: boolean) => void
        /** @param {import("fs").PathLike} path */
        // @ts-ignore
        fs.promises.exists = (path) => {
          return new Promise((resolve, _reject) => {
            //console.log("fs.promises.exists: calling fs.exists")
            //resolve(false);
            existsCb.apply(fs, [path, resolve]); // never resolves
            //existsCb(path, resolve); // never resolves
            //fs.exists.apply(fs, [path, resolve]); // wrong
            //existsRaw(path, (result) => { // wrong
            // wrong. infinite recursion
            //fs.exists(path, (result) => {
            //  //console.log("fs.promises.exists: result", result);
            //  resolve(result);
            //});
          });
        };
      }
    }

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
      Object.entries(filesystemFiles).map(async ([file, importFile]) => {
        if (file.startsWith("/bin/") == false) return; // TODO later
        file = "/usr" + file; // TODO generate correct path on comptime
        console.log("App: file", file);
        /*
        try {
          console.log("App: file", file, "access ...");
          // FIXME never resolves
          const r = await fs.promises.access(file, fs.constants.F_OK);
          console.log("App: file", file, "access ok", r);
        }
        catch {}
        */
        // FIXME never resolves
        console.log("App: file", file, "exists ...");
        const exists = await fs.promises.exists(file);
        console.log("App: file", file, "exists", exists);
        if (exists == false) {
          // copy file to filesystem
          // recursive mkdir. TODO implement in browserfs
          const parts = file.split("/");
          for (let i = 0; i < parts.length; i++) {
            const dirPath = parts.slice(0, i).join("/");
            console.log("mkdir", dirPath);
            try { await fs.promises.mkdir(dirPath); } catch {}
          }
          // TODO fetch + fs.writeFile

          // TODO better: mount browserfs XmlHttpRequest filesystem
          // *.js files must be compiled with target = node
        }
      });
    }
    console.log("App: boot kernel");
    BootWith(rootFs, (error, kernel) => {
      if (error) throw error;
      setKernel(kernel);
    });
  });

  return (
    <Show when={getKernel()} fallback={<div>Loading kernel ...</div>}>
      <Terminal kernel={getKernel()}/>
    </Show>
  )
}

export default App;
