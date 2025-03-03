npm run build
mkdir -p "test/cli-originui"
cd "test/cli-originui"
if [ -z "$(ls -A .)" ]; then
  npx gitpick https://github.com/origin-space/originui .
fi
rm -rf public/r
node ../../dist/bin/index.js "$@"
