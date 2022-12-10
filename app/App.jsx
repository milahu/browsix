console.log("App.jsx: hello")

//import pkg from "../../package.json"

//import logo from './logo.svg';
//import styles from './App.module.css';

import { onMount, createSignal, Suspense } from "solid-js";
import pify from "pify";
import * as BrowserFS from "browserfs";
import {BootWith} from "../src/kernel/kernel"
import {Terminal} from "./elements/browsix-terminal/browsix-terminal"

function App() {
  const [getKernel, setKernel] = createSignal();
  onMount(async () => {
    const rootFs = await pify(BrowserFS.FileSystem.MountableFileSystem.Create)({
      '/tmp': await pify(BrowserFS.FileSystem.InMemory.Create)({}),
      '/home': await pify(BrowserFS.FileSystem.IndexedDB.Create)({}),
      //'/mnt/usb0': await pify(BrowserFS.FileSystem.LocalStorage.Create)({}),
    })
    BrowserFS.initialize(rootFs);
    BootWith(rootFs, setKernel);
  });
  return (
    <Suspense fallback={<div>Loading kernel ...</div>}>
      <Terminal kernel={getKernel()}/>
    </Suspense>
  )
}

export default App;
