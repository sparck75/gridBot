
const { ethers } = require('hardhat');
const  {ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');

/***********************************************************************************/ 

// set up prvider, primary and secondary addresses
const {provider, acct1, acct2, privateKey, signer, account } = require("./accts");

/********************************************************************* */

// utils generic ethers tools for formatting 
const {toBytes32, toString, toWei, toEther, toRound } = require('./utils');

/********************************************************************* */

// Set up contracts 
const { daiAddr, wethAddr, wethArtifact, daiArtifact,daiContract, router } = require("./contracts")

/***************************************************************************** */
const {logger} = require('./logger');

const sellSwap = async ( orderId, wallet, acct, provider ) => {

    console.log ("TestSell 2 - TestSell.sellSwap orderId: ", orderId );
    //console.log ("TestSell 2 - TestSell.sellSwap wallet: ", wallet.address );
    //console.log ("TestSell 2 - TestSell.sellSwap acct: ", acct );
    //console.log ("TestSell 2 - TestSell.sellSwap provider: ", provider._isProvider );

    const chainId = 1;

    //console.log("current block: ",  await provider.getTransactionCount(account.address, 'latest'))
    //console.log("current gas limit: ",  await provider.getBlock(account.address, 'latest').gaslimit )

    const dai = await Fetcher.fetchTokenData(chainId, daiAddr );

    const weth = WETH[chainId];
    const pair = await Fetcher.fetchPairData(dai,weth);
    const route = new Route([pair], dai );

    const daiBalSender  = await daiContract.balanceOf(acct1);
    const daiBalRcvr  = await daiContract.balanceOf(acct2);

    console.log("Dai balance Sender: ", toEther(daiBalSender) , " Dai Balance Receiver: ", toEther(daiBalRcvr));
    
    let amountEthFromDAI = await router.getAmountsOut(
        //toWei(route.midPrice.invert().toSignificant(6)),
        // cooper s - this is where we decide to use the Dai balance of the receiver 
        //  or the Sender to purchase the ETH. 
        //daiBalSender,
        daiBalRcvr,
        [daiAddr, wethAddr]
    )

    console.log("Got amont of ETH for DAI...")
    const amountDaiIn  = amountEthFromDAI[0];
    const amountEthOut = amountEthFromDAI[1];

    console.log("SellSwap - Eth amount for Dai: ", toEther(amountEthFromDAI[0]) );
    console.log("SellSwap - For ", toEther(amountDaiIn), " Dai receive ", toEther(amountEthOut), " of ETH"  );

    let slippage = toBytes32("0.050");
    //console.log("slippage: ", slippage )
    const slippageTolerance = new Percent(slippage, "10000");

    try {
        console.log("set up trade to do the swap of dai for tokens");
        const trade = new Trade( //information necessary to create a swap transaction.
            route,
            new TokenAmount(dai, amountDaiIn),
            TradeType.EXACT_INPUT
        ); //end trade

        const value = trade.inputAmount.raw; // // needs to be converted to e.g. hex
        const valueHex = await ethers.BigNumber.from(value.toString()).toHexString();
      
        console.log("value: ", value, " valueHex: ", valueHex )

        const approveTx = require("./approve-tx")

        await approveTx.approve(daiContract, account, valueHex )
            .then (() => {
                console.log("amount approved...")
            })

        // Set up and execute actual swap 
        try {  
            console.log("SellSwap - amount to transfer: ", toEther(amountEthOut ));
            console.log("get jiggy  with it: ", ethers.utils.formatUnits(amountEthOut))
            const routerWithWallet = router.connect(wallet); 
            const decimals = 18;
            currentNonce = await provider.getTransactionCount(wallet.address, 'latest');
            console.log("SellSwap = Current nonce: ", currentNonce)

            const tx = await wallet.sendTransaction({
                to: acct2,
                //value: amountEthOut,
               // value: ethers.utils.parseUnits(valueStr, 'ether'),
                value: toWei("0.005"),
                nonce: currentNonce,
            })
            console.log("SellSwap - Sell Transfer hash: ",tx.hash )
            const log = await logger("logger - SellSwap - Sell Transfer hash: "+ tx.hash );
            //return orderId;
        } catch (e) {
            console.log("SellSwap-Swap Transaction error: ", e.message );
            process.exit(0)
        }
    

    } catch(e) {
        console.log("SellSwap - Trade failed: ", e.message )
        process.exit(0)
    }

}//end sellSwap

module.exports.sellSwap = sellSwap;

//sellSwap(account, acct2, provider);