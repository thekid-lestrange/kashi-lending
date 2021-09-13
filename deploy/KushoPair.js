const {
    weth,
    getBigNumber
} = require("@polycity/hardhat-framework")

module.exports = async function (hre) {
    const factory_abi = [{
        inputs: [],
        name: "pairCodeHash",
        outputs: [{
            internalType: "bytes32",
            name: "",
            type: "bytes32"
        }],
        stateMutability: "pure",
        type: "function",
    }, ]

    const signers = await hre.ethers.getSigners()
    const deployer = signers[0]
    const funder = signers[1]

    const chainId = await hre.getChainId()
    if (chainId == "31337" || hre.network.config.forking) {
        return
    }
    if (!weth(chainId)) {
        console.log("No WETH address for chain", chainId)
        return
    }
    console.log("Chain:", chainId)
    console.log("Deployer:", deployer)
    console.log("Funder:", funder)
    console.log("Balance:", (await funder.getBalance()).div("1000000000000000000").toString())
    const deployerBalance = await deployer.getBalance()

    let pichiOwner = "0xd4eD0FF35CE7527105F5A958EdE7dF88a1D3FEa5"
    if (chainId == "1") {
        pichiOwner = "0x19B3Eb3Af5D93b77a5619b047De0EED7115A19e7"
    }

    let gasPrice = await funder.provider.getGasPrice()
    if (chainId == 1) {
        gasPrice = gasPrice.add("20000000000")
    }
    let multiplier = hre.network.tags && hre.network.tags.staging ? 2 : 1
    let finalGasPrice = gasPrice.mul(multiplier)

    //const gasLimit = 5000000 + 5500000 + 1300000 + 300000 + 1000000 + 1000000 + 500000 + 5200000 + 450000 + 500000
    gasLimit = 5700000
    if (chainId == "88" || chainId == "89") {
        finalGasPrice = getBigNumber("10000", 9)
    }
    console.log("Gasprice:", gasPrice.toString(), " with multiplier ", multiplier, "final", finalGasPrice.toString())

    let factory = "0x9B16AFA049C97001B8a27f3dd1753095889d0c4E"
    if (chainId == "1") {
        factory = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac"
    }

    const initCodeHash = await new ethers.Contract(factory, factory_abi, deployer).pairCodeHash()
    console.log("InitCodeHash is", initCodeHash)

    console.log("Deployer balance", deployerBalance.toString())
    console.log("Needed", finalGasPrice.mul(gasLimit).toString(), finalGasPrice.toString(), gasLimit.toString())
    if (deployerBalance.lt(finalGasPrice.mul(gasLimit))) {
        console.log("Sending native token to fund deployment:", finalGasPrice.mul(gasLimit).sub(deployerBalance).toString())
        let tx = await funder.sendTransaction({
            to: deployer.address,
            value: finalGasPrice.mul(gasLimit).sub(deployerBalance),
            gasPrice: gasPrice.mul(multiplier),
        })
        await tx.wait()
    }

    console.log("Deploying Antiquebox contract")
    tx = await hre.deployments.deploy("AntiqueBoxV1", {
        from: deployer.address,
        args: [weth(chainId)],
        log: true,
        deterministicDeployment: false,
        gasLimit: 5000000,
        gasPrice: finalGasPrice,
    })

    const antiquebox = (await hre.ethers.getContractFactory("AntiqueBoxV1")).attach((await deployments.get("AntiqueBoxV1")).address)
    if (antiquebox.address) {
        console.log("Start verify AntiqueBoxV1 Source code", antiquebox.address)
        try {
            await run("verify:verify", {
                contract: "contracts/flat/AntiqueBoxFlat.sol:AntiqueBoxV1",
                address: antiquebox.address,
                constructorArguments: [weth(chainId)],
            });
        } catch (e) {
            console.log(`Failed to verify contract: ${e}`);
        }
    };
    // const antiquebox = (await hre.ethers.getContractFactory("AntiqueBoxV1")).attach("0xF5BCE5077908a1b7370B9ae04AdC565EBd643966")
    console.log("Deploying KushoPair contract, using AntiqueBox", antiquebox.address)
    tx = await hre.deployments.deploy("KushoPairMediumRiskV1", {
        from: deployer.address,
        args: [antiquebox.address],
        log: true,
        deterministicDeployment: false,
        gasLimit: 5500000,
        gasPrice: finalGasPrice,
    })
    const kushopair = (await hre.ethers.getContractFactory("KushoPairMediumRiskV1")).attach((await deployments.get("KushoPairMediumRiskV1")).address)
    if (kushopair.address) {
        console.log("Start verify KushoPairMediumRiskV1 Source code", kushopair.address)
        try {
            await run("verify:verify", {
                contract: "contracts/flat/KushoPairFlat.sol:KushoPairMediumRiskV1",
                address: kushopair.address,
                constructorArguments: [antiquebox.address],
            });
        } catch (e) {
            console.log(`Failed to verify contract: ${e}`);
        }
    };

    console.log("Deploying Swapper contract")
    tx = await hre.deployments.deploy("PolyCityDexSwapperV1", {
        from: deployer.address,
        args: [antiquebox.address, factory, initCodeHash],
        log: true,
        deterministicDeployment: false,
        gasLimit: 1300000,
        gasPrice: finalGasPrice,
    })
    const swapper = (await hre.ethers.getContractFactory("PolyCityDexSwapperV1")).attach((await deployments.get("PolyCityDexSwapperV1")).address)
    if (swapper.address) {
        console.log("Start verify PolyCityDexSwapperV1 Source code", swapper.address)
        try {
            await run("verify:verify", {
                contract: "contracts/flat/PolyCityDexSwapperFlat.sol:PolyCityDexSwapperV1",
                address: swapper.address,
                constructorArguments: [antiquebox.address, factory, initCodeHash],
            });
        } catch (e) {
            console.log(`Failed to verify contract: ${e}`);
        }
    };

    console.log("Deploying PeggedOracle contract")
    tx = await hre.deployments.deploy("PeggedOracleV1", {
        from: deployer.address,
        args: [],
        log: true,
        deterministicDeployment: false,
        gasLimit: 300000,
        gasPrice: finalGasPrice,
    })
    const pegOracle = (await hre.ethers.getContractFactory("PeggedOracleV1")).attach((await deployments.get("PeggedOracleV1")).address)
    if (pegOracle.address) {
        console.log("Start verify PeggedOracleV1 Source code", pegOracle.address)
        try {
            await run("verify:verify", {
                contract: "contracts/flat/PeggedOracleFlat.sol:PeggedOracleV1",
                address: pegOracle.address,
                constructorArguments: [],
            });
        } catch (e) {
            console.log(`Failed to verify contract: ${e}`);
        }
    };

    console.log("Deploying SimplePolyLpTWAP0Oracle contract")
    tx = await hre.deployments.deploy("SimplePolyLpTWAP0OracleV1", {
        from: deployer.address,
        args: [],
        log: true,
        deterministicDeployment: false,
        gasLimit: 1000000,
        gasPrice: finalGasPrice,
    })
    const twap0Oracle = (await hre.ethers.getContractFactory("SimplePolyLpTWAP0OracleV1")).attach((await deployments.get("SimplePolyLpTWAP0OracleV1")).address)
    if (twap0Oracle.address) {
        console.log("Start verify SimplePolyLpTWAP0OracleV1 Source code", twap0Oracle.address)
        try {
            await run("verify:verify", {
                contract: "contracts/flat/SimplePolyLpTWAP0OracleFlat.sol:SimplePolyLpTWAP0OracleV1",
                address: twap0Oracle.address,
                constructorArguments: [],
            });
        } catch (e) {
            console.log(`Failed to verify contract: ${e}`);
        }
    };

    console.log("Deploying SimplePolyLpTWAP1Oracle contract")
    tx = await hre.deployments.deploy("SimplePolyLpTWAP1OracleV1", {
        from: deployer.address,
        args: [],
        log: true,
        deterministicDeployment: false,
        gasLimit: 1000000,
        gasPrice: finalGasPrice,
    })
    const twap1Oracle = (await hre.ethers.getContractFactory("SimplePolyLpTWAP1OracleV1")).attach((await deployments.get("SimplePolyLpTWAP1OracleV1")).address)
    if (twap1Oracle.address) {
        console.log("Start verify SimplePolyLpTWAP1OracleV1 Source code", twap1Oracle.address)
        try {
            await run("verify:verify", {
                contract: "contracts/flat/SimplePolyLpTWAP1OracleFlat.sol:SimplePolyLpTWAP1OracleV1",
                address: twap1Oracle.address,
                constructorArguments: [],
            });
        } catch (e) {
            console.log(`Failed to verify contract: ${e}`);
        }
    };

    console.log("Deploying ChainlinkOracle contract")
    tx = await hre.deployments.deploy("ChainlinkOracleV1", {
        from: deployer.address,
        args: [],
        log: true,
        deterministicDeployment: false,
        gasLimit: 500000,
        gasPrice: finalGasPrice,
    })
    const chainlinkOracle = (await hre.ethers.getContractFactory("ChainlinkOracleV1")).attach((await deployments.get("ChainlinkOracleV1")).address)
    if (chainlinkOracle.address) {
        console.log("Start verify ChainlinkOracleV1 Source code", chainlinkOracle.address)
        try {
            await run("verify:verify", {
                contract: "contracts/flat/ChainlinkOracleFlat.sol:ChainlinkOracleV1",
                address: chainlinkOracle.address,
                constructorArguments: [],
            });
        } catch (e) {
            console.log(`Failed to verify contract: ${e}`);
        }
    };

    console.log("Deploying BoringHelper contract")
    tx = await hre.deployments.deploy("BoringHelperV1", {
        from: deployer.address,
        args: [
            chainId == 1 ? "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd" : "0x80C7DD17B01855a6D2347444a0FCC36136a314de",
            chainId == 1 ? "0xE11fc0B43ab98Eb91e9836129d1ee7c3Bc95df50" : "0x1b9d177CcdeA3c79B6c8F40761fc8Dc9d0500EAa",
            chainId == 1 ? "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2" : "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F",
            weth(chainId),
            chainId == 1 ?
            "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" :
            chainId == 3 ?
            "0xbde8bb00a7ef67007a96945b3a3621177b615c44" :
            "0x0000000000000000000000000000000000000000",
            chainId == 1 ?
            "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac" :
            chainId == 3 ?
            "0xc35DADB65012eC5796536bD9864eD8773aBc74C4" :
            "0x0000000000000000000000000000000000000000",
            chainId == 1 ?
            "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" :
            chainId == 3 ?
            "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" :
            "0x0000000000000000000000000000000000000000",
            chainId == 1 ? "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272" : "0x1be211D8DA40BC0ae8719c6663307Bfc987b1d6c",
            antiquebox.address,
        ],
        log: true,
        deterministicDeployment: false,
        gasLimit: 5200000,
        gasPrice: finalGasPrice,
    })
    const boringHelper = (await hre.ethers.getContractFactory("BoringHelperV1")).attach((await deployments.get("BoringHelperV1")).address)
    if (boringHelper.address) {
        console.log("Start verify BoringHelperV1 Source code", boringHelper.address)
        try {
            await run("verify:verify", {
                contract: "contracts/flat/BoringHelperFlat.sol:BoringHelperV1",
                address: boringHelper.address,
                constructorArguments: [
                    chainId == 1 ? "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd" : "0x80C7DD17B01855a6D2347444a0FCC36136a314de",
                    chainId == 1 ? "0xE11fc0B43ab98Eb91e9836129d1ee7c3Bc95df50" : "0x1b9d177CcdeA3c79B6c8F40761fc8Dc9d0500EAa",
                    chainId == 1 ? "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2" : "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F",
                    weth(chainId),
                    chainId == 1 ?
                    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" :
                    chainId == 3 ?
                    "0xbde8bb00a7ef67007a96945b3a3621177b615c44" :
                    "0x0000000000000000000000000000000000000000",
                    chainId == 1 ?
                    "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac" :
                    chainId == 3 ?
                    "0xc35DADB65012eC5796536bD9864eD8773aBc74C4" :
                    "0x0000000000000000000000000000000000000000",
                    chainId == 1 ?
                    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" :
                    chainId == 3 ?
                    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" :
                    "0x0000000000000000000000000000000000000000",
                    chainId == 1 ? "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272" : "0x1be211D8DA40BC0ae8719c6663307Bfc987b1d6c",
                    antiquebox.address,
                ],
            });
        } catch (e) {
            console.log(`Failed to verify contract: ${e}`);
        }
    };

    // const swapper = (await hre.ethers.getContractFactory("PolyCityDexSwapperV1")).attach("0x1766733112408b95239aD1951925567CB1203084")
    try {
        console.log("Whitelisting Swapper")
        tx = await kushopair.connect(deployer).setSwapper(swapper.address, true, {
            gasLimit: 100000,
            gasPrice: finalGasPrice,
        })
        await tx.wait()
    } catch (e) {
        console.log(`Swapper already whitelisted: ${e}`);
    }

    try {
        console.log("Update KushoPair Owner")
        tx = await kushopair.connect(deployer).transferOwnership(pichiOwner, true, false, {
            gasLimit: 100000,
            gasPrice: finalGasPrice,
        })
        await tx.wait()
    } catch (e) {
        console.log(`KushoPair already transferOwnership: ${e}`);
    }

    try {
        console.log("Whitelisting KushoPair")
        tx = await antiquebox.whitelistMasterContract(kushopair.address, true, {
            gasLimit: 100000,
            gasPrice: finalGasPrice,
        })
        await tx.wait()
    } catch (e) {
        console.log(`KushoPair already whitelisted: ${e}`);
    }

    try {
        console.log("Update AntiqueBox Owner")
        await antiquebox.transferOwnership(pichiOwner, true, false, {
            gasLimit: 100000,
            gasPrice: finalGasPrice,
        })
    } catch (e) {
        console.log(`AntiqueBox already transferOwnership: ${e}`);
    }

    console.log("Deploying ChainlinkOracleV2 contract")
    tx = await hre.deployments.deploy("ChainlinkOracleV2", {
        from: deployer.address,
        args: [],
        log: true,
        deterministicDeployment: false,
        gasLimit: 450000,
        gasPrice: finalGasPrice,
    })
    const chainlinkOracleV2 = (await hre.ethers.getContractFactory("ChainlinkOracleV2")).attach((await deployments.get("ChainlinkOracleV2")).address)
    if (chainlinkOracleV2.address) {
        console.log("Start verify ChainlinkOracleV2 Source code", chainlinkOracleV2.address)
        try {
            await run("verify:verify", {
                contract: "contracts/flat/ChainlinkOracleV2Flat.sol:ChainlinkOracleV2",
                address: chainlinkOracleV2.address,
                constructorArguments: [],
            });
        } catch (e) {
            console.log(`Failed to verify contract: ${e}`);
        }
    };
}
/* 
function verify(apikey, address, source, contractname, license, runs) {
    var request = require("request")
    request.post(
        "//api.etherscan.io/api", {
            apikey: apikey, //A valid API-Key is required
            module: "contract", //Do not change
            action: "verifysourcecode", //Do not change
            contractaddress: address, //Contract Address starts with 0x...
            sourceCode: source, //Contract Source Code (Flattened if necessary)
            contractname: contractname, //ContractName (if codeformat=solidity-standard-json-input, then enter contractname as ex: erc20.sol:erc20)
            compilerversion: "v0.6.12+commit.27d51765", // see https://etherscan.io/solcversions for list of support versions
            optimizationUsed: 1, //0 = No Optimization, 1 = Optimization used (applicable when codeformat=solidity-single-file)
            runs: runs, //set to 200 as default unless otherwise  (applicable when codeformat=solidity-single-file)
            constructorArguements: $("#constructorArguements").val(), //if applicable
            evmversion: $("#evmVersion").val(), //leave blank for compiler default, homestead, tangerineWhistle, spuriousDragon, byzantium, constantinople, petersburg, istanbul (applicable when codeformat=solidity-single-file)
            licenseType: license, //Valid codes 1-12 where 1=No License .. 12=Apache 2.0, see https://etherscan.io/contract-license-types
        },
        function (err, res, body) {
            console.log(res)
            if (result.status == "1") {
            //1 = submission success, use the guid returned (result.result) to check the status of your submission.
            // Average time of processing is 30-60 seconds
            document.getElementById("postresult").innerHTML = result.status + ";" + result.message + ";" + result.result;
            // result.result is the GUID receipt for the submission, you can use this guid for checking the verification status
        } else {
            //0 = error
            document.getElementById("postresult").innerHTML = result.status + ";" + result.message + ";" + result.result;
        }
        console.log("status : " + result.status);
        console.log("result : " + result.result);
        }
    )
} */