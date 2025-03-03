#!/bin/bash

repos=(
  "https://github.com/ant-design/ant-design ant-design ."
  "https://github.com/origin-space/originui originui ."
  "https://github.com/shadcn-ui/ui shadcn ./apps/v4"
  "https://github.com/shadcn-ui/ui shadcn-v3 ./apps/www"
  "https://github.com/tremorlabs/tremor tremor ."
)

npm run build

rm -rf public

process() {
  local repo_url=$1
  local target_dir=$2
  local depth=$3
  rm -rf "public/$target_dir"
  mkdir -p "public/$target_dir"
  cd "public/$target_dir"
  npx gitpick $repo_url .
  cd "$depth"
  rm -rf public registry.json
  local depth_count=$(echo "$depth" | awk -F'/' '{print NF + 1}')
  local node_path=$(printf '../%.0s' $(seq 1 $depth_count))
  node $node_path/dist/bin/index.js -i ".md, .spec.ts, .spec.tsx, .stories.tsx, demo.tsx"
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
  mv public/* .
  rm -rf public
  cd ../../
}

for repo in "${repos[@]}"; do
  process $repo
done
