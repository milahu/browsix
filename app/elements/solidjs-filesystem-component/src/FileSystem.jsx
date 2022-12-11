import { createSignal, createContext, useContext, Show } from "solid-js";
import EventEmitter from "events";
import pify from "pify";

/** @typedef {import("solid-js").JSXElement} JSXElement */

/**
@typedef {typeof import("node:fs") & {
  _events: EventEmitter;
}} FsWithEvents
*/

/*
Allow to explicitly pass type parameters via JSDoc
https://github.com/microsoft/TypeScript/issues/27387
*/

const FileSystemContext = createContext(/** @type {FsWithEvents | undefined} */ (undefined));

// @ts-ignore
const debug = !!globalThis.debug;

/**
  @param {Object} props
  @param {() => Promise<typeof import("node:fs")>} props.getFs
  function that returns a filesystem object
  @param {JSXElement} [props.fallbackLoading]
  fallback to show when the filesystem is loading. \
  example: \
  `<div>Loading filesystem ...</div>`
  @param {JSXElement | JSXElement[]} [props.children]
 */

export function FileSystemProvider(props) {

  const [getFs, setFs] = createSignal(/** @type {FsWithEvents | undefined} */ (undefined));

  (async () => {

    /** @type {FsWithEvents} */
    const fs = await props.getFs();

    //const debug = true;

    if (debug) {
      // @ts-ignore
      globalThis.fs = fs;
    }

    if (!fs._events) {
      // watch filesystem events
      // https://github.com/jvilk/BrowserFS/issues/163
      fs._events = new EventEmitter();
      // patch only fs.* methods, dont patch browserfs methods like fs.initialize or fs.getRootFS
      // JSON.stringify(Object.keys(require("fs")).filter(n => !n.endsWith("Sync") && n.match(/^[a-z]/)))
      ;["appendFile","access","chown","chmod","close","copyFile","cp","createReadStream","createWriteStream","exists","fchown","fchmod","fdatasync","fstat","fsync","ftruncate","futimes","lchown","lchmod","link","lstat","lutimes","mkdir","mkdtemp","open","opendir","readdir","read","readv","readFile","readlink","realpath","rename","rm","rmdir","stat","symlink","truncate","unwatchFile","unlink","utimes","watch","watchFile","writeFile","write","writev"].forEach(k => {
      //Object.keys(fs).filter(k => typeof fs[k] === "function").forEach(k => {
        //console.log("patching fs." + k)
        // @ts-ignore
        const orig = fs[k];
        // @ts-ignore
        fs[k] = (...args) => {
          //fs._events.emit(k, ...args); // fire event before result
          const cb = args.pop();
          //console.log("fs." + k, "args", args, "cb", cb);
          /**
            @param {any} error
            @param {any} result
          */
          const cb2 = (error, result) => {
            //fs._events.emit(k, ...args);
            //console.log("fs.promises." + k, args);
            cb(error, result);
            if (!error) {
              fs._events.emit(k, ...args); // fire event after callback
            }
          }
          orig(...args, cb2);
        }
      });

      debug && console.log("FileSystem.jsx: fs._events", fs._events);
      /*
      // trace some calls
      fs._events.on("stat", (...args) => console.log("fs.stat", args));
      fs._events.on("mkdir", (...args) => console.log("fs.mkdir", args));
      fs._events.on("writeFile", (...args) => console.log("fs.writeFile", args));
      fs._events.on("unlink", (...args) => console.log("fs.unlink", args));
      */
    }

    if (!fs.promises) {
      //fs.promises = pify(fs); // no. this breaks fs.exists
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
      //fs.promises.mktemp = pify(fs.mktemp); // TODO implement in browserfs
      // @ts-ignore
      //fs.promises.access = pify(fs.access); // TODO implement in browserfs
      // TOOD more?

      // fs.exists has non-standard callback signature:
      // (result: boolean) => void
      const fs_exists = fs.exists; // bind here to avoid deadloop
      /** @param {import("fs").PathLike} path */
      // @ts-ignore Property 'exists' does not exist
      fs.promises.exists = (path) => {
        return new Promise((resolve, _reject) => {
          fs_exists.apply(fs, [path, resolve]);
        });
      };
    }

    debug && console.log("FileSystem.jsx: fs", fs);

    //globalThis.fs = fs;
    //globalThis.ls = (path = "/") => fs.readdir(path, undefined, (error, files) => console.dir(error || files));

    debug && console.log("FileSystem.jsx: setFs");
    setFs(fs);
  })();

  return (
    <Show when={getFs()} fallback={props.fallbackLoading}>
      <FileSystemContext.Provider value={getFs()}>
        {props.children}
      </FileSystemContext.Provider>
    </Show>
  );
}

export function useFileSystem() {
  return useContext(FileSystemContext);
}
