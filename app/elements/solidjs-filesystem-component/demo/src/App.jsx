/*
import logo from './logo.svg';
import styles from './App.module.css';
*/

import { onMount, onCleanup, createSignal, lazy, Suspense, Switch, Match } from "solid-js";

import pkg from "../../package.json"

//import EditMenu from "./EditMenu.jsx";
const EditMenu = lazy(async () => {
  return import("./EditMenu.jsx")
});

// TODO move
/*
git mv App.jsx AppLoader.jsx
git mv EditMenu.jsx App.jsx
*/

function App() {
  const [isActive, set_isActive] = createSignal(false);
  return (
    <div>
      <div>source code: <a href={pkg.homepage}>{pkg.homepage}</a></div>
      <Switch>
        <Match when={isActive()}>
          <Suspense fallback={<div>Loading editor ...</div>}>
            <EditMenu/>
          </Suspense>
        </Match>
        <Match when={true}>
          <button onclick={() => set_isActive(true)}>edit this page</button>
        </Match>
      </Switch>
    </div>
  )
}

export default App;
