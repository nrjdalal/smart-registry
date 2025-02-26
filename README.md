# Smart Registry

This project is current in beta. Please report any issues you encounter. Any feedback is welcome.

## Introduction

Zero-configuration and isolated registry without registry dependencies for your UI components.

## Features

- Auto find imported and dependencies recursively
- No external registry dependencies (therefore single source of truth)

## Usage

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
