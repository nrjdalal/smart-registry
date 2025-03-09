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
  local workdir=$3
  local junkdir

  junkdir=$([ "$USER" = "nrjdalal" ] && echo "$HOME/.junk" || mktemp -d /tmp/smart-registry.XXXXXXX)

  [ ! -d "$junkdir/$name" ] && npx gitpick@latest $link $junkdir/$name

  rm -rf $junkdir/$name${workdir:+/$workdir}/public $junkdir/$name${workdir:+/$workdir}/registry.json
  node dist/bin/index.js -c $junkdir/$name${workdir:+/$workdir}
  mkdir -p public/$name
  rsync -a --delete $junkdir/$name${workdir:+/$workdir}/public/r/ public/$name
}

for repo in "${repos[@]}"; do
  process $repo
done
