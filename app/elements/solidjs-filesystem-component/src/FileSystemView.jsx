import { For, Show, Switch, Match, onMount } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { resolve as resolveFilePath } from "path-browserify";

import { useFileSystem } from "./FileSystem.jsx"

import "./FileSystemView.css"

// @ts-ignore
const debug = !!globalThis.debug;

/** @typedef {import("solid-js").JSXElement} JSXElement */

/**
@typedef {{
  name: string;
  path: string;
  parent: FileSystemNode | null;
  stats: import("node:fs").Stats;
  children: Record<string, FileSystemNode> | null;
}} FileSystemNode
*/

/**
@typedef {typeof import("node:fs") & {
  _events: any;
}} FsWithEvents
*/

/**
  @param {Object} props
  @param {FsWithEvents} [props.fs]
  filesystem object, compatible with the node.js filesystem API. \
  must have an EventEmitter in fs._events (see FileSystemProvider in FileSystem.jsx). \
  default: use the filesystem provided by `FileSystemProvider`
  @param {(path: string) => void} [props.setFile]
  callback on set file. usually by clicking the file
  @param {(path: string) => void} [props.openDir]
  callback on open directory
  @param {(path: string) => void} [props.closeDir]
  callback on close directory
  @param {JSXElement} [props.fallbackLoading]
  fallback to show when the filesystem view is loading. \
  example: \
  `<div>Loading filesystem view ...</div>`
*/

