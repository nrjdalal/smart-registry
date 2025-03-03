npm run build
# originui
rm -rf public/originui
mkdir -p public/originui
cd public/originui
git clone https://github.com/origin-space/originui .
rm -rf public registry.json
node ../../dist/bin/index.js
find . -mindepth 1 ! -path './public*' -delete
mv public/* .
rm -rf public && cd ../../
# tremor
rm -rf public/tremor
mkdir -p public/tremor
cd public/tremor
git clone https://github.com/tremorlabs/tremor .
rm -rf public registry.json
node ../../dist/bin/index.js
find . -mindepth 1 ! -path './public*' -delete
mv public/* .
rm -rf public && cd ../../
# shadcn
rm -rf public/shadcn
mkdir -p public/shadcn
cd public/shadcn
git clone https://github.com/shadcn-ui/ui .
cd apps/v4
rm -rf public registry.json
node ../../../../dist/bin/index.js
mv public ../../
cd ../../
find . -mindepth 1 ! -path './public*' -delete
mv public/* .
rm -rf public && cd ../../
