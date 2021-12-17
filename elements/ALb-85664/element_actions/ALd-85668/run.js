function(instance, properties, context) {
    const { ownerAddress, contractNFTAddress, tokenId, tradeTokenType, price, order_type, nftAmount } = properties;
    let origin_fees = [];
    instance.data.checkSDKandWeb3((enabled) => {
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
                        const account = wallet_amount[0]; // [wallet,amount]
                        const value = parseFloat(wallet_amount[1]) * 100
                        let object = { account, value };
                        if (type == "originfees") origin_fees.push(object);
                        if (i == wl_leng - 1) cb();
                    }
                } else {
                    cb();
                }
            }
            setFees('originfees', () => {
                const priceInWei = instance.data.web3.utils.toWei(`${price}`);
                instance.publishState('order_stage', 'Preparing request');
                const sdkActionType = order_type.toLowerCase();//Sell or Bid
                instance.data.sdk.apis.nftCollection.getNftCollectionById({ collection: contractNFTAddress }).then((nftCollection) => {
                    const types = {
                        NFTtype: nftCollection.type,
                        orderType: order_type,
                        tradeTokenType
                    }
                    const conf = {
                        tradeContractAddress: tradeTokenType,
                        orderCreator: ownerAddress,
                        contractNFTAddress,
                        tokenId,
                        price: priceInWei,
                        nftOwner: nftCollection.owner,
                        nftAmount,
                        origin_fees
                    }
                    const request = instance.data.createOrderRequest(types, conf);
                    //instance.data.sdk.order[sdkActionType](request).then(actionBuilder => { instance.data.runActions(actionBuilder, order_type) });
                    instance.data.sdk.order[sdkActionType](request).then((e) => {
                        instance.publishState('order_stage', 'Done');
                        instance.publishState('order_hash', e.hash);
                        instance.triggerEvent(`${order_type.toLowerCase()}_order_placed`);
                    }).catch(e => {
                        instance.data.error(e, order_type);
                    })

                })
            })
        }
    })

}