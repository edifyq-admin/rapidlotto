import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'dotenv';

const { SEPOLIA_API_URL, SEPOLIA_PRIVATE_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      blockGasLimit: 429720000000
    },
    sepolia: {
      url: SEPOLIA_API_URL,
      accounts: [ `0x${SEPOLIA_PRIVATE_KEY}`]
    }
  }
};

export default config;
