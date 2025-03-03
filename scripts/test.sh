npm run build
# originui
rm -rf public/originui
mkdir -p public/originui
cd public/originui
git clone https://github.com/origin-space/originui .
rm -rf public
node ../../dist/bin/index.js
find . -mindepth 1 ! -path './public*' -delete
mv public/* .
rm -rf public && cd ../../
# tremor
rm -rf public/tremor
mkdir -p public/tremor
cd public/tremor
git clone https://github.com/tremorlabs/tremor .
rm -rf public
node ../../dist/bin/index.js
find . -mindepth 1 ! -path './public*' -delete
mv public/* .
rm -rf public && cd ../../