export function FileSystemView(props) {

  //const debug = true;

  const fs = props.fs || useFileSystem();

  if (!fs) {
    throw new Error("no filesystem");
  }

  /** @param {FileSystemNode} node */
  function pathOfNode(node) {
    const keys = [node.name];
    while (node.parent) {
      keys.push(node.parent.name);
      node = node.parent;
    }
    keys.reverse();
    return keys.join("/");
  }

  /** @param {FileSystemNode} node */
  function storeKeysOfNode(node) {
    const keys = [node.name];
    while (node.parent) {
      keys.push("children", node.parent.name);
      node = node.parent;
    }
    keys.reverse();
    return keys;
  }

  /** @param {FileSystemNode} node */
  async function childrenOfNode(node) {
    const filePath = node.path;
    if (!fs) {
      throw new Error("no filesystem");
    }
    //const debug = true;
    debug && console.log("FileSystemView childrenOfNode: filePath", filePath)
    const files = await fs.promises.readdir(filePath);
    debug && console.log("FileSystemView childrenOfNode: init tree. files", files);
    const nodeEntries = await Promise.all(files.map(async name => {
      // filePath has no trailing slash
      debug && console.log("FileSystemView childrenOfNode: stat", (filePath + "/" + name));
      const stats = await fs.promises.stat(filePath + "/" + name);

      /** @type {FileSystemNode} */
      const newNode = {
        name,
        get path() {
          // FIXME this console.log is too expensive, looks like infinite recursion
          //debug && console.log("FileSystemView childrenOfNode: newNode path: this", this);
          // unwrap does not help
          //debug && console.log("FileSystemView childrenOfNode: newNode path: this", unwrap(this));
          return pathOfNode(this);
        },
        stats,
        children: null,
        // children = null: children are not visible
        // children = {}: no children
        //parent: tree[""],
        parent: node,
      };
      return [name, newNode]; // key, value
    }));
    debug && console.log("FileSystemView childrenOfNode: nodeEntries", nodeEntries);
    debug && console.log("FileSystemView childrenOfNode: Object.fromEntries(nodeEntries)", Object.fromEntries(nodeEntries));
    // FIXME RangeError: Invalid array length
    return Object.fromEntries(nodeEntries);
  }

  //console.log("FileSystemView fs", fs);

  /* FIXME implement fs.Stats in browserfs
  stats: new fs.Stats(
    2049, // dev = Device: 8,1
    16877, // mode = Access: (0755/drwxr-xr-x)
  ),
  */
  function directoryStats() {
    return {
      dev: 2049, // dev = Device: 8,1
      mode: 16877, // mode = Access: (0755/drwxr-xr-x)
      nlink: 1,
      uid: 0,
      gid: 0,
      rdev: 0,
      blksize: 4096,
      ino: 2,
      size: 4096,
      blocks: 8,
      atimeMs: 0,
      mtimeMs: 0,
      ctimeMs: 0,
      birthtimeMs: 0,
      atime: new Date(0),
      mtime: new Date(0),
      ctime: new Date(0),
      birthtime: new Date(0),
      isFile() { return false; },
      isDirectory() { return true; },
      isBlockDevice() { return false; },
      isCharacterDevice() { return false; },
      isSymbolicLink() { return false; },
      isFIFO() { return false; },
      isSocket() { return false; },
    };
  }

  // state
  // object tree: node name is stored in node and in Object.keys(parent.children)
  const rootNode = {
    name: "",
    path: "/",
    //stats: await fs.promises.stat("/"),
    stats: directoryStats(),
    parent: null,
    //children: null,
    children: {},
    // children = null: children are not visible
    // children = {}: no children
  };
  const [tree, setTree] = createStore({
    // root node: name is empty
    "": rootNode,
  });

  // listen for updates in filesystem
  // first attach listeners, then init root node.
  // because "init root node" runs in parallel with "git clone"
  // TODO perf? cache parent[] by their filePath string
  /** @param {string} fsEventName */
  function fsEventHandlerFactory(fsEventName) {
    if (!fs) {
      throw new Error("no filesystem");
    }
    //const isDirectory = fsEventName == "mkdir";
    return async function handleFsEvent(/** @type {string} */ filePath) {
      filePath = resolveFilePath(filePath);
      debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): filePath`, filePath);
      const keys = filePath.split(`/`);
      debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): keys`, keys);
      /** @type {FileSystemNode} */
      let parent = tree[""];
      let nodeName = keys.slice(-1)[0];
      debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): nodeName`, nodeName);
      /** @type {string[]} */
      const parentKeys = [];
      // loop parent dirs
      // keys[0] is always ``
      debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): parent keys`, keys.slice(1, -1))
      for (const part of keys.slice(1, -1)) {
        if (parent.children == null) {
          // node is not visible
          debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): node is not visible, parent dir is not visible`);
          return;
        }
        const next = parent.children[part];
        if (!next) {
          // path is not visible
          debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): path is not visible. filePath`, filePath);
          return;
          /*
          nodeName = part;
          break;
          */
        }
        parentKeys.push("children");
        parentKeys.push(part);
        parent = next;
      }
      debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): parentKeys`, parentKeys);
      debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): parent`, unwrap(parent));
      debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): nodeName`, nodeName);

      if (parent.children == null) {
        // node is not visible
        debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): node is not visible`);
        return;
      }
      // TODO
      //if (!parent) return; // filePath is not visible
      // exists?
      // array tree
      //if (parent.children.find(node => node.name == nodeName)) {
      // object tree
      if (parent.children[nodeName]) {
        debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): exists`);
        return;
      }
      // add
      debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): add`);
      /*
      // Cannot mutate a Store directly
      parent.children.push({
        name: nodeName,
        stats: {}, // TODO,
        children: [],
      });
      */
      debug && console.log(`FileSystemView on ${fsEventName}(${filePath}): parentKeys`, parentKeys);
      const newNodeName = nodeName;
      /** @type {FileSystemNode} */
      const newNode = {
        name: nodeName,
        get path() {
          debug && console.log("newNode path: this", this);
          return pathOfNode(this);
        },
        // TODO
        /*
        stats: {
          isDirectory() {
            return isDirectory;
          },
        },
        */
        stats: await fs.promises.stat(filePath),
        //children: {}, // empty
        children: null, // not visible
        parent,
      };
      // array tree
      //setTree("", ...parentKeys, "children", children => children.concat([newNode]));
      // object tree
      // @ts-ignore
      setTree("", ...parentKeys, "children", newNodeName, newNode);
    }
  }

  // listen for write events
  for (const fsEventName of ["mkdir", "writeFile"]) {
    fs._events.on(fsEventName, fsEventHandlerFactory(fsEventName));
  }

  //fs._events.on("writeFile", (...args) => console.log("fs.writeFile", args));
  //fs._events.on("unlink", (...args) => console.log("fs.unlink", args));

  // init tree
  // TODO recursive. load tree of filePath. default filePath is "/"
  //const filePath = "/";
  onMount(async () => {
    debug && console.log("FileSystemView: init tree ...");
    debug && console.log("FileSystemView: init tree ...");
    setTree("", "children", await childrenOfNode(tree[""]));
    //setTree("", "children", { "foo": { name: "foo", stats: {}, children: {} }, });
    debug && console.log("FileSystemView: init tree done");
    debug && console.log("FileSystemView: init tree done");
  });

  /** @param {FileSystemNode} node */
  async function onClickNode(node) {
    debug && console.log("click node", node.path, node);
    if (node.stats.isDirectory()) {
      // expand or collapse
      const storeKeys = storeKeysOfNode(node);
      debug && console.log("click node", node.path, "dir: storeKeys", storeKeys);
      if (node.children == null) {
        // expand
        if (props.openDir) {
          props.openDir(node.path);
        }
        debug && console.log("click node", node.path, "dir: expand children");
        // @ts-ignore
        setTree(...storeKeys, "children", await childrenOfNode(node));
      }
      else {
        // collapse
        if (props.closeDir) {
          props.closeDir(node.path);
        }
        // TODO save/restore the expand/collapsed state.
        // make a snapshot of the expanded child nodes
        // on the next "expand", expand the previously expanded child nodes
        debug && console.log("click node", node.path, "dir: collapse children")
        // @ts-ignore
        setTree(...storeKeys, "children", null);
      }
    }
    else {
      // not a directory: file, symlink, ...
      if (props.setFile) {
        props.setFile(node.path)
      }
    }
  }

  // render tree
  // TODO sort
  return (
    <Show when={tree[""]} fallback={props.fallbackLoading}>
      <ul class="root-dir">
        <Switch>
          <Match when={tree[""].children === null}>
            <li class="loading">(loading)</li>
          </Match>
          <Match when={Object.keys(tree[""].children).length == 0}>
            <li class="empty">(empty)</li>
          </Match>
          <Match when={true}>
            <For each={Object.values(tree[""].children)}>
              {(node) => <Node node={node} onClickNode={onClickNode}/>}
            </For>
          </Match>
        </Switch>
      </ul>
    </Show>
  )
}

/**
  @param {Object} props
  @param {FileSystemNode} props.node
  @param {(node: FileSystemNode) => void} props.onClickNode
*/
function Node(props) {
  //console.log("Node: props.node", props.node);
  //console.log("Node: props.node.stats", props.node.stats);
  return (
    <Show
      when={props.node.stats.isDirectory()}
      fallback={
        <li class="file">
          <div onClick={() => props.onClickNode(props.node)}>{props.node.name}</div>
        </li>
      }
    >
      <li class="dir" class:open={props.node.children !== null}>
        <div onClick={() => props.onClickNode(props.node)}>{props.node.name}/</div>
        <Show when={props.node.children !== null}>
          <ul class="dir">
            <Show
              when={Object.keys(props.node.children || {}).length > 0}
              fallback={<li class="empty">(empty)</li>}
            >
              <For each={Object.values(props.node.children || {})}>
                {(node) => <Node node={node} onClickNode={props.onClickNode}/>}
              </For>
            </Show>
          </ul>
        </Show>
      </li>
    </Show>
  )
}
