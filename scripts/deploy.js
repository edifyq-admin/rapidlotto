const { ethers } = require("hardhat");

const { SEPOLIA_BANKER_PRIVATE, SEPOLIA_GAME_MASTER_PRIVATE, SEPOLIA_ORACLE_PRIVATE } = process.env;

const bankerWallet = new ethers.Wallet(SEPOLIA_BANKER_PRIVATE);
const gameMasterWallet = new ethers.Wallet(SEPOLIA_GAME_MASTER_PRIVATE);
const oracleWallet = new ethers.Wallet(SEPOLIA_ORACLE_PRIVATE);

const main = async() => {
    const RapidLotto = await ethers.getContractFactory('RapidLotto');
    const rapidLotto = await RapidLotto.deploy(bankerWallet, gameMasterWallet, oracleWallet, 10);
    await rapidLotto.deploymentTransaction();
};

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exitCode(1)
    });
