npm run build
mkdir -p "test/cli-originui"
cd "test/cli-originui"
if [ -z "$(ls -A .)" ]; then
  npx gitpick https://github.com/origin-space/originui .
  jq '.scripts["registry:build"] = "npx smart-registry@latest"' package.json >tmp.json && mv tmp.json package.json
  jq 'with_entries(
    if .key == "items" then 
      .value |= map(
        del(.registryDependencies, .dependencies, .files) |
        if .name == "toast" then 
          . + { files: [{ path: "registry/default/ui/toaster.tsx", type: "registry:ui" }] } 
        else 
          . 
        end
      )
    elif .key == "name" then
      .value = "originui"
    elif .key == "homepage" then
      .value = "https://originui.com"
    else 
      . 
    end
  )' registry.json >tmp.json && mv tmp.json registry.json
  npx gitpick@latest https://github.com/nrjdalal/originui/blob/smart-registry/components/component-loader-client.tsx components -o
else
  rm -rf public/r tsconfig.json
  node ../../dist/bin/index.js "$@"
fi
