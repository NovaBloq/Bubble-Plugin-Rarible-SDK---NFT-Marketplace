function(instance, properties, context) {
    instance.publishState('order_stage', ''); //reset state
    const { token_contract, uri, minting_type, supply, token_id, signature_v, signature_r, signature_s } = properties;
    const contract = `${instance.data.blockchainName}:${token_contract}`;
    let minter = '';
    let submitObj = {
        uri,
        royalties: [],
        supply
    }

    submitObj.lazyMint = minting_type == 'Lazy';//false for regular minting
    const mint = () => {
        instance.publishState('order_stage', 'Loading collection');
        instance.data.sdk.apis.collection.getCollectionById({
            collection: contract,
        }).then((collection => {
            let mintObj = { collection };
            if (token_id) {// Pre-generated ID
                mintObj.tokenId = {
                    "tokenId": token_id,
                    "signature": {
                        "v": signature_v,
                        "r": signature_r,
                        "s": signature_s
                    }
                }
            }
            instance.data.sdk.nft.mint(mintObj)
                .then(mintAction => {
                    instance.publishState('order_stage', 'Minting');
                    if (submitObj.lazyMint) {//user selected lazy type
                        if (!mintAction.supportsLazyMint) {
                            console.log("Contract doesn't support lazy mint");
                            submitObj.lazyMint = false;//collection doesn't support lazy minting
                        }
                    }
                    console.log(submitObj);
                    mintAction.submit(submitObj).then((res) => {
                        const item = res.itemId.split(':');
                        instance.publishState('minted_token_id', item[2]);
                        instance.publishState('minted_token_item_id', item[1] + ":" + item[2]);
                        instance.triggerEvent('token_minted');
                    }).catch((e) => {
                        console.log('error: ', e);
                        instance.data.error(e, 'minting');
                    })

                }).catch((e) => {
                    console.log('error: ', e);
                    instance.data.error(e, 'minting')
                })
        }))
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
                const account = `${instance.data.blockchainName}:${wallet_amount[0]}`; // [wallet,amount]
                const value = parseFloat(wallet_amount[1]) * 100
                let object = { account, value };
                if (value > 0) submitObj[type].push(object);
                if (i == wl_leng - 1) cb();
            }
        } else {
            cb();
        }
    }


    const prepareMint = (enabled) => {
        if (!instance.data.selectedAddress) return console.warn("Can't mint, wallet is not connected!");
        minter = `${instance.data.blockchainName}:${instance.data.selectedAddress}`;
        submitObj.creators = [{ account: minter, value: 10000 }];
        if (enabled) {
            instance.publishState('order_stage', 'Loading');
            setCreatorsAndRoyalties('royalties', mint);
        }
    }

    if (instance.data.blockchainName == "ETHEREUM") {
        instance.data.checkSDKandWeb3((enabled) => {
            prepareMint(enabled);
        });
    } else {
        prepareMint(true);
    }

}