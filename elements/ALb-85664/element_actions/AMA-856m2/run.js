function(instance, properties, context) {

    const { token_contract, uri, creator_wallet, minting_type, supply, token_id, signature_v, signature_r, signature_s } = properties;
    const defaultCreator = { account: creator_wallet, value: 10000 }
    let mintObj = {
        uri,
        royalties: [],
        creators: [defaultCreator],
    }
    instance.publishState('order_stage', '');//reset

    mintObj.lazy = minting_type == 'Lazy';//false for regular minting
    if (supply > 1) mintObj.supply = supply;
    // pre generated Token ID will be added in next updates
    if (token_id) {
        mintObj.nftTokenId = {
            "tokenId": token_id,
            "signature": {
                "v": signature_v,
                "r": signature_r,
                "s": signature_s
            }
        }
    }
    const mint = () => {
        instance.publishState('order_stage', 'Loading collection');
        instance.data.sdk.apis.nftCollection.getNftCollectionById({ collection: token_contract }).then((nftCollection) => {
            instance.publishState('order_stage', 'Minting');
            mintObj.collection = nftCollection;
            //console.log('mint Obj: ', mintObj);
            instance.data.sdk.nft.mint(mintObj).then(token => {
                const { tokenId, itemId } = token;
                instance.publishState('minted_token_id', tokenId);
                instance.publishState('minted_token_item_id', itemId);
                instance.triggerEvent('token_minted');
            }).catch((e) => instance.data.error(e, 'minting'))
        })
        // return;
    }

    const setCreatorsAndRoyalties = (type, cb) => {
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
                if (value > 0) mintObj[type].push(object);
                if (i == wl_leng - 1) cb();
            }
        } else {
            cb();
        }
    }

    instance.data.checkSDKandWeb3((enabled) => {
        if (enabled) {
            instance.publishState('order_stage', 'Loading');
            enabled && setCreatorsAndRoyalties('royalties', mint);
        }
    });

}