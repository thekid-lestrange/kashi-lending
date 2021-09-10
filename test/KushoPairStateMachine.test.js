const { ethers, deployments } = require("hardhat")
const { getBigNumber, advanceBlock, advanceTime, setMasterContractApproval, createFixture, KushoPair } = require("@polycity/hardhat-framework")
const KushoPairStateMachine = require("./KushoPairStateMachine.js")

describe("KushoPair", function () {
    let cmd, fixture

    before(async function () {
        fixture = await createFixture(deployments, this, async (cmd) => {
            await cmd.deploy("weth9", "WETH9Mock")
            await cmd.deploy("antiqueBox", "AntiqueBoxMock", this.weth9.address)

            await cmd.addToken("collateralToken", "Token A", "A", 18, this.ReturnFalseERC20Mock)
            await cmd.addToken("assetToken", "Token B", "B", 8, this.RevertingERC20Mock)
            await cmd.addPair("polyCityDexPair", this.collateralToken, this.assetToken, 50000, 50000)

            await cmd.deploy("kushoPair", "KushoPair", this.antiqueBox.address)
            await cmd.deploy("oracle", "OracleMock")
            await cmd.deploy("swapper", "PolyCityDexSwapper", this.antiqueBox.address, this.factory.address, await this.factory.pairCodeHash())
            await this.kushoPair.setSwapper(this.swapper.address, true)
            await this.kushoPair.setFeeTo(this.alice.address)

            await this.oracle.set(getBigNumber(1, 28))
            const oracleData = await this.oracle.getDataParameter()

            await cmd.addKushoPair("pairHelper", this.antiqueBox, this.kushoPair, this.collateralToken, this.assetToken, this.oracle, oracleData)

            await cmd.deploy(
                "strategy",
                "FlashloanStrategyMock",
                this.antiqueBox.address,
                this.pairHelper.contract.address,
                this.assetToken.address,
                this.collateralToken.address,
                this.swapper.address,
                this.factory.address
            )
            await this.antiqueBox.setStrategy(this.assetToken.address, this.strategy.address)
            await advanceTime(1209600, ethers)
            await this.antiqueBox.setStrategy(this.assetToken.address, this.strategy.address)
            await this.antiqueBox.setStrategyTargetPercentage(this.assetToken.address, 20)

            // Two different ways to approve the kushoPair
            await setMasterContractApproval(this.antiqueBox, this.alice, this.alice, this.alicePrivateKey, this.kushoPair.address, true)
            await setMasterContractApproval(this.antiqueBox, this.bob, this.bob, this.bobPrivateKey, this.kushoPair.address, true)

        })
    })

    describe("KushoPairStateMachine", function () {
        const DEPOSIT_AMOUNT = 1000

        before(async function () {
            cmd = await fixture()
        })

        it("Setup state machine", async function () {
            this.stateMachine = new KushoPairStateMachine({
                kushoPair: this.pairHelper.contract,
                antiqueBox: this.antiqueBox,
            })
            await this.stateMachine.init()
        })

        afterEach(async function () {
            await this.stateMachine.drainEvents()
        })

        it("Approvals for deposit", async function () {
            await this.collateralToken.approve(this.antiqueBox.address, getBigNumber(DEPOSIT_AMOUNT, await this.collateralToken.decimals()))
            await this.assetToken.approve(this.antiqueBox.address, getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals()))
        })

        it("deposit", async function () {
            await this.antiqueBox.deposit(
                this.collateralToken.address,
                this.alice.address,
                this.alice.address,
                0,
                getBigNumber(DEPOSIT_AMOUNT, await this.collateralToken.decimals())
            )
            await this.antiqueBox.deposit(
                this.assetToken.address,
                this.alice.address,
                this.alice.address,
                0,
                getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals())
            )
        })

        it("add asset & collateral", async function () {
            await this.pairHelper.contract.addAsset(this.alice.address, false, getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals()))
            await this.pairHelper.contract.addCollateral(
                this.alice.address,
                false,
                getBigNumber(DEPOSIT_AMOUNT, await this.collateralToken.decimals())
            )
        })

        it("update exchange rate", async function () {
            await this.pairHelper.contract.updateExchangeRate()
        })

        it("borrow", async function () {
            await this.pairHelper.contract.borrow(this.alice.address, 1)
        })

        it("borrow", async function () {
            await this.pairHelper.contract.borrow(this.alice.address, 1)
        })

        it("repay", async function () {
            await this.pairHelper.contract.repay(this.alice.address, false, 1)
        })

        it("remove collateral", async function () {
            await this.pairHelper.contract.removeCollateral(this.alice.address, 1)
        })

        it("remove asset", async function () {
            await this.pairHelper.contract.removeAsset(this.alice.address, 1)
        })

        describe("skim", function () {
            it("Approvals for deposit", async function () {
                await this.collateralToken.approve(this.antiqueBox.address, getBigNumber(DEPOSIT_AMOUNT, await this.collateralToken.decimals()))
                await this.assetToken.approve(this.antiqueBox.address, getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals()))
            })

            it("deposit", async function () {
                await this.antiqueBox.deposit(
                    this.collateralToken.address,
                    this.alice.address,
                    this.pairHelper.contract.address,
                    0,
                    getBigNumber(DEPOSIT_AMOUNT, await this.collateralToken.decimals())
                )
                await this.antiqueBox.deposit(
                    this.assetToken.address,
                    this.alice.address,
                    this.pairHelper.contract.address,
                    0,
                    getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals())
                )
            })

            it("add asset", async function () {
                await this.pairHelper.contract.addAsset(
                    this.alice.address,
                    true,
                    getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals()).sub(2)
                )
            })

            it("add collateral", async function () {
                await this.pairHelper.contract.addCollateral(
                    this.alice.address,
                    true,
                    getBigNumber(DEPOSIT_AMOUNT, await this.collateralToken.decimals())
                )
            })

            it("borrow", async function () {
                await this.pairHelper.contract.borrow(this.alice.address, getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals()))
            })

            it("advance blocks for accrue", async function () {
                for (let i = 0; i < 0xff; i++) {
                    await advanceBlock(ethers)
                }
            })

            it("accrue", async function () {
                await this.pairHelper.contract.accrue()
            })

            it("repay", async function () {
                await this.pairHelper.contract.repay(this.alice.address, true, 1)
            })

            it("remove collateral", async function () {
                await this.pairHelper.contract.removeCollateral(this.alice.address, 1)
            })

            it("remove asset", async function () {
                await this.pairHelper.contract.removeAsset(this.alice.address, 1)
            })

            it("withdraw fees", async function () {
                await this.pairHelper.contract.withdrawFees()
            })

            it("modify exchange rate", async function () {
                await this.oracle.set(getBigNumber(2, 28))
            })

            it("deposit collateral", async function () {
                await this.assetToken
                    .connect(this.bob)
                    .approve(this.antiqueBox.address, getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals()))
                await this.antiqueBox
                    .connect(this.bob)
                    .deposit(
                        this.assetToken.address,
                        this.bob.address,
                        this.bob.address,
                        0,
                        getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals())
                    )
            })

            it("open liquidation", async function () {
                const collateral = (await this.pairHelper.contract.userBorrowPart(this.alice.address)).div(2)
                await this.pairHelper.contract
                    .connect(this.bob)
                    .liquidate([this.alice.address], [collateral], this.bob.address, "0x0000000000000000000000000000000000000000", true)
            })

            it("closed liquidation", async function () {
                const collateral = (await this.pairHelper.contract.userBorrowPart(this.alice.address)).div(2)
                await this.pairHelper.contract
                    .connect(this.bob)
                    .liquidate([this.alice.address], [collateral], this.swapper.address, this.swapper.address, false)
            })

            it("alice: repay leftover", async function () {
                const val = await this.pairHelper.contract.userBorrowPart(this.alice.address)
                await this.pairHelper.contract.repay(this.alice.address, false, val)
            })
        })

        describe("Harvesting strategy that uses flashloans to liquidate borrowers", function () {
            const HARVEST_MAX_AMOUNT = 1

            it("Approvals for deposit", async function () {
                await this.collateralToken.approve(this.antiqueBox.address, getBigNumber(DEPOSIT_AMOUNT, await this.collateralToken.decimals()))
                await this.assetToken.approve(this.antiqueBox.address, getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals()))
            })

            it("deposit", async function () {
                await this.antiqueBox.deposit(
                    this.collateralToken.address,
                    this.alice.address,
                    this.alice.address,
                    0,
                    getBigNumber(DEPOSIT_AMOUNT, await this.collateralToken.decimals())
                )
                await this.antiqueBox.deposit(
                    this.assetToken.address,
                    this.alice.address,
                    this.alice.address,
                    0,
                    getBigNumber(DEPOSIT_AMOUNT, await this.assetToken.decimals())
                )
            })

            it("add collateral", async function () {
                await this.pairHelper.contract.addCollateral(
                    this.alice.address,
                    false,
                    getBigNumber(DEPOSIT_AMOUNT, await this.collateralToken.decimals())
                )
            })

            it("borrow", async function () {
                await this.pairHelper.contract.borrow(this.alice.address, getBigNumber(DEPOSIT_AMOUNT / 4, await this.assetToken.decimals()))
            })

            it("modify exchange rate", async function () {
                await this.oracle.set(getBigNumber(20, 28))
            })

            it("whitelist kushoPair", async function () {
                await this.antiqueBox.whitelistMasterContract(this.kushoPair.address, true)
            })

            it("harvest", async function () {
                await this.antiqueBox.harvest(this.assetToken.address, true, HARVEST_MAX_AMOUNT)
            })
        })
    })
})
