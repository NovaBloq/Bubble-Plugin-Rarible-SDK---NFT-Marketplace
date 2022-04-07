function(instance, properties, context) {
    const { contractAddress, tokenId } = properties;
    const itemId = instance.data.getUnionItemId(contractAddress, tokenId);
    const prepareBurn = enabled=>{
        if (enabled) {
            instance.data.sdk.nft.burn({ itemId }).then((burn) => {
                burn.submit({ amount: 1 }).then((e) => {
                    instance.triggerEvent('token_burned');
                }).catch(instance.data.error)
            }).catch(instance.data.error)
        }
    }

    if (instance.data.blockchainName == "ETHEREUM") {
        instance.data.checkSDKandWeb3((enabled) => {
            prepareBurn(enabled);
        });
    } else {
        prepareBurn(true);
    }
}