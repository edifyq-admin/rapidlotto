const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');
const { expect } = require('chai');

const convertBigInt = (value) => {
    // console.log(value);
    return +value.toString();
}

describe("RapidLotto Contract", () => {
    const maxTickets = 10;

    const deployContractFixture = async() => {
        const [ owner, rateOracle, banker, gameMaster, webmaster, player, player1, player2 ] = await ethers.getSigners();

        const RapidLotto = await ethers.getContractFactory('RapidLotto');
        const rapidLotto = await RapidLotto.deploy(banker, gameMaster, rateOracle, maxTickets);
        await rapidLotto.deploymentTransaction();

        return { rapidLotto, owner, rateOracle, banker, gameMaster, webmaster, player, player1, player2 };
    }

    describe('Deployment', () => {

        it('the name and symbol should be correct', async() => {
            const { rapidLotto} = await loadFixture(deployContractFixture);

            expect(await rapidLotto.getName()).to.equal("Rapid Lotto");
            expect(await rapidLotto.getSymbol()).to.equal("RLT");
            expect(await rapidLotto.getMaxTickets()).to.equal(maxTickets);
        });

    });

    describe('Set maximum tickets', () => {

        it('only the game master can set the maximum tickets', async() => {
            const { rapidLotto } = await loadFixture(deployContractFixture);

            await expect(rapidLotto.setMaximumTickets(1))
                .to.be.reverted;
        });

        it('should set the maximum tickets successfully', async() => {
            const { rapidLotto, gameMaster } = await loadFixture(deployContractFixture);
            const maximumTickets = 20;

            await rapidLotto.connect(gameMaster).setMaximumTickets(maximumTickets);

            expect(await rapidLotto.getMaxTickets()).to.equal(maximumTickets);
        });

    });

    describe('Set rate', () => {

        it('should reject an update if not the rate oracle', async() =>{
            const { rapidLotto} = await loadFixture(deployContractFixture);

            await expect(rapidLotto.setRate(10))
                .to.be.reverted;
        });

        it('should update rate successfully', async() => {
            const { rapidLotto, rateOracle } = await loadFixture(deployContractFixture);

            const rate = 10;

            await rapidLotto.connect(rateOracle).setRate(rate);

            expect(await rapidLotto.getRate()).to.equal(rate);

        });

        it('should emit `Rate` on update', async() => {
            const { rapidLotto, rateOracle } = await loadFixture(deployContractFixture);
            
            const rate = 10;

            await expect(rapidLotto.connect(rateOracle).setRate(rate))
                .to.emit(rapidLotto, 'Rate')
                .withArgs(rate);
        });

    });

    describe('Set status', () => {

        it('should set the active status to false when contract is deployed', async() => {
            const { rapidLotto } = await loadFixture(deployContractFixture);

            expect(await rapidLotto.getStatus()).to.be.false;
        });

        it('should reject the status update if not owner', async() => {
            const { rapidLotto, rateOracle } = await loadFixture(deployContractFixture);

            await expect(rapidLotto.connect(rateOracle).setStatus(true))
                .to.be.reverted;
        });

        it('should update the status corectly', async() => {
            const { rapidLotto } = await loadFixture(deployContractFixture);

            await rapidLotto.setStatus(true);

            expect(await rapidLotto.getStatus()).to.be.true;
        });

        it('should emit `Status` on update', async() => {
            const { rapidLotto } = await loadFixture(deployContractFixture);

            await expect(rapidLotto.setStatus(true))
                .to.emit(rapidLotto, 'Status')
                .withArgs(true);
        });

    });

    describe('Deposit', () => {

        it('the rate must be greater than zero', async() => {
            const { rapidLotto } = await loadFixture(deployContractFixture);

            await expect(rapidLotto.deposit())
                .to.be.reverted;
        });

        it('the contract owner cannot make a deposit', async() => {
            const { rapidLotto, rateOracle } = await loadFixture(deployContractFixture);

            await rapidLotto.connect(rateOracle).setRate(10);

            await expect(rapidLotto.deposit())
                .to.be.reverted;
        });

        it('the rate oracle cannot make a deposit', async() => {
            const { rapidLotto, rateOracle } = await loadFixture(deployContractFixture);

            await rapidLotto.connect(rateOracle).setRate(10);

            await expect(rapidLotto.connect(rateOracle).deposit())
                .to.be.reverted;
        });

        it('should increase the player tokens by 10 on a deposit call', async() => {
            const { rapidLotto, owner, rateOracle, player } = await loadFixture(deployContractFixture);

            const value = 10;

            await rapidLotto.connect(rateOracle).setRate(value);

            await rapidLotto.connect(player).deposit();

            expect(await rapidLotto.getBalance(player.address)).to.equal(1000);
        });

        it('should not let the player add more tokens when they have a positive balance', async() => {
            const { rapidLotto, owner, rateOracle, player } = await loadFixture(deployContractFixture);

            const value = 10;

            await rapidLotto.connect(rateOracle).setRate(value);

            await rapidLotto.connect(player).deposit();

            await expect(rapidLotto.connect(player).deposit())
                .to.be.reverted;
        });

    });

    describe('Withdrawal', () => {

        it('should have a balance greater than 0', async() => {
            const { rapidLotto } = await loadFixture(deployContractFixture);

            await expect(rapidLotto.withdraw())
                .to.be.reverted;

        });

        it('should burn the tokens and set the balance to 0', async() => {
            const { rapidLotto, owner, rateOracle, player } = await loadFixture(deployContractFixture);

            await rapidLotto.connect(rateOracle).setRate(1);
            await rapidLotto.connect(player).deposit();

            expect(await rapidLotto.getBalance(player.address)).to.equal(1000);

            await rapidLotto.connect(player).withdraw();

            expect(await rapidLotto.getBalance(player.address)).to.equal(0);

        });
    });

    describe('Buy ticket', () => {

        const picks = [ 1, 2, 3, 4, 5 ];
        const value = 10;

        it('the game should be active', async() => {
            const { rapidLotto, rateOracle, webmaster } = await loadFixture(deployContractFixture);

            await rapidLotto.setStatus(false);

            await expect(rapidLotto.buyTicket(webmaster.address, picks))
                .to.be.reverted;
        });
        
        it('admin accounts cannot buy a ticket', async() => {
            const { rapidLotto, rateOracle, banker, webmaster } = await loadFixture(deployContractFixture);

            await rapidLotto.setStatus(true);

            await expect(rapidLotto.buyTicket(webmaster.address, picks))
                .to.be.reverted;

            await expect(rapidLotto.connect(rateOracle).buyTicket(webmaster.address, picks))
                .to.be.reverted;

            await expect(rapidLotto.connect(banker).buyTicket(webmaster.address, picks))
                .to.be.reverted;
        });

        it('update the balances when a ticket is bought', async() => {
            const { rapidLotto, rateOracle, banker, webmaster, player } = await loadFixture(deployContractFixture);

            await rapidLotto.setStatus(true);
            await rapidLotto.connect(rateOracle).setRate(value);
            await rapidLotto.connect(player).deposit();

            const bankerBalance = +(await rapidLotto.getBalance(banker.address)).toString();
            const playerBalance = +(await rapidLotto.getBalance(player.address)).toString();
            const poolBalance = +(await rapidLotto.getPoolValue()).toString();
            const webmasterBalance = +(await rapidLotto.getBalance(webmaster.address)).toString();

            await rapidLotto.connect(player).buyTicket(webmaster.address, picks);

            expect(+(await rapidLotto.getBalance(banker.address)).toString()).to.equal(bankerBalance + 15);
            expect(+(await rapidLotto.getBalance(player.address)).toString()).to.equal(playerBalance - 100);
            expect(+(await rapidLotto.getPoolValue()).toString()).to.equal(poolBalance + 75);
            expect(+(await rapidLotto.getBalance(webmaster.address)).toString()).to.equal(webmasterBalance + 10);
        });

        it('add the ticket to the pool of tickets', async() => {
            const { rapidLotto, rateOracle, webmaster, player } = await loadFixture(deployContractFixture);

            await rapidLotto.setStatus(true);
            await rapidLotto.connect(rateOracle).setRate(value);
            await rapidLotto.connect(player).deposit();

            await rapidLotto.connect(player).buyTicket(webmaster.address, picks);

            const entries = await rapidLotto.getEntries();

            const [ entry ] = entries[0];
            expect(entry).to.equal(player.address);
        });

        it('emits the `Sale` event when a ticket is sold', async() => {
            const { rapidLotto, rateOracle, webmaster, player } = await loadFixture(deployContractFixture);

            await rapidLotto.setStatus(true);
            await rapidLotto.connect(rateOracle).setRate(value);
            await rapidLotto.connect(player).deposit();

            await expect(rapidLotto.connect(player).buyTicket(webmaster.address, picks))
                .to.emit(rapidLotto, 'Sale');

        });

    });

    describe('Manage game', () => {

        const value = 10;

        it('Winners can only be picked by the game master', async() => {
            const { rapidLotto, player } = await loadFixture(deployContractFixture);

            await expect(rapidLotto.winners(
                [ player.address ],
                [ 1, 2, 3, 4, 7 ]
            ))
                .to.be.reverted;
        });

        it('tickets sold should be more than the minimum limit', async() => {
            const { rapidLotto, gameMaster, player } = await loadFixture(deployContractFixture);

            await expect(rapidLotto.connect(gameMaster).winners(
                [ player.address ],
                [ 1, 2, 3, 4, 7 ]
            ))
                .to.be.reverted;
        });

        it('the pool balance should be divided by the winners and their balances adjusted', async() => {
            const { rapidLotto, rateOracle, gameMaster, webmaster, player, player1, player2 } = await loadFixture(deployContractFixture);

            await rapidLotto.setStatus(true);
            await rapidLotto.connect(rateOracle).setRate(value);

            await rapidLotto.connect(player).deposit();
            await rapidLotto.connect(player).buyTicket(webmaster.address, [ 1, 2, 3, 4, 5 ]);
            const playerBalance = +(await rapidLotto.getBalance(player.address)).toString();

            await rapidLotto.connect(player1).deposit();
            await rapidLotto.connect(player1).buyTicket(webmaster.address, [ 1, 2, 3, 4, 6 ]);
            const player1Balance = +(await rapidLotto.getBalance(player1.address)).toString();

            await rapidLotto.connect(player2).deposit();
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            const player2Balance = +(await rapidLotto.getBalance(player2.address)).toString();

            const poolBalance = +(await rapidLotto.getPoolValue()).toString();

            const gameWinners = [ player.address, player1.address ];
            const gameLotto = [ 1, 2, 3, 4, 7 ];
            await rapidLotto.connect(gameMaster).winners(
                gameWinners,
                gameLotto
            );

            expect(+(await rapidLotto.getBalance(player.address)).toString()).to.equal(playerBalance + (poolBalance / 2));
            expect(+(await rapidLotto.getBalance(player1.address)).toString()).to.equal(player1Balance + (poolBalance / 2));
            expect(+(await rapidLotto.getBalance(player2.address)).toString()).to.equal(player2Balance);

            const result = await rapidLotto.getPreviousResult();
            const [ winners, lotto, prize ] = result;
            expect(winners.length).to.equal(gameWinners.length);
            expect(lotto.map(item => +item.toString())).to.have.all.members(gameLotto);
            expect(+prize.toString()).to.equal(poolBalance / 2);
        });

        it('the pool balance should be 0 and the entries array empty', async() => {
            const { rapidLotto, rateOracle, gameMaster, webmaster, player, player1, player2 } = await loadFixture(deployContractFixture);

            await rapidLotto.setStatus(true);
            await rapidLotto.connect(rateOracle).setRate(value);

            await rapidLotto.connect(player).deposit();
            await rapidLotto.connect(player).buyTicket(webmaster.address, [ 1, 2, 3, 4, 5 ]);
            await rapidLotto.connect(player).buyTicket(webmaster.address, [ 7, 2, 3, 4, 5 ]);
            await rapidLotto.connect(player).buyTicket(webmaster.address, [ 7, 2, 3, 4, 5 ]);
            await rapidLotto.connect(player).buyTicket(webmaster.address, [ 7, 2, 3, 4, 5 ]);
            await rapidLotto.connect(player).buyTicket(webmaster.address, [ 7, 2, 3, 4, 5 ]);

            await rapidLotto.connect(player1).deposit();
            await rapidLotto.connect(player1).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player1).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player1).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player1).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player1).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);

            await rapidLotto.connect(gameMaster).winners(
                [ player.address ],
                [ 1, 2, 3, 4, 5 ]
            );

            expect(+(await rapidLotto.getPoolValue()).toString()).to.equal(0);
            
            const entries = await rapidLotto.getEntries();
            expect(entries.length).to.equal(0);
        });

        it('should emit the winning results', async() => {
            const { rapidLotto, rateOracle, gameMaster, webmaster, player, player1, player2 } = await loadFixture(deployContractFixture);

            await rapidLotto.setStatus(true);
            await rapidLotto.connect(rateOracle).setRate(value);

            await rapidLotto.connect(player).deposit();
            await rapidLotto.connect(player).buyTicket(webmaster.address, [ 1, 2, 3, 4, 5 ]);

            await rapidLotto.connect(player1).deposit();
            await rapidLotto.connect(player1).buyTicket(webmaster.address, [ 1, 2, 3, 4, 6 ]);

            await rapidLotto.connect(player2).deposit();
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);
            await rapidLotto.connect(player2).buyTicket(webmaster.address, [ 7, 2, 3, 4, 6 ]);

            await expect(rapidLotto.connect(gameMaster).winners(
                [ player.address, player1.address ],
                [ 1, 2, 3, 4, 7 ]
            )).to.emit(rapidLotto, 'Winners');

        });

    });

});
