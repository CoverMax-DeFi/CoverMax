// scripts/update-frontend-config.ts

import fs from "fs";
import path from "path";

const CHAIN_MAP: Record<string, string> = {
  "545": "chain-545",
  "296": "chain-296",
  "5003": "chain-5003",
  "1449000": "chain-1449000",
};

const CONTRACT_NAME_MAP: Record<string, string> = {
  "RiskTokenModule#RiskVault": "RISK_VAULT",
  "RiskTokenModule#seniorTokenContract": "SENIOR_TOKEN",
  "RiskTokenModule#juniorTokenContract": "JUNIOR_TOKEN",
  "RiskTokenModule#MockAUSDC": "MOCK_AUSDC",
  "RiskTokenModule#MockCUSDT": "MOCK_CUSDT",
  "RiskTokenModule#UniswapV2Factory": "UNISWAP_V2_FACTORY",
  "RiskTokenModule#UniswapV2Router02": "UNISWAP_V2_ROUTER",
  "RiskTokenModule#WETH": "WETH",
  "RiskTokenModule#UniswapV2Pair": "SENIOR_JUNIOR_PAIR",
};

const outputPath = path.resolve(__dirname, "../frontend/src/config/contracts.ts");

function getAddresses(chainId: number) {
  const file = path.resolve(
    __dirname,
    `../ignition/deployments/${CHAIN_MAP[String(chainId)]}/deployed_addresses.json`
  );
  if (!fs.existsSync(file)) return {};
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  const mapped: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const mappedKey = CONTRACT_NAME_MAP[k];
    if (mappedKey) mapped[mappedKey] = v as string;
  }
  return mapped;
}

function main() {
  const addresses: Record<number, Record<string, string>> = {};
  for (const chainId of Object.keys(CHAIN_MAP).map(Number)) {
    addresses[chainId] = getAddresses(chainId);
  }

  // Read the old contracts.ts to preserve enums and helpers
  const oldContent = fs.readFileSync(outputPath, "utf-8");
  const start = oldContent.indexOf("export const MULTI_CHAIN_ADDRESSES");
  const end = oldContent.indexOf("};", start) + 2;
  const before = oldContent.slice(0, start);
  const after = oldContent.slice(end);

  // Build new MULTI_CHAIN_ADDRESSES
  const lines = [`export const MULTI_CHAIN_ADDRESSES: Record<SupportedChainId, Partial<Record<ContractName, string>>> = {`];
  // Map chainId to enum key
  const chainEnumMap: Record<string, string> = {
    "545": "FLOW_TESTNET",
    "296": "HEDERA_TESTNET",
    "5003": "MANTLE_TESTNET",
    "1449000": "XRPL_TESTNET",
  };
  for (const [chainId, contracts] of Object.entries(addresses)) {
    const enumKey = chainEnumMap[chainId];
    lines.push(`  [SupportedChainId.${enumKey}]: {`);
    for (const [name, addr] of Object.entries(contracts)) {
      lines.push(`    [ContractName.${name}]: "${addr}",`);
    }
    lines.push(`  },`);
  }
  lines.push(`};`);

  // Write new file
  fs.writeFileSync(outputPath, before + lines.join("\n") + after);
  console.log("Frontend config updated.");
}

main();