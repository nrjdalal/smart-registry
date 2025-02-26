# Smart Registry

[![Twitter](https://img.shields.io/twitter/follow/nrjdalal_com?label=%40nrjdalal_com)](https://twitter.com/nrjdalal_com)
[![npm](https://img.shields.io/npm/v/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![npm](https://img.shields.io/npm/dt/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![GitHub](https://img.shields.io/github/stars/nrjdalal/smart-registry?color=blue)](https://github.com/nrjdalal/smart-registry)

This project is current in beta. Please report any issues you encounter. Any feedback is welcome.

> README.md is still in progress. Please check back later for more information.

## Introduction

Zero-configuration and isolated registry without registry dependencies for building a component library or a design system.

## Features

- Auto find imports and dependencies recursively
- No external registryDependencies (therefore single source of truth)

## Usage

If you've registry directory in your project, you can run the following command to generate the registry files. No need to create `registry.json` or anything else.

```bash
npx smart-registry@latest
```

That's it! This will generate all the necessary files for you in `public/r` directory.

If you want to build from some particular directory, you can do so by passing the directory path as an argument.

```bash
npx smart-registry@latest -d "@/components"
```

You can also specify files not just directories.

```bash
npx smart-registry@latest -d "@/app/layout.tsx"
```
