#!/bin/bash

repos=(
  "https://github.com/origin-space/originui originui . --no-utils"
  "https://github.com/shadcn-ui/ui shadcn apps/v4"
  "https://github.com/shadcn-ui/ui shadcn-v3 apps/www"
  "https://github.com/nrjdalal/the-next-starter the-next-starter ."
  "https://github.com/tremorlabs/tremor tremor ."
  "https://github.com/stefan-karger/solid-ui solid-ui apps/docs"
  "https://github.com/kokonut-labs/kokonutui kokonutui . -i registry --remove-prefix kokonutui"
  "https://github.com/cahyawibawa/ui-topia ui-topia apps/web"
)

if [ "$1" == "clear" ]; then
  rm -rf ~/.junk
fi

npm run build

process() {
  local link=$1
  local name=$2
  local workdir=$3

  local junkdir

  junkdir=$([ "$USER" = "nrjdalal" ] && echo "$HOME/.junk" || mktemp -d /tmp/smart-registry.XXXXXXX)

  [ ! -d "$junkdir/$name" ] && npx gitpick@latest $link $junkdir/$name

  rm -rf $junkdir/$name${workdir:+/$workdir}/public/r
  node dist/bin/index.js -c $junkdir/$name${workdir:+/$workdir} ${@:4}
  mkdir -p public/$name
  rsync -a --delete $junkdir/$name${workdir:+/$workdir}/public/r/ public/$name
}

for repo in "${repos[@]}"; do
  process $repo
done
