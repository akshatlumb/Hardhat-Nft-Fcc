const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

const imagesLocation = "./images/randomNft/"

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}

let tokenUris = [
    "ipfs://QmUC9KNAKnWgdFAaYvwCwvfjRXs3Rp7fcvRHcR4ofb29zt",
    "ipfs://QmUjq9dBp7aZ7pHnA3g35kWPsrevr9c4axSbS1mJ7b9QYi",
    "ipfs://QmXjc124jV8LfAtJEXAkvrhBpMvFPKfNxyKPt4bEmtGSZW",
]

const FUND_AMOUNT = "1000000000000000000000"

module.exports = async ({ getNamedAccount, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
    }

    let vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReciept = await tx.wait(1)

        subscriptionId = txReciept.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("-----------------------------------------")

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ]

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("-----------------------------------------")

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfsNft.address, args)
    }

    async function handleTokenUris() {
        tokenUris = []

        const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
        for (imageUploadResponsesIndex in imageUploadResponses) {
            let tokenUriMetadata = { ...metadataTemplate }
            tokenUriMetadata.name = files[imageUploadResponsesIndex].replace(".png", "")
            tokenUriMetadata.description = `an adorable ${tokenUriMetadata.name}`
            tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponsesIndex].IpfsHash}`
            console.log(`Uploading ${tokenUriMetadata.name}`)

            const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
            tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
        }
        console.log("Token Uris uploaded! They are: ")
        console.log(tokenUris)

        return tokenUris
    }
}

module.exports.tags = ["all", "randomIpfs", "main"]
