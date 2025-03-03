npm run build
rm -rf public/originui
mkdir -p public/originui
cd public/originui
git clone https://github.com/origin-space/originui .
rm -rf public
node ../../dist/bin/index.js
find . -mindepth 1 ! -path './public*' -delete
mv public/* .
rm -rf public
