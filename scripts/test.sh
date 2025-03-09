#!/bin/bash

repos=(
  "https://github.com/nrjdalal/better-next better-next"
  "https://github.com/origin-space/originui originui"
  "https://github.com/shadcn-ui/ui shadcn apps/v4"
  "https://github.com/shadcn-ui/ui shadcn-v3 apps/www"
  "https://github.com/tremorlabs/tremor tremor"
)

npm run build

process() {
  local link=$1
  local name=$2
  local wdir=$3
  local tdir=$(mktemp -d)
  npx gitpick@latest $link $tdir/$name
  rm -rf $tdir/$name${wdir:+/$wdir}/public $tdir/$name${wdir:+/$wdir}/registry.json
  node dist/bin/index.js -c $tdir/$name${wdir:+/$wdir}
  mkdir -p test/$name
  rsync -a --delete $tdir/$name${wdir:+/$wdir}/public/r/ test/$name
  rm -rf $tdir
}

for repo in "${repos[@]}"; do
  process $repo
done
