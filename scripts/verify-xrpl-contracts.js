const { run } = require("hardhat");

async function main() {
  console.log("Verifying contracts on XRPL EVM Sidechain...");
  
  const contracts = [
    // RiskVault contract
    {
      address: process.env.RISK_VAULT_ADDRESS,
      constructorArguments: [
        process.env.MOCK_AUSDC_ADDRESS,
        process.env.MOCK_CUSDT_ADDRESS
      ],
      name: "RiskVault"
    },
    // MockAUSDC token
    {
      address: process.env.MOCK_AUSDC_ADDRESS,
      constructorArguments: [],
      name: "MockAUSDC"
    },
    // MockCUSDT token
    {
      address: process.env.MOCK_CUSDT_ADDRESS,
      constructorArguments: [],
      name: "MockCUSDT"
    },
    // UniswapV2Factory
    {
      address: process.env.UNISWAP_V2_FACTORY_ADDRESS,
      constructorArguments: [process.env.FEE_TO_SETTER || "0x0000000000000000000000000000000000000000"],
      name: "UniswapV2Factory"
    },
    // UniswapV2Router02
    {
      address: process.env.UNISWAP_V2_ROUTER_ADDRESS,
      constructorArguments: [
        process.env.UNISWAP_V2_FACTORY_ADDRESS,
        process.env.WETH_ADDRESS
      ],
      name: "UniswapV2Router02"
    },
    // WETH
    {
      address: process.env.WETH_ADDRESS,
      constructorArguments: [],
      name: "WETH"
    },
    // SeniorToken
    {
      address: process.env.SENIOR_TOKEN_ADDRESS,
      constructorArguments: [process.env.RISK_VAULT_ADDRESS],
      name: "SeniorToken"
    },
    // JuniorToken
    {
      address: process.env.JUNIOR_TOKEN_ADDRESS,
      constructorArguments: [process.env.RISK_VAULT_ADDRESS],
      name: "JuniorToken"
    }
  ];

  for (const contract of contracts) {
    if (!contract.address) {
      console.log(`Skipping ${contract.name} - no address provided`);
      continue;
    }

    try {
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
        network: "xrplTestnet"
      });
      console.log(`${contract.name} verified successfully`);
    } catch (error) {
      if (error.toString().includes("already verified")) {
        console.log(`${contract.name} is already verified`);
      } else {
        console.error(`Error verifying ${contract.name}:`, error);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });