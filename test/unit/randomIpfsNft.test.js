const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT tests", function () {
          let randomIpfsNft, deployer

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture("RandomIpfsNft")
              randomIpfsNft = await ethers.getContract("RandomIpfsNft")
          })

          describe("Constructor", () => {
              it("initialises the starting values correctly", async () => {
                  const dogTokenUriZero = await randomIpfsNft.getDogTokenUris(0)
                  assert(dogTokenUriZero.includes("ipfs://"))
              })
          })
          
      })
