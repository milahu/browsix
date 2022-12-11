# solidjs-filesystem-component

filesystem component for the solid.js framework

## features

- provide filesystem object `fs` for other components
- live view of the filesystem
- expand and collapse directories
- click to select file

## compatible

compatible with 

- the node.js filesystem API (except all the `*Sync` functions)
- browserfs
- lightningfs
- filer
- ...

## install

```sh
npm install -D https://github.com/milahu/solidjs-filesystem-component
```

## usage

see [demo/](demo/)

## develop

```sh
cd $(mktemp -d)
git clone --depth 1 https://github.com/milahu/solidjs-filesystem-component
cd solidjs-filesystem-component/
pnpm install 
npm run dev 
```

## related

- https://github.com/milahu/prosemirror-inplace-editing-demo
- https://github.com/milahu/solidjs-treeview-component
- https://github.com/aquaductape/solid-tree-view
