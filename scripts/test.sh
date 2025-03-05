#!/bin/bash

repos=(
  # "https://github.com/origin-space/originui originui ."
  # "https://github.com/shadcn-ui/ui shadcn ./apps/v4"
  # "https://github.com/shadcn-ui/ui shadcn-v3 ./apps/www"
  "https://github.com/tremorlabs/tremor tremor ."
)

npm run build

process() {
  local repo_url=$1
  local target_dir=$2
  local depth=$3
  rm -rf "test/$target_dir"
  mkdir -p "test/$target_dir"
  cd "test/$target_dir"
  npx gitpick $repo_url .
  cd "$depth"
  rm -rf public registry.json
  local depth_count=$(echo "$depth" | awk -F'/' '{print NF + 1}')
  local node_path=$(printf '../%.0s' $(seq 1 $depth_count))
  cd $node_path
  node dist/bin/index.js -c "test/$target_dir"
  # npx smart-registry@latest -i ".md, .snap, .spec.js, .spec.jsx, .spec.ts, .spec.tsx, .stories.tsx, .test.ts, .test.tsx, demo.tsx, interface.ts, types.ts"
  cd test/$target_dir
  local mv_depth=$(($depth_count - 2))
  local mv_path="."
  if [ $mv_depth -gt 0 ]; then
    mv_path=$(printf '../%.0s' $(seq 1 $mv_depth))
  fi
  mv public $mv_path
  cd $mv_path
  if [ -d "public" ]; then
    find . -mindepth 1 -maxdepth 1 ! -name 'public' -exec rm -rf {} +
  fi
  cd ../../
}

for repo in "${repos[@]}"; do
  process $repo
done
