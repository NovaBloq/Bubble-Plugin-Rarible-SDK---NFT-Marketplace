function(instance, properties, context) {
    const { contractNFTAddress, tokenId, tradeTokenType, price, order_type, nftAmount } = properties;
    let origin_fees = [];
    const itemId = `${instance.data.blockchainName}:${contractNFTAddress}:${tokenId}`;
    let sellPrice = Number(price);

    const getCurrency = () => {
        // Set currency type
        // TO DO: add erc20 equivalent for other chains
        let obj = {
            "@type": instance.data.isNativeToken(tradeTokenType) ? tradeTokenType : "ERC20"
        }
        if (instance.data.isNativeToken(tradeTokenType)) {
            obj.blockchain = instance.data.blockchainName;
        } else {
            obj.contract = instance.data.blockchainName + ":" + tradeTokenType
        };
        // Set sell amount type
        return obj;
    }

    let currency = getCurrency();

    const prepareOrder = enabled => {
        if (enabled) {
            const setFees = (type, cb) => {
                //Will be used for payouts array as well
                const AllWalletsAmounts = properties[`${type}_wallet_amount`];
                const wl_leng = AllWalletsAmounts ? AllWalletsAmounts.length() : 0;
                if (wl_leng) {
                    //Not 0
                    const wallets_list = AllWalletsAmounts.get(0, wl_leng);
                    // const amounts_list = AllAmounts.get(0, am_leng);
                    for (let i = 0; i < wl_leng; i++) {
                        const wallet_amount = wallets_list[i].split(':');// wallet:amount
                        const account = `${instance.data.blockchainName}:${wallet_amount[0]}`; // [wallet,amount]
                        const value = parseFloat(wallet_amount[1]) * 100;
                        let object = { account, value };
                        if (type == "originfees" && value > 0) origin_fees.push(object);
                        if (i == wl_leng - 1) cb();
                    }
                } else {
                    cb();
                }
            }
            setFees('originfees', () => {
                instance.publishState('order_stage', 'Preparing request');
                const sdkActionType = order_type.toLowerCase();//Sell or Bid
                instance.data.sdk.order[sdkActionType]({ itemId }).then((order) => {
                    let submitObj = {
                        amount: nftAmount, // amount of NFTs to put on sale: must be <= maxAmount
                        price: sellPrice, // price of the NFT being sold (0.2 for example if price is 0.2 ETH)
                        currency // curreny (ETH or specific ERC20 or Tez, Flow etc)
                    }
                    if (sdkActionType == 'sell') {
                        submitObj.originFees = origin_fees // optional array of origin fees (TODO add link to origin fees explanation)
                    }
                    order.submit(submitObj).then((res) => {
                        instance.publishState('order_stage', 'Done');
                        instance.publishState('order_hash', res.split(':')[1]);
                        instance.triggerEvent(`${order_type.toLowerCase()}_order_placed`);
                    })
                }).catch(e => {
                    instance.data.error(e, order_type);
                });
            })
        }
    }

    if (instance.data.blockchainName == "ETHEREUM") {
        instance.data.checkSDKandWeb3((enabled) => {
            prepareOrder(enabled);
        });
    } else {
        prepareOrder(true);
    }
}