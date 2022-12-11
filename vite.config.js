// vite.config.js
//import { resolve } from 'path'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid';
import nodePolyfills from 'vite-plugin-node-stdlib-browser'

// https://github.com/rollup/rollup/issues/2097
// https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars
//import dynamicGlobImports from '@rollup/plugin-dynamic-import-vars'

import compileTime from "vite-plugin-compile-time"

export default defineConfig({
  plugins: [
    solidPlugin(),
    //nodePolyfills(),
    //dynamicGlobImports(),
    compileTime(),
  ],
  build: {
    rollupOptions: {
      /*
      input: {
        app: resolve(__dirname, 'app/index.html'),
        //nested: resolve(__dirname, 'nested/index.html'),
      },
      */
    },
  },
  base: "./", // emit relative paths
  clearScreen: false,
});

/*
GET http://localhost:5174/node_modules/.vite/deps/browserfs_dist_node_core_node_fs_stats.js?v=6c974062 net::ERR_BLOCKED_BY_CLIENT
workaround: disable adblocker (ublock origin)
*/
