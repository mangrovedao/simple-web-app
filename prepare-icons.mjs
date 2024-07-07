import { cpSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import map from "cryptocurrency-icons/manifest.json" assert { type: "json" };

function copyIcons() {
  cpSync(
    "./node_modules/cryptocurrency-icons/svg",
    "./public/cryptocurrency-icons/svg",
    { recursive: true }
  );
  // TODO: to remove after working on a generic mapping
  copyFileSync(
    "./node_modules/cryptocurrency-icons/svg/color/eth.svg",
    "./public/cryptocurrency-icons/svg/color/weth.svg"
  );
  copyFileSync(
    "./node_modules/cryptocurrency-icons/svg/color/matic.svg",
    "./public/cryptocurrency-icons/svg/color/wmatic.svg"
  );
  copyFileSync(
    "./public/custom-token-icons/blast/usdb.svg",
    "./public/cryptocurrency-icons/svg/color/usdb.svg"
  );
  copyFileSync(
    "./public/custom-token-icons/blast/usde.svg",
    "./public/cryptocurrency-icons/svg/color/usde.svg"
  );
  copyFileSync(
    "./public/custom-token-icons/blast/blast.svg",
    "./public/cryptocurrency-icons/svg/color/blast.svg"
  );
}

function genetareDicFromManifestFile() {
  const dic = Object.assign(
    {},
    ...Object.values(map).map(({ symbol, color, name }) => ({
      [symbol]: { color, name, symbol },
    })),
    // TODO: to remove after working on a generic mapping
    { WETH: { color: "#627eea", name: "Wrapped Ethereum", symbol: "WETH" } },
    { WMATIC: { color: "#7F44E0", name: "Wrapped MATIC", symbol: "WMATIC" } },
    { USDB: { color: "#FCFC01", name: "USDB", symbol: "USDB" } },
    { BLAST: { color: "#FCFC01", name: "BLAST", symbol: "BLAST" } },
    { USDe: { color: "#FFFFFF", name: "USDe", symbol: "USDe" } }
  );
  mkdirSync("./generated", { recursive: true });
  writeFileSync("./generated/icons.json", JSON.stringify(dic));
}

(() => {
  copyIcons();
  genetareDicFromManifestFile();
})();
